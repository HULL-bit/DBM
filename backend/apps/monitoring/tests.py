from django.core import mail
from django.http import HttpResponse
from django.test import TestCase, override_settings
from django.urls import include, path
from rest_framework.test import APIClient

from apps.accounts.models import CustomUser
from .alertes import signaler_incident
from .models import IncidentSysteme


def vue_qui_plante(request, pk):
    raise ValueError('boum 42')


def vue_ok(request):
    return HttpResponse('ok')


urlpatterns = [
    path('plante/<int:pk>/', vue_qui_plante),
    path('ok/', vue_ok),
    path('api/', include('apps.monitoring.urls')),
]

ALERTES = dict(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    ALERT_EMAILS=['alerte@test.sn'],
    ALERT_EMAIL_ASYNC=False,
    ALERT_EMAIL_INTERVALLE_MINUTES=60,
    ALERT_EMAIL_MAX_PAR_HEURE=15,
)


@override_settings(ROOT_URLCONF='apps.monitoring.tests', **ALERTES)
class ErreurServeurTests(TestCase):
    def setUp(self):
        self.client = APIClient(raise_request_exception=False)

    def test_erreur_500_cree_incident_sans_email(self):
        """Une erreur 500 courante (niveau 'erreur') crée bien un incident consultable dans
        le tableau de bord, mais n'envoie plus d'email — trop fréquent/peu pertinent par
        email (voir NIVEAUX_AVEC_EMAIL dans alertes.py)."""
        r = self.client.get('/plante/1/')
        self.assertEqual(r.status_code, 500)
        incident = IncidentSysteme.objects.get()
        self.assertIn('ValueError: boum', incident.titre)
        self.assertIn('Traceback', incident.details)
        self.assertEqual(incident.chemin, '/plante/1/')
        self.assertEqual(incident.statut_http, 500)
        self.assertTrue(incident.request_id)
        self.assertEqual(len(mail.outbox), 0)

    def test_meme_erreur_regroupee_sans_spam(self):
        for pk in (1, 2, 3):
            self.client.get(f'/plante/{pk}/')
        incident = IncidentSysteme.objects.get()
        self.assertEqual(incident.occurrences, 3)
        self.assertEqual(len(mail.outbox), 0)

    def test_request_id_renvoye(self):
        r = self.client.get('/ok/', HTTP_X_REQUEST_ID='abc123')
        self.assertEqual(r['X-Request-ID'], 'abc123')

    def test_meme_incident_critique_regroupe_sans_spam_email(self):
        """Le dédoublonnage (1 email max par incident et par intervalle) s'applique aux
        incidents qui envoient effectivement un email, c'est-à-dire 'critique'."""
        for _ in range(3):
            signaler_incident('base de données injoignable', niveau='critique')
        incident = IncidentSysteme.objects.get()
        self.assertEqual(incident.occurrences, 3)
        self.assertEqual(len(mail.outbox), 1)

    def test_plafond_emails_par_heure(self):
        with self.settings(ALERT_EMAIL_MAX_PAR_HEURE=2):
            for i in range(5):
                signaler_incident(f'incident critique distinct {chr(65 + i)}', niveau='critique')
        self.assertEqual(IncidentSysteme.objects.count(), 5)
        self.assertEqual(len(mail.outbox), 2)

    def test_avertissement_sans_email(self):
        signaler_incident('lent', niveau='avertissement')
        self.assertEqual(len(mail.outbox), 0)

    def test_erreur_sans_email(self):
        """Niveau 'erreur' (défaut) : incident enregistré, pas d'email (voir
        NIVEAUX_AVEC_EMAIL)."""
        signaler_incident('erreur ponctuelle')
        self.assertEqual(len(mail.outbox), 0)

    def test_incident_resolu_puis_reapparu(self):
        signaler_incident('erreur X')
        IncidentSysteme.objects.update(resolu=True)
        signaler_incident('erreur X')
        self.assertEqual(IncidentSysteme.objects.count(), 2)


@override_settings(**ALERTES)
class EndpointsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = CustomUser.objects.create(username='adm', role='admin', is_staff=True)
        self.membre = CustomUser.objects.create(username='mbr', role='membre')

    def test_health(self):
        r = self.client.get('/api/health/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['base_de_donnees'], 'ok')

    def test_erreur_client_anonyme_et_connecte(self):
        r = self.client.post('/api/monitoring/erreur-client/', {
            'source': 'mobile', 'message': 'Null check operator', 'stack': '#0 main.dart', 'page': '/finance',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.client.force_authenticate(self.membre)
        self.client.post('/api/monitoring/erreur-client/', {
            'source': 'web', 'message': 'TypeError x', 'niveau': 'critique',
        }, format='json')
        self.assertEqual(IncidentSysteme.objects.filter(source='mobile').count(), 1)
        self.assertEqual(IncidentSysteme.objects.get(source='web').utilisateur, self.membre)
        # Seul le signalement explicitement 'critique' envoie un email (voir NIVEAUX_AVEC_EMAIL) ;
        # l'erreur 'mobile' par défaut (niveau 'erreur') n'en envoie pas.
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('TypeError x', mail.outbox[0].subject)

    def test_incidents_reserves_admin(self):
        signaler_incident('erreur Y')
        self.client.force_authenticate(self.membre)
        self.assertEqual(self.client.get('/api/monitoring/incidents/').status_code, 403)
        self.client.force_authenticate(self.admin)
        r = self.client.get('/api/monitoring/incidents/?resolu=false')
        self.assertEqual(r.data['count'], 1)
        self.assertEqual(r.data['non_resolus'], 1)
        pk = r.data['results'][0]['id']
        self.assertEqual(self.client.post(f'/api/monitoring/incidents/{pk}/resoudre/', {}, format='json').status_code, 200)
        self.assertTrue(IncidentSysteme.objects.get(pk=pk).resolu)
        self.client.delete('/api/monitoring/incidents/')
        self.assertEqual(IncidentSysteme.objects.count(), 0)

    def test_tester_alerte(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post('/api/monitoring/tester-alerte/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
