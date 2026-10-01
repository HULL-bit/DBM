import mimetypes
from datetime import datetime
from django.http import HttpResponse, Http404
from django.utils.encoding import smart_str

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from apps.accounts.permissions import (
    IsAdminOrJewrinConservatoire, has_admin_access, log_audit,
    AuditedModelViewSet,
)

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


class DocumentNumeriqueViewSet(AuditedModelViewSet):
    queryset = DocumentNumerique.objects.select_related('telecharge_par', 'categorie').order_by('-date_ajout')
    serializer_class = DocumentNumeriqueSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['categorie', 'type_document']
    audit_rubrique = 'conservatoire'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        instance = serializer.save(telecharge_par=self.request.user)
        log_audit(self.request, 'creation', rubrique=self.audit_rubrique, objet=instance,
                  description=f"Document ajouté : {instance}")
        return instance

    def _serve_fichier(self, document, as_attachment=False):
        """Sert le fichier via le storage (compatible FileSystem, S3, etc.)."""
        if not document.fichier or not document.fichier.name:
            raise Http404("Fichier non disponible.")
        try:
            with document.fichier.storage.open(document.fichier.name, 'rb') as f:
                content = f.read()
        except (FileNotFoundError, OSError) as e:
            if getattr(e, 'errno', None) == 2 or 'No such file' in str(e):
                raise Http404(
                    "Fichier introuvable sur le serveur. En hébergement cloud, les fichiers peuvent être perdus après un redéploiement. Veuillez supprimer ce document et le réajouter."
                )
            raise Http404(f"Fichier non accessible: {e!s}")
        except Exception as e:
            raise Http404(f"Fichier non accessible: {e!s}")
        if not content:
            raise Http404("Fichier vide.")
        content_type = mimetypes.guess_type(document.fichier.name)[0] or 'application/octet-stream'
        ext = document.fichier.name.rsplit('.', 1)[-1] if '.' in document.fichier.name else 'bin'
        filename = smart_str(document.titre or 'document') + '.' + ext
        resp = HttpResponse(content, content_type=content_type)
        resp['Content-Disposition'] = ('attachment; filename="%s"' % filename) if as_attachment else ('inline; filename="%s"' % filename)
        resp['Content-Length'] = len(content)
        return resp

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def lire(self, request, pk=None):
        """Sert le fichier pour lecture (iframe ou nouvel onglet) et incrémente les vues."""
        document = self.get_object()
        document.vues += 1
        document.save(update_fields=['vues'])
        return self._serve_fichier(document, as_attachment=False)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def telecharger(self, request, pk=None):
        """Télécharge le fichier et incrémente le compteur."""
        document = self.get_object()
        document.telechargements += 1
        document.save(update_fields=['telechargements'])
        return self._serve_fichier(document, as_attachment=True)


class MediaAudioViewSet(AuditedModelViewSet):
    queryset = MediaAudio.objects.select_related('upload_par').order_by('-date_ajout')
    serializer_class = MediaAudioSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['categorie']
    audit_rubrique = 'conservatoire'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        instance = serializer.save(upload_par=self.request.user)
        log_audit(self.request, 'creation', rubrique=self.audit_rubrique, objet=instance,
                  description=f"Média audio ajouté : {instance}")
        return instance


class MediaVideoViewSet(AuditedModelViewSet):
    queryset = MediaVideo.objects.select_related('upload_par').order_by('-date_ajout')
    serializer_class = MediaVideoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['categorie']
    audit_rubrique = 'conservatoire'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        instance = serializer.save(upload_par=self.request.user)
        log_audit(self.request, 'creation', rubrique=self.audit_rubrique, objet=instance,
                  description=f"Média vidéo ajouté : {instance}")
        return instance


class ArchiveHistoriqueViewSet(AuditedModelViewSet):
    queryset = ArchiveHistorique.objects.select_related('archiviste').order_by('-annee', 'date_evenement')
    serializer_class = ArchiveHistoriqueSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['type_archive', 'annee']
    audit_rubrique = 'conservatoire'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        instance = serializer.save(archiviste=self.request.user)
        log_audit(self.request, 'creation', rubrique=self.audit_rubrique, objet=instance,
                  description=f"Archive ajoutée : {instance}")
        return instance


class AlbumPhotoViewSet(AuditedModelViewSet):
    serializer_class = AlbumPhotoSerializer
    permission_classes = [IsAuthenticated]
    audit_rubrique = 'conservatoire'

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
        instance = serializer.save(cree_par=self.request.user)
        log_audit(self.request, 'creation', rubrique=self.audit_rubrique, objet=instance,
                  description=f"Album photo créé : {instance}")
        return instance


class PhotoViewSet(AuditedModelViewSet):
    queryset = Photo.objects.select_related('album', 'photographe').order_by('album', 'ordre')
    serializer_class = PhotoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['album']
    audit_rubrique = 'conservatoire'
    audit_log_consultation = False  # consultation d'une photo unitaire peu utile à l'audit (galerie très parcourue)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        instance = serializer.save(photographe=self.request.user)
        log_audit(self.request, 'creation', rubrique=self.audit_rubrique, objet=instance,
                  description=f"Photo ajoutée : {instance}")
        return instance


class KourelViewSet(AuditedModelViewSet):
    queryset = Kourel.objects.all().prefetch_related('membres').select_related(
        'maitre_de_coeur', 'maitre_de_coeur_2', 'responsable', 'jewrine'
    ).order_by('ordre', 'nom')
    serializer_class = KourelSerializer
    permission_classes = [IsAuthenticated]
    audit_rubrique = 'conservatoire'
    audit_label = 'Kourel'

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
            # Les présences "invité" (membre d'un AUTRE kourel) ne reflètent pas l'assiduité
            # propre des membres de CE kourel : exclues du taux du kourel. "Présent (hors
            # kourel)" (membre du kourel présent mais n'ayant pas presté) compte normalement.
            presences = PresenceSeance.objects.filter(seance__in=seances).exclude(statut='present_invite')
            nb_total = presences.count()
            nb_presents = presences.filter(statut__in=PresenceSeance.STATUTS_PRESENT).count()
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


class SeanceConservatoireViewSet(AuditedModelViewSet):
    serializer_class = SeanceConservatoireSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['kourel', 'type_seance']
    audit_rubrique = 'conservatoire'
    audit_label = 'Séance'

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
        instance = serializer.save(cree_par=self.request.user)
        log_audit(self.request, 'creation', rubrique=self.audit_rubrique, objet=instance,
                  description=f"Séance créée : {instance} ({instance.kourel.nom})")
        return instance

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrJewrinConservatoire()])
    def presences(self, request, pk=None):
        """
        Met à jour les présences des membres du kourel pour cette séance, ainsi que celles de
        membres extérieurs venus assister à la répétition d'un autre kourel (statut
        'present_invite'). "present_hors_kourel" est différent : un membre DU kourel présent
        mais qui n'a pas presté (sanction, mise à l'écart...), pas un invité externe.
        Un membre invité (statut='present_invite') n'a pas besoin d'appartenir au kourel de
        cette séance ; sa présence compte en surplus dans ses statistiques, jamais dans son
        taux de présence propre (voir stats_membres).
        Payload: { "presences": [{"membre": id, "statut": "present|present_retard|
        present_hors_kourel|present_invite|absent_justifie|absent_non_justifie", "remarque": ""}] }
        """
        seance = self.get_object()
        data = request.data.get('presences', [])
        kourel_membres = set(seance.kourel.membres.values_list('id', flat=True))
        statuts_valides = {s for s, _ in PresenceSeance.STATUT_CHOICES}
        from django.contrib.auth import get_user_model
        User = get_user_model()
        noms_externes = []
        for item in data:
            mid = item.get('membre')
            statut = item.get('statut', 'present')
            if statut not in statuts_valides:
                statut = 'present'
            # Un membre absent du kourel ne peut être marqué que "invité" ;
            # sinon on ignore la ligne pour ne pas créer de présence incohérente.
            if mid not in kourel_membres and statut != 'present_invite':
                continue
            PresenceSeance.objects.update_or_create(
                seance=seance,
                membre_id=mid,
                defaults={'statut': statut, 'remarque': item.get('remarque', '')}
            )
            if statut == 'present_invite':
                membre = User.objects.filter(id=mid).first()
                if membre:
                    noms_externes.append(membre.get_full_name())

        description = f"Présences enregistrées : {seance} ({len(data)} membre(s))"
        if noms_externes:
            description += f" — invité(s) d'un autre kourel : {', '.join(noms_externes)}"
        log_audit(request, 'modification', rubrique='conservatoire', objet=seance, description=description)
        return Response(SeanceConservatoireSerializer(seance).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrJewrinConservatoire()])
    def khassidas(self, request, pk=None):
        """
        Met à jour les khassidas répétées pour cette séance (programme de répétition à
        l'avance) et notifie tous les membres du kourel concerné.
        Payload: { "khassidas": [{"nom_khassida": "...", "dathie": "...", "khassida_portion": "...", "ordre": 0}] }
        """
        seance = self.get_object()
        data = request.data.get('khassidas', [])
        seance.khassidas.all().delete()
        noms = []
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
            noms.append(nom)

        if noms:
            from apps.communication.notifications import creer_notifications
            membres_ids = list(seance.kourel.membres.values_list('id', flat=True))
            creer_notifications(
                membres_ids, 'evenement',
                f"Programme de répétition — {seance.kourel.nom}",
                f"{seance.titre} : {', '.join(noms)}",
                lien='/conservatoire'
            )

        log_audit(request, 'modification', rubrique='conservatoire', objet=seance,
                  description=f"Programme de répétition mis à jour : {seance} ({len(noms)} khassida(s))")
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


class PresenceSeanceViewSet(AuditedModelViewSet):
    queryset = PresenceSeance.objects.all().select_related('seance', 'membre').order_by('seance', 'membre')
    serializer_class = PresenceSeanceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['seance', 'membre', 'statut']
    audit_rubrique = 'conservatoire'
    audit_label = 'Présence'
    audit_log_consultation = False  # déjà tracé via presences() en masse ; le retrieve unitaire est du bruit

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinConservatoire()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def stats_membres(self, request):
        """Pour chaque membre : nb_presents (retards et "hors kourel" sanctionné inclus),
        nb_retards, nb_absents (détaillés justifiés/non justifiés + leurs justifications),
        nb_total et pourcentage.

        Calculé uniquement sur les présences "propres" du membre (il est effectivement
        membre du kourel de la séance) : les présences "invité" (venu assister à la
        répétition d'un AUTRE kourel, statut=present_invite) ne comptent jamais dans ce
        taux, pour ne pas fausser l'évaluation d'assiduité du membre sur son propre kourel.
        Elles sont remontées à part, en surplus, via nb_hors_kourel. "present_hors_kourel"
        (membre du kourel présent mais n'ayant pas presté) compte normalement, lui.
        """
        from django.db.models import Count, Q
        from django.contrib.auth import get_user_model
        User = get_user_model()

        kourel_id = request.query_params.get('kourel_id')

        qs_propre = PresenceSeance.objects.exclude(statut='present_invite')
        qs_hors_kourel = PresenceSeance.objects.filter(statut='present_invite')
        if kourel_id:
            qs_propre = qs_propre.filter(seance__kourel_id=kourel_id)
            qs_hors_kourel = qs_hors_kourel.filter(seance__kourel_id=kourel_id)

        agg = qs_propre.values('membre').annotate(
            nb_total=Count('id'),
            nb_presents=Count('id', filter=Q(statut__in=PresenceSeance.STATUTS_PRESENT)),
            nb_retards=Count('id', filter=Q(statut='present_retard')),
            nb_hors_kourel_sanction=Count('id', filter=Q(statut='present_hors_kourel')),
            nb_absents=Count('id', filter=Q(statut__in=['absent_non_justifie', 'absent_justifie'])),
            nb_abs_justifiees=Count('id', filter=Q(statut='absent_justifie')),
            nb_abs_non_justifiees=Count('id', filter=Q(statut='absent_non_justifie')),
        )
        nb_hors_kourel_par_membre = {
            row['membre']: row['nb']
            for row in qs_hors_kourel.values('membre').annotate(nb=Count('id'))
        }
        justifications_par_membre = {}
        for p in qs_propre.filter(statut='absent_justifie').exclude(remarque='').select_related('seance'):
            justifications_par_membre.setdefault(p.membre_id, []).append({
                'seance': str(p.seance), 'date': p.seance.date_heure, 'justification': p.remarque,
            })

        result = []
        for row in agg:
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
                'nb_retards': row['nb_retards'] or 0,
                'nb_hors_kourel_sanction': row['nb_hors_kourel_sanction'] or 0,
                'nb_absents': nb_absents,
                'nb_abs_justifiees': row['nb_abs_justifiees'] or 0,
                'nb_abs_non_justifiees': row['nb_abs_non_justifiees'] or 0,
                'justifications': justifications_par_membre.get(row['membre'], []),
                'nb_total': nb_total,
                'pourcentage': pourcentage,
                'nb_hors_kourel': nb_hors_kourel_par_membre.get(row['membre'], 0),
            })
        # Les membres présents UNIQUEMENT en hors-kourel dans ce contexte (aucune présence
        # propre) apparaissent quand même, avec un taux propre à 0/0, pour ne pas les masquer.
        membres_deja_listes = {r['membre_id'] for r in result}
        for mid, nb in nb_hors_kourel_par_membre.items():
            if mid in membres_deja_listes:
                continue
            user = User.objects.filter(id=mid).first()
            if not user:
                continue
            result.append({
                'membre_id': mid, 'membre_nom': user.get_full_name() or user.username,
                'nb_presents': 0, 'nb_retards': 0, 'nb_hors_kourel_sanction': 0, 'nb_absents': 0,
                'nb_abs_justifiees': 0, 'nb_abs_non_justifiees': 0, 'justifications': [],
                'nb_total': 0, 'pourcentage': 0, 'nb_hors_kourel': nb,
            })
        result.sort(key=lambda x: -x['pourcentage'])
        return Response(result)
