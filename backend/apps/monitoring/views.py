import logging
import os
import time

from django.core.cache import cache
from django.db import connection
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.accounts.permissions import IsAdminRoleOrStaff, log_audit
from .alertes import signaler_incident
from .models import IncidentSysteme

logger = logging.getLogger('dbm.monitoring')


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def health(request):
    """État du serveur pour la surveillance externe (GitHub Actions, UptimeRobot...) :
    200 si tout va bien, 503 si la base de données ne répond pas."""
    debut = time.monotonic()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        db_ok = True
    except Exception as e:
        db_ok = False
        signaler_incident(
            titre=f'Base de données indisponible : {type(e).__name__}', details=str(e),
            source='surveillance', niveau='critique', request=request,
        )
    return Response({
        'status': 'ok' if db_ok else 'degrade',
        'base_de_donnees': 'ok' if db_ok else 'indisponible',
        'version': os.environ.get('RENDER_GIT_COMMIT', '')[:7],
        'heure': timezone.now(),
        'duree_ms': int((time.monotonic() - debut) * 1000),
    }, status=200 if db_ok else 503)


class _JWTOptionnel(JWTAuthentication):
    """Identifie l'utilisateur si un jeton valide est fourni, sans jamais refuser la
    requête (une erreur peut survenir sur l'écran de connexion, jeton expiré, etc.)."""

    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except Exception:
            return None


@api_view(['POST'])
@authentication_classes([_JWTOptionnel])
@permission_classes([AllowAny])
def erreur_client(request):
    """Remontée des erreurs du site web et de l'appli mobile (plantage d'un écran,
    exception JavaScript/Dart, erreur serveur reçue...)."""
    ip = (request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
          or request.META.get('REMOTE_ADDR', ''))
    cle = f'erreur_client:{ip}'
    nb = cache.get(cle, 0)
    if nb >= 30:  # 30 signalements / 10 min / IP : un client en boucle ne doit pas noyer le journal
        return Response({'detail': 'Trop de signalements.'}, status=429)
    cache.set(cle, nb + 1, 600)

    data = request.data if isinstance(request.data, dict) else {}
    source = data.get('source') if data.get('source') in ('web', 'mobile') else 'web'
    message = str(data.get('message') or 'Erreur inconnue')[:500]
    contexte = {k: str(v)[:500] for k, v in (data.get('contexte') or {}).items()} if isinstance(data.get('contexte'), dict) else {}
    details = '\n'.join([
        f"Page / écran : {data.get('page', '')}",
        f"Version : {data.get('version', '')}",
        *[f"{k} : {v}" for k, v in contexte.items()],
        '',
        str(data.get('stack') or '')[:8000],
    ])
    signaler_incident(
        titre=message, details=details, source=source,
        niveau='critique' if data.get('niveau') == 'critique' else 'erreur',
        request=request, chemin=str(data.get('page') or '')[:255], methode='CLIENT',
        statut_http=data.get('statut_http') if isinstance(data.get('statut_http'), int) else None,
    )
    return Response({'ok': True}, status=201)


class IncidentSerializer(serializers.ModelSerializer):
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    niveau_display = serializers.CharField(source='get_niveau_display', read_only=True)
    utilisateur_nom = serializers.SerializerMethodField()

    class Meta:
        model = IncidentSysteme
        exclude = ['signature']

    def get_utilisateur_nom(self, obj):
        if not obj.utilisateur:
            return ''
        return obj.utilisateur.get_full_name() or obj.utilisateur.username


@api_view(['GET', 'DELETE'])
@permission_classes([IsAdminRoleOrStaff])
def incidents(request):
    """GET : incidents techniques (filtres ?resolu=true|false&source=&niveau=).
    DELETE : purge des incidents résolus."""
    if request.method == 'DELETE':
        nb, _ = IncidentSysteme.objects.filter(resolu=True).delete()
        log_audit(request, 'suppression', rubrique='comptes', description=f"Purge de {nb} incident(s) technique(s) résolu(s)")
        return Response({'detail': f'{nb} incident(s) supprimé(s).'})

    qs = IncidentSysteme.objects.select_related('utilisateur')
    resolu = request.query_params.get('resolu')
    if resolu in ('true', 'false'):
        qs = qs.filter(resolu=resolu == 'true')
    for champ in ('source', 'niveau'):
        if request.query_params.get(champ):
            qs = qs.filter(**{champ: request.query_params[champ]})
    paginator = PageNumberPagination()
    paginator.page_size = 25
    page = paginator.paginate_queryset(qs, request)
    reponse = paginator.get_paginated_response(IncidentSerializer(page, many=True).data)
    reponse.data['non_resolus'] = IncidentSysteme.objects.filter(resolu=False).count()
    return reponse


@api_view(['POST'])
@permission_classes([IsAdminRoleOrStaff])
def resoudre_incident(request, pk):
    resolu = bool(request.data.get('resolu', True))
    nb = IncidentSysteme.objects.filter(pk=pk).update(resolu=resolu)
    if not nb:
        return Response({'detail': 'Incident introuvable.'}, status=404)
    log_audit(request, 'modification', rubrique='comptes',
              description=f"Incident technique n°{pk} marqué {'résolu' if resolu else 'non résolu'}")
    return Response({'ok': True})


@api_view(['POST'])
@permission_classes([IsAdminRoleOrStaff])
def tester_alerte(request):
    """Envoie un email de test pour vérifier la configuration des alertes."""
    from django.conf import settings
    from django.core.mail import send_mail

    destinataires = [e for e in getattr(settings, 'ALERT_EMAILS', []) if e]
    if not destinataires:
        return Response({'detail': "Aucun destinataire : définissez ALERT_EMAILS."}, status=400)
    if 'console' in settings.EMAIL_BACKEND:
        return Response({
            'detail': "Les emails ne sont pas configurés sur le serveur (EMAIL_HOST_USER / "
                      "EMAIL_HOST_PASSWORD manquants) : ils s'affichent seulement dans les logs.",
        }, status=400)
    try:
        send_mail(
            '✅ [DBM] Test des alertes',
            f"Les alertes de surveillance DBM fonctionnent.\nDemandé par {request.user.username} "
            f"le {timezone.localtime():%d/%m/%Y à %H:%M}.",
            settings.DEFAULT_FROM_EMAIL, destinataires, fail_silently=False,
        )
    except Exception as e:
        return Response({'detail': f"Échec de l'envoi : {e}"}, status=502)
    return Response({'detail': f"Email de test envoyé à {', '.join(destinataires)}."})
