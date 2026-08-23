import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def send_webpush_to_user(user, titre, message, lien=''):
    """Envoie une notification push navigateur à tous les appareils abonnés de cet utilisateur.
    Ne fait jamais planter l'appelant : toute erreur (abonnement expiré, clés VAPID absentes,
    service indisponible) est avalée et journalisée."""
    vapid_private_key = getattr(settings, 'VAPID_PRIVATE_KEY', '')
    vapid_claims_email = getattr(settings, 'VAPID_CLAIMS_EMAIL', 'mailto:contact@daara-barakatul-mahaahidi.local')
    if not vapid_private_key:
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
                vapid_private_key=vapid_private_key,
                vapid_claims={'sub': vapid_claims_email},
            )
        except WebPushException as e:
            status = getattr(e.response, 'status_code', None)
            if status in (404, 410):
                # Abonnement expiré/révoqué côté navigateur : on le supprime.
                abo.delete()
            else:
                logger.warning("Échec envoi push à %s: %s", user.username, e)
        except Exception:
            logger.exception("Erreur inattendue lors de l'envoi push à %s", user.username)
