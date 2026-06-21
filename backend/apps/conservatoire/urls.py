from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'conservatoire/categories', views.CategorieDocumentViewSet)
router.register(r'conservatoire/documents', views.DocumentNumeriqueViewSet)
router.register(r'conservatoire/audio', views.MediaAudioViewSet)
router.register(r'conservatoire/videos', views.MediaVideoViewSet)
router.register(r'conservatoire/archives', views.ArchiveHistoriqueViewSet)
router.register(r'conservatoire/albums', views.AlbumPhotoViewSet)
router.register(r'conservatoire/photos', views.PhotoViewSet)
router.register(r'conservatoire/kourels', views.KourelViewSet)
router.register(r'conservatoire/seances', views.SeanceConservatoireViewSet)
router.register(r'conservatoire/presences', views.PresenceSeanceViewSet)

# Wrapper legacy pour l'export global (rétrocompatibilité avec les clients existants)
from django.http import HttpResponse


def _rapport_export_wrapper(req):
    from rest_framework_simplejwt.authentication import JWTAuthentication
    user = getattr(req, 'user', None)
    if not user or not user.is_authenticated:
        try:
            auth = JWTAuthentication()
            auth_result = auth.authenticate(req)
            if auth_result:
                user = auth_result[0]
        except Exception:
            pass
    if not user or not user.is_authenticated:
        from django.http import JsonResponse
        return JsonResponse({'detail': 'Authentification requise.'}, status=401)
    if not (user.is_staff or getattr(user, 'role', None) in ('admin', 'jewrin', 'jewrine_conservatoire')):
        from django.http import JsonResponse
        return JsonResponse({'detail': 'Droits insuffisants.'}, status=403)

    from .rapport_export import export_rapport_excel, export_rapport_pdf, export_rapport_csv
    from datetime import datetime

    fmt = req.GET.get('format', 'excel').lower()
    if fmt not in ('pdf', 'excel', 'xlsx', 'csv'):
        fmt = 'excel'

    kourel_id = req.GET.get('kourel_id')
    if kourel_id:
        try:
            kourel_id = int(kourel_id)
        except ValueError:
            kourel_id = None

    def _parse(val):
        try:
            return datetime.strptime(val, '%Y-%m-%d').date() if val else None
        except (ValueError, TypeError):
            return None

    date_debut = _parse(req.GET.get('date_debut'))
    date_fin   = _parse(req.GET.get('date_fin'))

    buf = None
    filename = 'rapport_seances_toutes'
    if date_debut and date_fin:
        filename = f'rapport_seances_{date_debut}_{date_fin}'

    if fmt in ('excel', 'xlsx'):
        buf = export_rapport_excel(date_debut, date_fin, kourel_id=kourel_id)
        content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        filename += '.xlsx'
    elif fmt == 'pdf':
        buf = export_rapport_pdf(date_debut, date_fin, kourel_id=kourel_id)
        content_type = 'application/pdf'
        filename += '.pdf'
    elif fmt == 'csv':
        buf = export_rapport_csv(date_debut, date_fin, kourel_id=kourel_id)
        content_type = 'text/csv; charset=utf-8'
        filename += '.csv'
    else:
        content_type = 'application/octet-stream'

    if not buf:
        return HttpResponse('Erreur génération', status=500)
    resp = HttpResponse(buf.read(), content_type=content_type)
    resp['Content-Disposition'] = f'attachment; filename="{filename}"'
    return resp


urlpatterns = [
    # Route export legacy — AVANT router pour éviter que <pk>/ ne capture "rapport-export"
    path('conservatoire/seances/rapport-export/', _rapport_export_wrapper),
    path('', include(router.urls)),
]
