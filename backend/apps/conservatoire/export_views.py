"""Vue standalone pour l'export du rapport des séances (évite les conflits de routing)."""
from datetime import datetime
from django.http import HttpResponse

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, BasePermission

from .rapport_export import (
    export_rapport_excel, export_rapport_pdf, export_rapport_csv,
    export_membres_kourel_excel, export_membres_kourel_pdf,
)


class IsAdminUserOrRole(BasePermission):
    """Autorise is_staff OU role='admin' OU jewrin conservatoire."""
    def has_permission(self, request, view):
        from apps.accounts.permissions import has_admin_access
        return bool(request.user and has_admin_access(request.user, 'conservatoire'))


def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return None


def _send_file(buf, fmt, filename_base):
    if buf is None:
        from rest_framework.response import Response
        return Response({'detail': 'Erreur génération.'}, status=500)
    ext_map = {
        'excel': ('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx'),
        'xlsx':  ('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx'),
        'pdf':   ('application/pdf', '.pdf'),
        'csv':   ('text/csv; charset=utf-8', '.csv'),
    }
    content_type, ext = ext_map.get(fmt, ('application/octet-stream', ''))
    resp = HttpResponse(buf.read(), content_type=content_type)
    resp['Content-Disposition'] = f'attachment; filename="{filename_base}{ext}"'
    return resp


class RapportSeancesExportView(APIView):
    """
    Export PDF/Excel/CSV des séances de répétition.
    GET ?format=pdf|excel|csv&date_debut=YYYY-MM-DD&date_fin=YYYY-MM-DD&kourel_id=<id>
    """
    permission_classes = [IsAuthenticated, IsAdminUserOrRole]

    def get(self, request):
        fmt = request.query_params.get('format', 'excel').lower()
        if fmt not in ('pdf', 'excel', 'xlsx', 'csv'):
            fmt = 'excel'

        date_debut = _parse_date(request.query_params.get('date_debut'))
        date_fin   = _parse_date(request.query_params.get('date_fin'))
        kourel_id  = request.query_params.get('kourel_id')
        if kourel_id:
            try:
                kourel_id = int(kourel_id)
            except ValueError:
                kourel_id = None

        parts = ['rapport_seances']
        if date_debut and date_fin:
            parts += [str(date_debut), str(date_fin)]
        else:
            parts.append('toutes')
        if kourel_id:
            parts.append(f'kourel{kourel_id}')
        filename = '_'.join(parts)

        if fmt in ('excel', 'xlsx'):
            buf = export_rapport_excel(date_debut, date_fin, kourel_id=kourel_id)
        elif fmt == 'pdf':
            buf = export_rapport_pdf(date_debut, date_fin, kourel_id=kourel_id)
        else:
            buf = export_rapport_csv(date_debut, date_fin, kourel_id=kourel_id)

        return _send_file(buf, fmt, filename)


class FicheKourelExportView(APIView):
    """
    Export de la fiche membres d'un kourel (Excel ou PDF).
    GET /conservatoire/kourels/<kourel_id>/fiche/?format=excel|pdf
    """
    permission_classes = [IsAuthenticated, IsAdminUserOrRole]

    def get(self, request, kourel_id):
        from .models import Kourel
        try:
            kourel = Kourel.objects.get(pk=kourel_id)
        except Kourel.DoesNotExist:
            from rest_framework.response import Response
            return Response({'detail': 'Kourel introuvable.'}, status=404)

        fmt = request.query_params.get('format', 'excel').lower()
        if fmt not in ('excel', 'xlsx', 'pdf'):
            fmt = 'excel'

        filename = f"membres_{kourel.nom.replace(' ', '_')}"
        if fmt in ('excel', 'xlsx'):
            buf = export_membres_kourel_excel(kourel.pk)
        else:
            buf = export_membres_kourel_pdf(kourel.pk)

        return _send_file(buf, fmt, filename)
