from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from apps.accounts.permissions import (
    IsAdminOrJewrinScientifique, has_admin_access,
    AuditedModelViewSet, AuditedReadOnlyModelViewSet, log_audit,
)

from .models import DomaineScientifique, Cours, ModuleCours, LeconCours, InscriptionCours, OuvrageScientifique, PublicationScientifique
from .serializers import DomaineScientifiqueSerializer, CoursSerializer, ModuleCoursSerializer, LeconCoursSerializer, InscriptionCoursSerializer, OuvrageScientifiqueSerializer, PublicationScientifiqueSerializer


class DomaineScientifiqueViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DomaineScientifique.objects.all()
    serializer_class = DomaineScientifiqueSerializer
    permission_classes = [IsAuthenticated]


class CoursViewSet(AuditedModelViewSet):
    queryset = Cours.objects.filter(statut='publie').order_by('-date_creation')
    serializer_class = CoursSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['statut', 'niveau', 'domaine']
    audit_rubrique = 'scientifique'

    def get_queryset(self):
        qs = Cours.objects.all().order_by('-date_creation')
        if not has_admin_access(self.request.user, 'scientifique'):
            qs = qs.filter(statut='publie')
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinScientifique()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        instance = serializer.save(formateur=self.request.user)
        log_audit(self.request, 'creation', rubrique=self.audit_rubrique, objet=instance,
                  description=f"Cours créé : {instance}")
        return instance

    @action(detail=True, methods=['post'])
    def s_inscrire(self, request, pk=None):
        cours = self.get_object()
        insc, created = InscriptionCours.objects.get_or_create(cours=cours, apprenant=request.user)
        if not created:
            return Response({'detail': 'Déjà inscrit'}, status=400)
        return Response({'detail': 'Inscription enregistrée'}, status=201)


class ModuleCoursViewSet(AuditedModelViewSet):
    queryset = ModuleCours.objects.all().order_by('cours', 'ordre')
    serializer_class = ModuleCoursSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['cours']
    audit_rubrique = 'scientifique'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinScientifique()]
        return [IsAuthenticated()]


class LeconCoursViewSet(AuditedModelViewSet):
    queryset = LeconCours.objects.all().order_by('module', 'ordre')
    serializer_class = LeconCoursSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['module']
    audit_rubrique = 'scientifique'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinScientifique()]
        return [IsAuthenticated()]


class InscriptionCoursViewSet(AuditedReadOnlyModelViewSet):
    queryset = InscriptionCours.objects.all()
    serializer_class = InscriptionCoursSerializer
    permission_classes = [IsAuthenticated]
    audit_rubrique = 'scientifique'

    def get_queryset(self):
        qs = InscriptionCours.objects.all().select_related('cours', 'apprenant')
        if not (self.request.user.is_staff or self.request.user.role == 'admin'):
            qs = qs.filter(apprenant=self.request.user)
        return qs


class OuvrageScientifiqueViewSet(AuditedModelViewSet):
    queryset = OuvrageScientifique.objects.all().order_by('-date_ajout')
    serializer_class = OuvrageScientifiqueSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['domaine']
    audit_rubrique = 'scientifique'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinScientifique()]
        return [IsAuthenticated()]


class PublicationScientifiqueViewSet(AuditedModelViewSet):
    queryset = PublicationScientifique.objects.all().order_by('-annee')
    serializer_class = PublicationScientifiqueSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['type_publication', 'domaine', 'annee']
    audit_rubrique = 'scientifique'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinScientifique()]
        return [IsAuthenticated()]
