from datetime import datetime
from django.http import HttpResponse

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from apps.accounts.permissions import IsAdminOrJewrinConservatoire, has_admin_access

from .models import (
    CategorieDocument, DocumentNumerique, MediaAudio, MediaVideo,
    ArchiveHistorique, AlbumPhoto, Photo,
    Kourel, SeanceConservatoire, PresenceSeance, KhassidaRepetee
)
from .serializers import (
    CategorieDocumentSerializer, DocumentNumeriqueSerializer, MediaAudioSerializer,
    MediaVideoSerializer, ArchiveHistoriqueSerializer, AlbumPhotoSerializer, PhotoSerializer,
    KourelSerializer, SeanceConservatoireSerializer, PresenceSeanceSerializer
)


class IsAdminUserOrRole(BasePermission):
    """Autorise is_staff OU role='admin' (CustomUser) OU jewrin conservatoire."""
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'conservatoire')


def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return None


def _export_response(buf, fmt, filename_base):
    """Construit un HttpResponse fichier à partir d'un buffer et du format."""
    if buf is None:
        return Response({'detail': 'Erreur de génération. Vérifiez openpyxl et reportlab.'}, status=500)
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


# ──────────────────────────────── ViewSets ───────────────────────────────────

class CategorieDocumentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CategorieDocument.objects.all()
    serializer_class = CategorieDocumentSerializer
    permission_classes = [IsAuthenticated]


class DocumentNumeriqueViewSet(viewsets.ModelViewSet):
    queryset = DocumentNumerique.objects.select_related('telecharge_par', 'categorie').order_by('-date_ajout')
    serializer_class = DocumentNumeriqueSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['categorie', 'type_document']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(telecharge_par=self.request.user)


class MediaAudioViewSet(viewsets.ModelViewSet):
    queryset = MediaAudio.objects.select_related('upload_par').order_by('-date_ajout')
    serializer_class = MediaAudioSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['categorie']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(upload_par=self.request.user)


class MediaVideoViewSet(viewsets.ModelViewSet):
    queryset = MediaVideo.objects.select_related('upload_par').order_by('-date_ajout')
    serializer_class = MediaVideoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['categorie']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(upload_par=self.request.user)


class ArchiveHistoriqueViewSet(viewsets.ModelViewSet):
    queryset = ArchiveHistorique.objects.select_related('archiviste').order_by('-annee', 'date_evenement')
    serializer_class = ArchiveHistoriqueSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['type_archive', 'annee']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(archiviste=self.request.user)


class AlbumPhotoViewSet(viewsets.ModelViewSet):
    serializer_class = AlbumPhotoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = AlbumPhoto.objects.select_related('cree_par').all().order_by('-date_evenement')
        if not has_admin_access(self.request.user, 'conservatoire'):
            qs = qs.filter(est_public=True)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)


class PhotoViewSet(viewsets.ModelViewSet):
    queryset = Photo.objects.select_related('album', 'photographe').order_by('album', 'ordre')
    serializer_class = PhotoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['album']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(photographe=self.request.user)


class KourelViewSet(viewsets.ModelViewSet):
    queryset = Kourel.objects.all().prefetch_related('membres').select_related(
        'maitre_de_coeur', 'maitre_de_coeur_2', 'responsable', 'jewrine'
    ).order_by('ordre', 'nom')
    serializer_class = KourelSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['get'], permission_classes=[IsAdminOrJewrinConservatoire()],
            url_path='export-membres')
    def export_membres(self, request, pk=None):
        """
        Export (Excel ou PDF) de la liste des membres d'un kourel.
        GET ?format=excel|pdf
        """
        from .rapport_export import export_membres_kourel_excel, export_membres_kourel_pdf

        kourel = self.get_object()
        fmt = request.query_params.get('format', 'excel').lower()
        if fmt not in ('excel', 'xlsx', 'pdf'):
            fmt = 'excel'

        filename = f"membres_{kourel.nom.replace(' ', '_')}"
        if fmt in ('excel', 'xlsx'):
            buf = export_membres_kourel_excel(kourel.pk)
        else:
            buf = export_membres_kourel_pdf(kourel.pk)

        return _export_response(buf, fmt, filename)

    @action(detail=True, methods=['get'], permission_classes=[IsAdminOrJewrinConservatoire()],
            url_path='export-seances')
    def export_seances(self, request, pk=None):
        """
        Export (Excel, PDF, CSV) des séances d'un kourel spécifique.
        GET ?format=excel|pdf|csv&date_debut=YYYY-MM-DD&date_fin=YYYY-MM-DD
        """
        from .rapport_export import export_rapport_excel, export_rapport_pdf, export_rapport_csv

        kourel = self.get_object()
        fmt = request.query_params.get('format', 'excel').lower()
        if fmt not in ('excel', 'xlsx', 'pdf', 'csv'):
            fmt = 'excel'

        date_debut = _parse_date(request.query_params.get('date_debut'))
        date_fin   = _parse_date(request.query_params.get('date_fin'))

        filename = f"seances_{kourel.nom.replace(' ', '_')}"
        if date_debut and date_fin:
            filename += f"_{date_debut}_{date_fin}"

        if fmt in ('excel', 'xlsx'):
            buf = export_rapport_excel(date_debut, date_fin, kourel_id=kourel.pk)
        elif fmt == 'pdf':
            buf = export_rapport_pdf(date_debut, date_fin, kourel_id=kourel.pk)
        else:
            buf = export_rapport_csv(date_debut, date_fin, kourel_id=kourel.pk)

        return _export_response(buf, fmt, filename)

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUserOrRole()],
            url_path='stats')
    def stats(self, request):
        """
        Statistiques globales de tous les kourels :
        nb membres, nb séances, taux présence moyen.
        """
        from django.db.models import Count, Q, Avg
        kourels = Kourel.objects.prefetch_related('membres', 'seances').select_related(
            'responsable', 'maitre_de_coeur', 'maitre_de_coeur_2', 'jewrine'
        ).order_by('ordre', 'nom')
        result = []
        for k in kourels:
            seances = k.seances.filter(type_seance='repetition')
            presences = PresenceSeance.objects.filter(seance__in=seances)
            nb_total = presences.count()
            nb_presents = presences.filter(statut='present').count()
            taux = round(100 * nb_presents / nb_total, 1) if nb_total else 0
            result.append({
                'id': k.pk,
                'nom': k.nom,
                'ordre': k.ordre,
                'responsable': k.responsable.get_full_name() if k.responsable else None,
                'maitre_de_coeur': k.maitre_de_coeur.get_full_name() if k.maitre_de_coeur else None,
                'maitre_de_coeur_2': k.maitre_de_coeur_2.get_full_name() if k.maitre_de_coeur_2 else None,
                'jewrine': k.jewrine.get_full_name() if k.jewrine else None,
                'nb_membres': k.membres.count(),
                'nb_seances': seances.count(),
                'taux_presence_moyen': taux,
            })
        return Response(result)


class SeanceConservatoireViewSet(viewsets.ModelViewSet):
    serializer_class = SeanceConservatoireSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['kourel', 'type_seance']

    def get_queryset(self):
        qs = SeanceConservatoire.objects.all().select_related('kourel').prefetch_related(
            'presences', 'presences__membre', 'khassidas'
        ).order_by('-date_heure')
        if not has_admin_access(self.request.user, 'conservatoire'):
            qs = qs.filter(kourel__membres=self.request.user)
        return qs.distinct()

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrJewrinConservatoire()])
    def presences(self, request, pk=None):
        """
        Met à jour les présences des membres du kourel pour cette séance.
        Payload: { "presences": [{"membre": id, "statut": "present|absent_justifie|absent_non_justifie", "remarque": ""}] }
        """
        seance = self.get_object()
        data = request.data.get('presences', [])
        kourel_membres = set(seance.kourel.membres.values_list('id', flat=True))
        for item in data:
            mid = item.get('membre')
            if mid not in kourel_membres:
                continue
            statut = item.get('statut', 'present')
            if statut not in ['present', 'absent_justifie', 'absent_non_justifie']:
                statut = 'present'
            PresenceSeance.objects.update_or_create(
                seance=seance,
                membre_id=mid,
                defaults={'statut': statut, 'remarque': item.get('remarque', '')}
            )
        return Response(SeanceConservatoireSerializer(seance).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrJewrinConservatoire()])
    def khassidas(self, request, pk=None):
        """
        Met à jour les khassidas répétées pour cette séance.
        Payload: { "khassidas": [{"nom_khassida": "...", "dathie": "...", "khassida_portion": "...", "ordre": 0}] }
        """
        seance = self.get_object()
        data = request.data.get('khassidas', [])
        seance.khassidas.all().delete()
        for i, item in enumerate(data):
            nom = (item.get('nom_khassida') or '').strip()
            dathie = (item.get('dathie') or '').strip()
            if not nom or not dathie:
                continue
            KhassidaRepetee.objects.create(
                seance=seance,
                nom_khassida=nom,
                dathie=dathie,
                khassida_portion=(item.get('khassida_portion') or '').strip(),
                ordre=item.get('ordre', i)
            )
        return Response(SeanceConservatoireSerializer(seance).data)

    @action(detail=False, methods=['get'],
            permission_classes=[IsAuthenticated, IsAdminUserOrRole],
            url_path='rapport-export')
    def rapport_export(self, request):
        """
        Export rapport des séances de répétition (PDF, Excel, CSV).
        GET ?date_debut=YYYY-MM-DD&date_fin=YYYY-MM-DD&format=pdf|excel|csv&kourel_id=<id>
        """
        from .rapport_export import export_rapport_excel, export_rapport_pdf, export_rapport_csv

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

        return _export_response(buf, fmt, filename)


class PresenceSeanceViewSet(viewsets.ModelViewSet):
    queryset = PresenceSeance.objects.all().select_related('seance', 'membre').order_by('seance', 'membre')
    serializer_class = PresenceSeanceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['seance', 'membre', 'statut']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def stats_membres(self, request):
        """Pour chaque membre ayant des présences : nb_presents, nb_absents, nb_total, pourcentage."""
        from django.db.models import Count, Q
        from django.contrib.auth import get_user_model
        User = get_user_model()

        kourel_id = request.query_params.get('kourel_id')
        qs = PresenceSeance.objects.all()
        if kourel_id:
            qs = qs.filter(seance__kourel_id=kourel_id)

        qs = qs.values('membre').annotate(
            nb_total=Count('id'),
            nb_presents=Count('id', filter=Q(statut='present')),
            nb_absents=Count('id', filter=Q(statut__in=['absent_non_justifie', 'absent_justifie'])),
        )
        result = []
        for row in qs:
            user = User.objects.filter(id=row['membre']).first()
            if not user:
                continue
            nb_total = row['nb_total'] or 0
            nb_presents = row['nb_presents'] or 0
            nb_absents = row['nb_absents'] or 0
            pourcentage = round((nb_presents / nb_total * 100), 1) if nb_total > 0 else 0
            result.append({
                'membre_id': row['membre'],
                'membre_nom': user.get_full_name() or user.username,
                'nb_presents': nb_presents,
                'nb_absents': nb_absents,
                'nb_total': nb_total,
                'pourcentage': pourcentage,
            })
        result.sort(key=lambda x: -x['pourcentage'])
        return Response(result)
