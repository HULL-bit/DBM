from django.conf import settings
from django.db import models


class IncidentSysteme(models.Model):
    """Erreur technique (backend, site web ou appli mobile) — distincte du journal d'audit,
    qui trace les actions des utilisateurs. Les occurrences d'une même erreur sont
    regroupées (même `signature`) pour ne pas noyer le journal ni la boîte mail."""
    SOURCE_CHOICES = [
        ('backend', 'Serveur (backend)'),
        ('web', 'Site web'),
        ('mobile', 'Application mobile'),
        ('surveillance', 'Surveillance'),
    ]
    NIVEAU_CHOICES = [
        ('critique', 'Critique'),
        ('erreur', 'Erreur'),
        ('avertissement', 'Avertissement'),
    ]

    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='backend')
    niveau = models.CharField(max_length=20, choices=NIVEAU_CHOICES, default='erreur')
    titre = models.CharField(max_length=255)
    details = models.TextField(blank=True, help_text="Trace complète (traceback) de la dernière occurrence")
    chemin = models.CharField(max_length=255, blank=True)
    methode = models.CharField(max_length=10, blank=True)
    statut_http = models.PositiveSmallIntegerField(null=True, blank=True)
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='incidents_systeme',
    )
    request_id = models.CharField(max_length=40, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)
    signature = models.CharField(max_length=64, db_index=True)
    occurrences = models.PositiveIntegerField(default=1)
    premiere_date = models.DateTimeField(auto_now_add=True)
    derniere_date = models.DateTimeField(auto_now=True)
    dernier_email = models.DateTimeField(null=True, blank=True)
    resolu = models.BooleanField(default=False, db_index=True)

    class Meta:
        verbose_name = 'Incident technique'
        verbose_name_plural = 'Incidents techniques'
        ordering = ['-derniere_date']

    def __str__(self):
        return f"[{self.get_source_display()}] {self.titre}"
