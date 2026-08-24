from datetime import date
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse, HttpResponse

def root(request):
    """Réponse sur la racine pour éviter 404."""
    return JsonResponse({
        'message': 'DBM API',
        'admin': '/admin/',
        'api': '/api/',
        'privacy': '/privacy/',
    })


def privacy_policy(request):
    """Politique de confidentialité — URL stable et sans JS, utilisable pour les stores
    d'applications (Google Play / App Store) qui exigent un lien direct."""
    html = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Politique de confidentialité — Daara Barakatul Mahaahidi</title>
<style>
  body { font-family: 'Poppins', Arial, sans-serif; background: #F4EAD5; color: #1A1A1A; margin: 0; padding: 0; }
  .wrap { max-width: 720px; margin: 0 auto; padding: 32px 20px 64px; }
  .card { background: #fff; border-left: 4px solid #C9A961; border-radius: 12px; padding: 32px; box-shadow: 0 8px 32px rgba(45,95,63,0.1); }
  h1 { color: #2D5F3F; font-size: 1.6rem; margin-bottom: 4px; }
  .sub { color: #555; font-size: 0.9rem; margin-bottom: 24px; }
  h2 { color: #2D5F3F; font-size: 1.1rem; margin-top: 28px; margin-bottom: 8px; }
  p { line-height: 1.7; font-size: 0.95rem; }
  hr { border: none; border-top: 1px solid #C9A96155; margin: 24px 0; }
  a { color: #2D5F3F; }
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <h1>Politique de confidentialité</h1>
    <div class="sub">Daara Barakatul Mahaahidi — Plateforme de gestion (web et mobile)</div>

    <h2>1. Qui sommes-nous ?</h2>
    <p>La présente plateforme (application web et application mobile) est gérée par la Daara Barakatul
    Mahaahidi pour l'administration de sa communauté : gestion des membres, cotisations, programme
    Kamil, communication interne, conservatoire, et activités associées.</p>

    <h2>2. Données que nous collectons</h2>
    <p>Nom et prénom, email, téléphone, adresse, sexe, photo de profil (facultative), catégorie
    (élève, étudiant, professionnel), cellule et groupe sanguin (facultatifs), ainsi que les données
    liées à votre activité au sein de la Daara (cotisations et paiements déclarés, progression au
    programme Kamil, présence aux séances du conservatoire, messages échangés dans la messagerie et
    les canaux internes).</p>

    <h2>3. Pourquoi nous les utilisons</h2>
    <p>Ces informations servent exclusivement à la gestion de la vie associative de la Daara :
    identifier les membres, suivre les cotisations et paiements, organiser les activités culturelles
    et religieuses, permettre la communication entre membres, et produire des statistiques et
    rapports internes. Nous ne vendons ni ne partageons vos données avec des tiers à des fins
    commerciales.</p>

    <h2>4. Qui peut voir vos données</h2>
    <p>L'accès est limité selon votre rôle (Administrateur, Jewrin, Membre) : un membre voit ses
    propres données ; les responsables ont accès aux données nécessaires à leurs fonctions de
    gestion. Les messages échangés sont visibles par leurs destinataires et les administrateurs
    habilités à la modération.</p>

    <h2>5. Conservation et sécurité</h2>
    <p>Vos données sont conservées tant que vous êtes membre actif de la Daara et selon la durée
    nécessaire à la tenue des registres associatifs. L'accès est protégé par authentification et un
    système de permissions par rôle.</p>

    <h2>6. Vos droits</h2>
    <p>Vous pouvez consulter et corriger vos informations depuis « Mon profil » sur la plateforme.
    Pour toute demande de suppression de compte/données ou question, contactez l'administration de
    la Daara.</p>

    <h2>7. Application mobile</h2>
    <p>L'application mobile utilise les mêmes comptes et données que la plateforme web ; elle ne
    collecte pas de données supplémentaires en dehors de celles nécessaires à son fonctionnement.</p>

    <h2>8. Modifications</h2>
    <p>Cette politique peut être mise à jour pour refléter des évolutions de la plateforme ou des
    exigences légales.</p>

    <hr>
    <p style="text-align:center; font-size: 0.85rem; color: #777;">
      © %(annee)s Daara Barakatul Mahaahidi
    </p>
  </div>
</div>
</body>
</html>""" % {'annee': date.today().year}
    return HttpResponse(html, content_type='text/html; charset=utf-8')


urlpatterns = [
    path('', root),
    path('privacy/', privacy_policy),
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/', include('apps.conservatoire.urls')),  # AVANT informations
    path('api/', include('apps.informations.urls')),
    path('api/', include('apps.finance.urls')),
    path('api/', include('apps.culturelle.urls')),
    path('api/', include('apps.communication.urls')),
    path('api/', include('apps.sociale.urls')),
    path('api/', include('apps.scientifique.urls')),
    path('api/', include('apps.organisation.urls')),
    path('api/', include('apps.bibliotheque.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
