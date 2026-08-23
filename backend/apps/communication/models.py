from django.db import models
from apps.accounts.models import CustomUser


class Message(models.Model):
    expediteur = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='messages_envoyes')
    destinataire = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='messages_recus')
    sujet = models.CharField(max_length=200)
    contenu = models.TextField()
    date_envoi = models.DateTimeField(auto_now_add=True)
    est_lu = models.BooleanField(default=False)
    date_lecture = models.DateTimeField(null=True, blank=True)
    est_archive_expediteur = models.BooleanField(default=False)
    est_archive_destinataire = models.BooleanField(default=False)
    fichier_joint = models.FileField(upload_to='messages/pieces_jointes/', null=True, blank=True)
    message_parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='reponses')

    class Meta:
        verbose_name = 'Message'
        verbose_name_plural = 'Messages'
        ordering = ['-date_envoi']

    def __str__(self):
        return f"{self.expediteur.get_full_name()} → {self.destinataire.get_full_name()}: {self.sujet}"


class CategorieForum(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField()
    icone = models.CharField(max_length=50, blank=True)
    ordre = models.IntegerField(default=0)
    est_active = models.BooleanField(default=True)
    moderateurs = models.ManyToManyField(CustomUser, related_name='categories_moderees', blank=True)

    class Meta:
        verbose_name = 'Catégorie de Forum'
        verbose_name_plural = 'Catégories de Forum'
        ordering = ['ordre', 'nom']

    def __str__(self):
        return self.nom


class SujetForum(models.Model):
    categorie = models.ForeignKey(CategorieForum, on_delete=models.CASCADE, related_name='sujets')
    titre = models.CharField(max_length=200)
    contenu = models.TextField()
    auteur = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='sujets_forum')
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    est_epingle = models.BooleanField(default=False)
    est_verrouille = models.BooleanField(default=False)
    vues = models.IntegerField(default=0)
    tags = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = 'Sujet de Forum'
        verbose_name_plural = 'Sujets de Forum'
        ordering = ['-est_epingle', '-date_modification']

    def __str__(self):
        return self.titre


class ReponseForum(models.Model):
    sujet = models.ForeignKey(SujetForum, on_delete=models.CASCADE, related_name='reponses')
    auteur = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='reponses_forum')
    contenu = models.TextField()
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    reponse_parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='sous_reponses')
    est_modere = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Réponse de Forum'
        verbose_name_plural = 'Réponses de Forum'
        ordering = ['date_creation']

    def __str__(self):
        return f"Réponse de {self.auteur.get_full_name()} sur {self.sujet.titre}"


def chemin_fichier_canal(instance, filename):
    import os
    import uuid
    base, ext = os.path.splitext(filename)
    return f"communication/canaux/{instance.canal_id or 'tmp'}/{base}_{uuid.uuid4().hex[:8]}{ext}"


class Canal(models.Model):
    """Canal/groupe de discussion (façon groupe WhatsApp) : membres gérés par l'admin du canal,
    messages texte/image/document/audio/vidéo, réunion vidéo Jitsi à la demande."""
    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='communication/canaux/images/', null=True, blank=True)
    cree_par = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='canaux_crees')
    date_creation = models.DateTimeField(auto_now_add=True)
    est_actif = models.BooleanField(default=True)
    lien_reunion = models.URLField(blank=True, help_text="Lien Jitsi de la réunion en cours, le cas échéant")

    class Meta:
        verbose_name = 'Canal de discussion'
        verbose_name_plural = 'Canaux de discussion'
        ordering = ['-date_creation']

    def __str__(self):
        return self.nom


class MembreCanal(models.Model):
    canal = models.ForeignKey(Canal, on_delete=models.CASCADE, related_name='membres_canal')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='canaux')
    est_admin_canal = models.BooleanField(default=False)
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['canal', 'user']
        verbose_name = 'Membre de Canal'
        verbose_name_plural = 'Membres de Canaux'

    def __str__(self):
        return f"{self.user.get_full_name()} — {self.canal.nom}"


class MessageCanal(models.Model):
    TYPE_CHOICES = [
        ('texte', 'Texte'),
        ('image', 'Image'),
        ('document', 'Document'),
        ('audio', 'Audio'),
        ('video', 'Vidéo'),
    ]
    canal = models.ForeignKey(Canal, on_delete=models.CASCADE, related_name='messages')
    expediteur = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='messages_canaux')
    type_message = models.CharField(max_length=20, choices=TYPE_CHOICES, default='texte')
    contenu = models.TextField(blank=True)
    fichier = models.FileField(upload_to=chemin_fichier_canal, null=True, blank=True)
    duree = models.IntegerField(null=True, blank=True, help_text="Durée en secondes (audio/vidéo)")
    date_envoi = models.DateTimeField(auto_now_add=True)
    repond_a = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='reponses')

    class Meta:
        verbose_name = 'Message de Canal'
        verbose_name_plural = 'Messages de Canaux'
        ordering = ['date_envoi']

    def __str__(self):
        return f"{self.expediteur.get_full_name()} @ {self.canal.nom} — {self.date_envoi:%d/%m %H:%M}"


class AbonnementPush(models.Model):
    """Abonnement Web Push d'un navigateur/appareil pour un utilisateur (notifications
    directement sur la machine/le téléphone, même appli/onglet fermé)."""
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='abonnements_push')
    endpoint = models.URLField(max_length=500, unique=True)
    cle_p256dh = models.CharField(max_length=200)
    cle_auth = models.CharField(max_length=100)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Abonnement Push'
        verbose_name_plural = 'Abonnements Push'

    def __str__(self):
        return f"Abonnement push de {self.user.get_full_name()}"


class Notification(models.Model):
    TYPE_CHOICES = [
        ('info', 'Information'),
        ('succes', 'Succès'),
        ('avertissement', 'Avertissement'),
        ('erreur', 'Erreur'),
        ('message', 'Message'),
        ('evenement', 'Événement'),
        ('finance', 'Finance'),
        ('kamil', 'Kamil'),
        ('systeme', 'Système'),
    ]

    utilisateur = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='notifications')
    type_notification = models.CharField(max_length=20, choices=TYPE_CHOICES)
    titre = models.CharField(max_length=200)
    message = models.TextField()
    lien = models.CharField(max_length=200, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    est_lue = models.BooleanField(default=False)
    date_lecture = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-date_creation']

    def __str__(self):
        return f"{self.utilisateur.get_full_name()} - {self.titre}"
