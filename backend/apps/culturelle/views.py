from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count

from .models import Kamil, Chapitre, ProgressionLecture, ActiviteReligieuse, Enseignement, VersementKamil
from .serializers import KamilSerializer, ChapitreSerializer, ProgressionLectureSerializer, ActiviteReligieuseSerializer, EnseignementSerializer, VersementKamilSerializer

User = get_user_model()


class KamilViewSet(viewsets.ModelViewSet):
    queryset = Kamil.objects.filter(statut='actif').order_by('-date_creation')
    serializer_class = KamilSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['statut']

    def get_queryset(self):
        return Kamil.objects.all().order_by('-date_creation')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]


class ChapitreViewSet(viewsets.ModelViewSet):
    queryset = Chapitre.objects.all().order_by('kamil', 'numero')
    serializer_class = ChapitreSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['kamil', 'est_publie']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]


class ProgressionLectureViewSet(viewsets.ModelViewSet):
    queryset = ProgressionLecture.objects.all().order_by('membre', 'kamil', 'chapitre__numero')
    serializer_class = ProgressionLectureSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['membre', 'kamil', 'chapitre', 'statut']

    def get_queryset(self):
        qs = ProgressionLecture.objects.all().select_related('membre', 'kamil', 'chapitre').order_by('membre', 'kamil', 'chapitre__numero')
        if not (self.request.user.is_staff or self.request.user.role == 'admin' or self.request.user.role == 'jewrin'):
            qs = qs.filter(membre=self.request.user)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]  # Admin/Jewrin pour assignations, membre uniquement via marquer_comme_lu
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        # Admin/Jewrin peut assigner un juzz à un membre ; sinon l'assignation est pour soi
        if self.request.user.role in ['admin', 'jewrin'] and self.request.data.get('membre'):
            membre = get_object_or_404(User, id=self.request.data.get('membre'))
        else:
            membre = self.request.user
        serializer.save(membre=membre)

    @action(detail=False, methods=['post'])
    def marquer_comme_lu(self, request):
        kamil_id = request.data.get('kamil_id')
        chapitre_id = request.data.get('chapitre_id')
        if not kamil_id or not chapitre_id:
            return Response({'detail': 'kamil_id et chapitre_id requis'}, status=400)
        from django.utils import timezone
        prog, created = ProgressionLecture.objects.get_or_create(
            membre=request.user,
            kamil_id=kamil_id,
            chapitre_id=chapitre_id,
            defaults={'statut': 'lu', 'date_lecture': timezone.now().date()}
        )
        if not created:
            prog.statut = 'lu'
            prog.date_lecture = timezone.now().date()
            prog.save(update_fields=['statut', 'date_lecture'])
        return Response(ProgressionLectureSerializer(prog).data)

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        prog = self.get_object()
        if request.user.role not in ['admin', 'jewrin']:
            return Response({'detail': 'Non autorisé'}, status=403)
        from django.utils import timezone
        prog.statut = 'valide'
        prog.est_valide = True
        prog.valide_par = request.user
        prog.date_validation = timezone.now()
        prog.commentaire_validation = request.data.get('commentaire', '')
        prog.save()
        return Response(ProgressionLectureSerializer(prog).data)

    @action(detail=True, methods=['post'])
    def refuser(self, request, pk=None):
        prog = self.get_object()
        if request.user.role not in ['admin', 'jewrin']:
            return Response({'detail': 'Non autorisé'}, status=403)
        prog.statut = 'refuse'
        prog.est_valide = False
        prog.valide_par = request.user
        from django.utils import timezone
        prog.date_validation = timezone.now()
        prog.commentaire_validation = request.data.get('commentaire', '')
        prog.save()
        return Response(ProgressionLectureSerializer(prog).data)


class ActiviteReligieuseViewSet(viewsets.ModelViewSet):
    queryset = ActiviteReligieuse.objects.all().order_by('-date_activite')
    serializer_class = ActiviteReligieuseSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['type_activite', 'animateur']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(animateur=self.request.user)


class EnseignementViewSet(viewsets.ModelViewSet):
    queryset = Enseignement.objects.all().order_by('-date_publication')
    serializer_class = EnseignementSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['categorie', 'auteur']


class VersementKamilViewSet(viewsets.ModelViewSet):
    """Gestion des versements pour les assignations Kamil"""
    queryset = VersementKamil.objects.all().order_by('-date_versement')
    serializer_class = VersementKamilSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['progression', 'membre', 'statut', 'methode_paiement']

    def get_queryset(self):
        qs = VersementKamil.objects.all().select_related(
            'membre', 'progression', 'progression__chapitre', 'progression__kamil'
        ).order_by('-date_versement')
        if not (self.request.user.is_staff or self.request.user.role in ['admin', 'jewrin']):
            qs = qs.filter(membre=self.request.user)
        return qs

    def get_permissions(self):
        # Membres peuvent créer, admins/jewrins peuvent valider/refuser/supprimer
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        progression_id = self.request.data.get('progression')
        progression = get_object_or_404(ProgressionLecture, id=progression_id)
        # Vérifier que le membre est bien celui de la progression
        if progression.membre != self.request.user and self.request.user.role not in ['admin', 'jewrin']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez pas verser pour cette assignation.")
        # Vérifier que le montant ne dépasse pas le reste à payer
        montant = self.request.data.get('montant', 0)
        if float(montant) > float(progression.reste_a_payer):
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'montant': f"Le montant ne peut pas dépasser le reste à payer ({progression.reste_a_payer} FCFA)."})
        serializer.save(membre=self.request.user)

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        """Admin/Jewrin valide un versement"""
        if request.user.role not in ['admin', 'jewrin'] and not request.user.is_staff:
            return Response({'detail': 'Non autorisé'}, status=403)
        versement = self.get_object()
        if versement.statut == 'valide':
            return Response({'detail': 'Ce versement est déjà validé.'}, status=400)
        from django.utils import timezone
        versement.statut = 'valide'
        versement.valide_par = request.user
        versement.date_validation = timezone.now()
        versement.save()
        # Mettre à jour le montant_verse de la progression
        progression = versement.progression
        total_verse = VersementKamil.objects.filter(
            progression=progression, statut='valide'
        ).aggregate(total=Sum('montant'))['total'] or 0
        progression.montant_verse = total_verse
        progression.save(update_fields=['montant_verse'])
        return Response(VersementKamilSerializer(versement).data)

    @action(detail=True, methods=['post'])
    def refuser(self, request, pk=None):
        """Admin/Jewrin refuse un versement"""
        if request.user.role not in ['admin', 'jewrin'] and not request.user.is_staff:
            return Response({'detail': 'Non autorisé'}, status=403)
        versement = self.get_object()
        if versement.statut != 'en_attente':
            return Response({'detail': 'Ce versement ne peut plus être modifié.'}, status=400)
        from django.utils import timezone
        versement.statut = 'refuse'
        versement.valide_par = request.user
        versement.date_validation = timezone.now()
        versement.commentaire = request.data.get('commentaire', '')
        versement.save()
        return Response(VersementKamilSerializer(versement).data)

    @action(detail=False, methods=['get'])
    def mes_stats(self, request):
        """Statistiques de versement pour le membre connecté"""
        user = request.user
        progressions = ProgressionLecture.objects.filter(membre=user, montant_assigne__gt=0)
        total_assigne = progressions.aggregate(total=Sum('montant_assigne'))['total'] or 0
        total_verse = progressions.aggregate(total=Sum('montant_verse'))['total'] or 0
        reste_global = total_assigne - total_verse
        pourcentage_global = round((total_verse / total_assigne) * 100, 1) if total_assigne > 0 else 0
        versements = VersementKamil.objects.filter(membre=user)
        nb_versements = versements.count()
        nb_en_attente = versements.filter(statut='en_attente').count()
        nb_valides = versements.filter(statut='valide').count()
        return Response({
            'total_assigne': total_assigne,
            'total_verse': total_verse,
            'reste_global': reste_global,
            'pourcentage_global': pourcentage_global,
            'nb_versements': nb_versements,
            'nb_en_attente': nb_en_attente,
            'nb_valides': nb_valides,
            'nb_assignations': progressions.count(),
        })
