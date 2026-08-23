from .models import Notification


def creer_notifications(user_ids, type_notification, titre, message, lien=''):
    """Crée une notification in-app pour chaque utilisateur listé (bulk_create), et déclenche
    en plus une notification push navigateur (directement sur l'appareil, même appli fermée)
    pour chaque utilisateur abonné.
    Utilisé aux points où un événement système doit prévenir un ou plusieurs membres :
    assignation Jukki, nouvel événement publié, nouveau message reçu, etc."""
    user_ids = [uid for uid in set(user_ids) if uid]
    if not user_ids:
        return
    Notification.objects.bulk_create([
        Notification(
            utilisateur_id=uid,
            type_notification=type_notification,
            titre=titre,
            message=message,
            lien=lien or '',
        )
        for uid in user_ids
    ])

    from .webpush import send_webpush_to_user
    from apps.accounts.models import CustomUser
    for u in CustomUser.objects.filter(id__in=user_ids):
        send_webpush_to_user(u, titre, message, lien)
