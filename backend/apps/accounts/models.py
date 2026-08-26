from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Administrateur'),
        ('membre', 'Membre'),
        ('jewrin', 'Jewrin'),
        ('jewrine_conservatoire', 'Jewrin Conservatoire'),
        ('jewrine_culturelle', 'Jewrin Culturelle'),
        ('jewrine_finance', 'Jewrin Finance'),
        ('jewrine_sociale', 'Jewrin Sociale'),
        ('jewrine_communication', 'Jewrin Communication'),
        ('jewrine_organisation', 'Jewrin Organisation'),
        ('jewrine_scientifique', 'Jewrin Scientifique'),
    ]

    SEXE_CHOICES = [
        ('M', 'Masculin'),
        ('F', 'Féminin'),
    ]

    CATEGORIE_CHOICES = [
        ('eleve', 'Élève'),
        ('etudiant', 'Étudiant'),
        ('professionnel', 'Professionnel'),
    ]

    CELLULE_CHOICES = [
        ('dakar', 'Dakar'),
        ('touba_mbacke', 'Touba / Mbacké'),
        ('diaspora', 'Diaspora'),
    ]

    GROUPE_SANGUIN_CHOICES = [
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
    ]

    NIVEAU_CHOICES = [
        ('faible', 'Faible'),
        ('debutant', 'Débutant'),
        ('moyen', 'Moyen'),
        ('intermediaire', 'Intermédiaire'),
        ('avance', 'Avancé'),
    ]

    telephone = models.CharField(max_length=20, blank=True)
    adresse = models.TextField(blank=True)
    # Augmenter max_length pour accepter les rôles spécialisés (jusqu'à 21 caractères)
    role = models.CharField(max_length=32, choices=ROLE_CHOICES, default='membre')
    photo = models.ImageField(upload_to='photos_membres/', null=True, blank=True)
    photo_updated_at = models.DateTimeField(null=True, blank=True, help_text='Mis à jour à chaque changement de photo (cache bust)')
    date_inscription = models.DateTimeField(auto_now_add=True)
    est_actif = models.BooleanField(default=True)
    numero_wave = models.CharField(max_length=50, blank=True)
    numero_carte = models.CharField(max_length=50, blank=True)
    date_naissance = models.DateField(null=True, blank=True)

    # Informations personnelles
    sexe = models.CharField(max_length=1, choices=SEXE_CHOICES, blank=True)
    profession = models.CharField(max_length=100, blank=True)
    categorie = models.CharField(max_length=20, choices=CATEGORIE_CHOICES, default='professionnel')
    cellule = models.CharField(max_length=30, choices=CELLULE_CHOICES, blank=True)
    groupe_sanguin = models.CharField(max_length=5, choices=GROUPE_SANGUIN_CHOICES, blank=True)
    niveau_alquran = models.CharField(max_length=20, choices=NIVEAU_CHOICES, blank=True)
    niveau_majalis = models.CharField(max_length=20, choices=NIVEAU_CHOICES, blank=True)

    # Champs spécifiques Jewrin
    specialite = models.CharField(max_length=100, blank=True)
    biographie = models.TextField(blank=True)

    # Statistiques membres
    cotisations_payees = models.IntegerField(default=0)
    chapitres_lus = models.IntegerField(default=0)
    evenements_participes = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.get_role_display()})"


class ProfilComplementaire(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='profil_complementaire')
    biographie = models.TextField(blank=True)
    profession = models.CharField(max_length=100, blank=True)
    employeur = models.CharField(max_length=100, blank=True)
    competences = models.TextField(blank=True)
    centres_interet = models.TextField(blank=True)
    facebook = models.URLField(blank=True)
    twitter = models.URLField(blank=True)
    linkedin = models.URLField(blank=True)
    site_web = models.URLField(blank=True)
    ville_residence = models.CharField(max_length=100, blank=True)
    pays = models.CharField(max_length=100, default='Sénégal')
    langue_preferee = models.CharField(max_length=20, default='fr')
    fuseau_horaire = models.CharField(max_length=50, default='Africa/Dakar')
    recevoir_newsletter = models.BooleanField(default=True)
    profil_public = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Profil Complémentaire'
        verbose_name_plural = 'Profils Complémentaires'

    def __str__(self):
        return f"Profil de {self.user.get_full_name()}"


class PreferencesNotification(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='preferences_notif')
    notif_email_message = models.BooleanField(default=True)
    notif_email_evenement = models.BooleanField(default=True)
    notif_email_finance = models.BooleanField(default=True)
    notif_email_kamil = models.BooleanField(default=True)
    notif_push_message = models.BooleanField(default=True)
    notif_push_evenement = models.BooleanField(default=True)
    notif_push_finance = models.BooleanField(default=False)
    notif_push_kamil = models.BooleanField(default=True)
    notif_sms_urgent = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Préférences de Notification'
        verbose_name_plural = 'Préférences de Notifications'

    def __str__(self):
        return f"Préférences de {self.user.get_full_name()}"


class HistoriqueConnexion(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='connexions')
    date_connexion = models.DateTimeField(auto_now_add=True)
    adresse_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    navigateur = models.CharField(max_length=100, blank=True)
    systeme_exploitation = models.CharField(max_length=100, blank=True)
    appareil = models.CharField(max_length=100, blank=True)
    localisation = models.CharField(max_length=200, blank=True)
    succes = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Historique de Connexion'
        verbose_name_plural = 'Historiques de Connexions'
        ordering = ['-date_connexion']

    def __str__(self):
        return f"{self.user.username} - {self.date_connexion}"


class Badge(models.Model):
    CATEGORIE_CHOICES = [
        ('contribution', 'Contribution'),
        ('assiduite', 'Assiduité'),
        ('kamil', 'Kamil'),
        ('social', 'Social'),
        ('anciennete', 'Ancienneté'),
        ('special', 'Spécial'),
    ]

    nom = models.CharField(max_length=100)
    description = models.TextField()
    categorie = models.CharField(max_length=50, choices=CATEGORIE_CHOICES)
    icone = models.ImageField(upload_to='badges/', null=True, blank=True)
    critere = models.TextField(help_text="Critère d'obtention")
    points = models.IntegerField(default=0)
    est_actif = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Badge'
        verbose_name_plural = 'Badges'

    def __str__(self):
        return f"{self.nom} ({self.get_categorie_display()})"


RUBRIQUES = [
    ('conservatoire', 'Conservatoire'),
    ('culturelle', 'Culturelle'),
    ('finance', 'Finance'),
    ('sociale', 'Sociale'),
    ('communication', 'Communication'),
    ('organisation', 'Organisation'),
    ('scientifique', 'Scientifique'),
    ('bibliotheque', 'Bibliothèque'),
    ('informations', 'Informations'),
    ('comptes', 'Comptes / Membres'),
]


class MatricePermissionRole(models.Model):
    """Permissions par défaut d'un rôle sur une rubrique. Configurable par l'admin général
    depuis la page Rôles & Permissions."""
    role = models.CharField(max_length=32, choices=CustomUser.ROLE_CHOICES)
    rubrique = models.CharField(max_length=30, choices=RUBRIQUES)
    peut_voir = models.BooleanField(default=True)
    peut_creer = models.BooleanField(default=False)
    peut_modifier = models.BooleanField(default=False)
    peut_supprimer = models.BooleanField(default=False)
    peut_valider = models.BooleanField(default=False)

    class Meta:
        unique_together = ['role', 'rubrique']
        verbose_name = 'Matrice de Permission (par rôle)'
        verbose_name_plural = 'Matrices de Permissions (par rôle)'
        ordering = ['role', 'rubrique']

    def __str__(self):
        return f"{self.get_role_display()} — {self.get_rubrique_display()}"


class PermissionMembreOverride(models.Model):
    """Exception de permission pour un membre précis sur une rubrique donnée.
    Une valeur à None signifie « hérite du rôle » ; True/False force l'accès."""
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='permissions_override')
    rubrique = models.CharField(max_length=30, choices=RUBRIQUES)
    peut_voir = models.BooleanField(null=True, blank=True)
    peut_creer = models.BooleanField(null=True, blank=True)
    peut_modifier = models.BooleanField(null=True, blank=True)
    peut_supprimer = models.BooleanField(null=True, blank=True)
    peut_valider = models.BooleanField(null=True, blank=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'rubrique']
        verbose_name = 'Exception de Permission (par membre)'
        verbose_name_plural = 'Exceptions de Permissions (par membre)'
        ordering = ['user', 'rubrique']

    def __str__(self):
        return f"{self.user.get_full_name()} — {self.get_rubrique_display()}"


class JournalAudit(models.Model):
    """Journal de sécurité / traçabilité des actions sensibles."""
    ACTION_CHOICES = [
        ('connexion', 'Connexion'),
        ('echec_connexion', 'Échec de connexion'),
        ('creation', 'Création'),
        ('modification', 'Modification'),
        ('suppression', 'Suppression'),
        ('validation_paiement', 'Validation de paiement'),
        ('changement_role', 'Changement de rôle'),
        ('changement_permission', 'Changement de permission'),
        ('reset_mot_de_passe', 'Réinitialisation de mot de passe'),
        ('autre', 'Autre'),
    ]

    utilisateur = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='journal_audit')
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    rubrique = models.CharField(max_length=30, blank=True)
    objet_repr = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    adresse_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True, help_text="En-tête User-Agent brut du navigateur/appareil")
    date = models.DateTimeField(auto_now_add=True)
    succes = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Entrée du Journal d'Audit"
        verbose_name_plural = "Journal d'Audit"
        ordering = ['-date']

    def __str__(self):
        who = self.utilisateur.username if self.utilisateur else 'Anonyme'
        return f"{who} — {self.get_action_display()} — {self.date:%d/%m/%Y %H:%M}"


class CodeReinitialisation(models.Model):
    """Code à usage unique pour la réinitialisation de mot de passe (envoyé par WhatsApp)."""
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='codes_reinitialisation')
    code = models.CharField(max_length=6)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_expiration = models.DateTimeField()
    utilise = models.BooleanField(default=False)
    tentatives = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'Code de Réinitialisation'
        verbose_name_plural = 'Codes de Réinitialisation'
        ordering = ['-date_creation']

    def __str__(self):
        return f"Code pour {self.user.username} ({'utilisé' if self.utilise else 'actif'})"

    @property
    def est_valide(self):
        from django.utils import timezone
        return not self.utilise and self.tentatives < 5 and timezone.now() < self.date_expiration


class BadgeMission(models.Model):
    """Badge d'événement/mission (distinct des badges de récompense ci-dessus) : attribué à un
    membre pour une mission précise lors d'un événement donné (ex. « Sécurité — Magal 2026 »),
    avec date et rôle. La photo affichée sur le badge est toujours la photo de profil actuelle
    du membre — pas de photo séparée à gérer."""
    membre = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='badges_missions')
    evenement = models.CharField(max_length=200, help_text="Ex : Magal 2026, Gamou, Ziarra...")
    mission = models.CharField(max_length=200, help_text="Rôle dans la mission, ex : Sécurité, Accueil, Logistique")
    date_evenement = models.DateField()
    description = models.TextField(blank=True)
    cree_par = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='badges_missions_crees')
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Badge de mission'
        verbose_name_plural = 'Badges de mission'
        ordering = ['-date_evenement']

    def __str__(self):
        return f"{self.membre.get_full_name()} — {self.mission} ({self.evenement})"


class AttributionBadge(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='badges_obtenus')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    date_obtention = models.DateTimeField(auto_now_add=True)
    raison = models.TextField(blank=True)

    class Meta:
        unique_together = ['user', 'badge']
        verbose_name = 'Attribution de Badge'
        verbose_name_plural = 'Attributions de Badges'
        ordering = ['-date_obtention']

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.badge.nom}"
