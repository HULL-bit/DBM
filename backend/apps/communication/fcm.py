import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

_app = None
_app_tentative_faite = False


def _get_app():
    """Initialise l'app Firebase Admin une seule fois par process (credentials lus depuis
    FIREBASE_CREDENTIALS_JSON). Retourne None si non configuré/invalide — ne lève jamais."""
    global _app, _app_tentative_faite
    if _app is not None:
        return _app
    if _app_tentative_faite:
        return None
    _app_tentative_faite = True

    credentials_json = getattr(settings, 'FIREBASE_CREDENTIALS_JSON', '')
    if not credentials_json:
        return None

    try:
        import firebase_admin
        from firebase_admin import credentials
    except ImportError:
        logger.warning("firebase-admin non installé : notifications push mobile désactivées.")
        return None

    try:
        cred = credentials.Certificate(json.loads(credentials_json))
        _app = firebase_admin.initialize_app(cred)
    except Exception:
        logger.warning(
            "FIREBASE_CREDENTIALS_JSON invalide : notifications push mobile désactivées "
            "jusqu'à correction de la variable d'environnement.", exc_info=True
        )
        return None
    return _app


def send_fcm_to_user(user, titre, message, lien=''):
    """Envoie une notification système (barre de notification du téléphone) à tous les
    appareils mobiles enregistrés de cet utilisateur. Ne fait jamais planter l'appelant :
    toute erreur (app non configurée, token expiré, service indisponible) est avalée et
    journalisée."""
    app = _get_app()
    if app is None:
        return

    try:
        from firebase_admin import messaging
    except ImportError:
        return

    from .models import AppareilFCM

    appareils = AppareilFCM.objects.filter(user=user)
    if not appareils:
        return

    for appareil in appareils:
        try:
            messaging.send(messaging.Message(
                notification=messaging.Notification(title=titre, body=message),
                data={'lien': lien or '/'},
                token=appareil.token,
                android=messaging.AndroidConfig(priority='high'),
                apns=messaging.APNSConfig(payload=messaging.APNSPayload(aps=messaging.Aps(sound='default'))),
            ), app=app)
        except messaging.UnregisteredError:
            # Token expiré/désinstallé côté appareil : on le supprime.
            appareil.delete()
        except Exception:
            logger.warning("Échec envoi FCM à %s (%s): ", user.username, appareil.plateforme, exc_info=True)
