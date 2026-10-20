import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

_vapid_key = None
_vapid_tentative_faite = False


def _get_vapid_key():
    """Analyse VAPID_PRIVATE_KEY une seule fois par process et retourne un objet Vapid déjà
    parsé (accepté tel quel par pywebpush, qui l'utilise alors directement sans jamais le
    redécoder) — évite de dépendre du décodage interne limité de pywebpush (RAW/DER non
    chiffré uniquement, pas le PEM que renvoient certains générateurs de clés VAPID)."""
    global _vapid_key, _vapid_tentative_faite
    if _vapid_key is not None:
        return _vapid_key
    if _vapid_tentative_faite:
        return None
    _vapid_tentative_faite = True

    vapid_private_key = (getattr(settings, 'VAPID_PRIVATE_KEY', '') or '').strip()
    if not vapid_private_key:
        return None

    try:
        from py_vapid import Vapid
    except ImportError:
        logger.warning("py-vapid non installé : notifications push navigateur désactivées.")
        return None

    try:
        if '-----BEGIN' in vapid_private_key:
            _vapid_key = Vapid.from_pem(vapid_private_key.encode())
        else:
            _vapid_key = Vapid.from_string(vapid_private_key)
    except Exception:
        logger.warning(
            "VAPID_PRIVATE_KEY mal formée : notifications push navigateur désactivées "
            "jusqu'à correction de la variable d'environnement.", exc_info=True
        )
        return None
    return _vapid_key


def send_webpush_to_user(user, titre, message, lien=''):
    """Envoie une notification push navigateur à tous les appareils abonnés de cet utilisateur.
    Ne fait jamais planter l'appelant : toute erreur (abonnement expiré, clés VAPID absentes,
    service indisponible) est avalée et journalisée."""
    vapid_claims_email = getattr(settings, 'VAPID_CLAIMS_EMAIL', 'mailto:contact@daara-barakatul-mahaahidi.local')
    vapid_key = _get_vapid_key()
    if vapid_key is None:
        return

    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        logger.warning("pywebpush non installé : notifications push navigateur désactivées.")
        return

    from .models import AbonnementPush

    abonnements = AbonnementPush.objects.filter(user=user)
    payload = json.dumps({'titre': titre, 'message': message, 'lien': lien or '/'})

    for abo in abonnements:
        try:
            webpush(
                subscription_info={
                    'endpoint': abo.endpoint,
                    'keys': {'p256dh': abo.cle_p256dh, 'auth': abo.cle_auth},
                },
                data=payload,
                vapid_private_key=vapid_key,
                vapid_claims={'sub': vapid_claims_email},
            )
        except WebPushException as e:
            status = getattr(e.response, 'status_code', None)
            if status in (404, 410, 401, 403):
                # Abonnement expiré/révoqué, ou rejeté car signé avec une clé VAPID différente
                # de celle utilisée à l'abonnement (ex. rotation de VAPID_PRIVATE_KEY) : dans
                # les deux cas l'abonnement est définitivement mort, on le supprime.
                abo.delete()
            else:
                logger.warning("Échec envoi push à %s: %s", user.username, e)
        except Exception:
            logger.exception("Erreur inattendue lors de l'envoi push à %s", user.username)
