from django.db.models import Sum

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import IsAdminOrJewrinOrganisation, AuditedModelViewSet, log_audit

from .models import (
    TypeReunion, Reunion, ProcesVerbal, Decision, Vote,
    StructureOrganisation, RapportActivite, Materiel,
    EvenementOrganise, JourneeEvenement, KourelInvite,
)
from .serializers import (
    TypeReunionSerializer, ReunionSerializer, ProcesVerbalSerializer,
    DecisionSerializer, VoteSerializer, StructureOrganisationSerializer,
    RapportActiviteSerializer, MaterielSerializer,
    EvenementOrganiseSerializer, JourneeEvenementSerializer, KourelInviteSerializer,
)


class TypeReunionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TypeReunion.objects.all()
    serializer_class = TypeReunionSerializer
    permission_classes = [IsAuthenticated]


class ReunionViewSet(AuditedModelViewSet):
    queryset = Reunion.objects.select_related('organisateur', 'type_reunion').all().order_by('-date_reunion')
    serializer_class = ReunionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['statut', 'type_reunion']
    audit_rubrique = 'organisation'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        instance = serializer.save(organisateur=self.request.user)
        log_audit(self.request, 'creation', rubrique=self.audit_rubrique, objet=instance,
                  description=f"Réunion créée : {instance}")
        return instance


class ProcesVerbalViewSet(AuditedModelViewSet):
    queryset = ProcesVerbal.objects.all().order_by('-date_redaction')
    serializer_class = ProcesVerbalSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['statut']
    audit_rubrique = 'organisation'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        return [IsAuthenticated()]


class DecisionViewSet(AuditedModelViewSet):
    queryset = Decision.objects.all().order_by('-date_proposition')
    serializer_class = DecisionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['statut', 'pv', 'reunion']
    audit_rubrique = 'organisation'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        instance = serializer.save(propose_par=self.request.user)
        log_audit(self.request, 'creation', rubrique=self.audit_rubrique, objet=instance,
                  description=f"Décision proposée : {instance}")
        return instance


class VoteViewSet(AuditedModelViewSet):
    queryset = Vote.objects.all().order_by('-date_ouverture')
    serializer_class = VoteSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['statut', 'decision']
    audit_rubrique = 'organisation'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        instance = serializer.save(lance_par=self.request.user)
        log_audit(self.request, 'creation', rubrique=self.audit_rubrique, objet=instance,
                  description=f"Vote lancé : {instance}")
        return instance


class StructureOrganisationViewSet(AuditedModelViewSet):
    queryset = StructureOrganisation.objects.all().order_by('ordre', 'nom')
    serializer_class = StructureOrganisationSerializer
    permission_classes = [IsAuthenticated]
    audit_rubrique = 'organisation'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        return [IsAuthenticated()]


class RapportActiviteViewSet(AuditedModelViewSet):
    queryset = RapportActivite.objects.all().order_by('-date_fin')
    serializer_class = RapportActiviteSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['periode']
    audit_rubrique = 'organisation'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        instance = serializer.save(redige_par=self.request.user)
        log_audit(self.request, 'creation', rubrique=self.audit_rubrique, objet=instance,
                  description=f"Rapport d'activité créé : {instance}")
        return instance


class MaterielViewSet(AuditedModelViewSet):
    queryset = Materiel.objects.all().order_by('module', 'nom')
    serializer_class = MaterielSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['module', 'categorie']
    audit_rubrique = 'organisation'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def stats(self, request):
        module = request.query_params.get('module', None)
        qs = self.get_queryset()
        if module:
            qs = qs.filter(module=module)
        aggregates = qs.aggregate(
            total_quantite=Sum('quantite_totale'),
            total_disponible=Sum('quantite_disponible'),
            total_defectueuse=Sum('quantite_defectueuse'),
        )
        total_quantite = aggregates['total_quantite'] or 0
        total_disponible = aggregates['total_disponible'] or 0
        total_defectueuse = aggregates['total_defectueuse'] or 0
        pourcentage_disponible = round(100 * total_disponible / total_quantite, 1) if total_quantite else 0

        par_categorie_by_label = {}
        categories = qs.values_list('categorie', flat=True).distinct()
        for cat in categories:
            cat_label = (cat or '').strip() or 'Non classé'
            sub = qs.filter(categorie=cat)
            agg = sub.aggregate(
                total=Sum('quantite_totale'),
                disponible=Sum('quantite_disponible'),
                defectueuse=Sum('quantite_defectueuse'),
            )
            t = agg['total'] or 0
            d = agg['disponible'] or 0
            defect = agg['defectueuse'] or 0
            nb = sub.count()
            if cat_label in par_categorie_by_label:
                prev = par_categorie_by_label[cat_label]
                prev['total_quantite'] += t
                prev['total_disponible'] += d
                prev['total_defectueuse'] += defect
                prev['nb_types'] += nb
            else:
                par_categorie_by_label[cat_label] = {
                    'categorie': cat_label,
                    'nb_types': nb,
                    'total_quantite': t,
                    'total_disponible': d,
                    'total_defectueuse': defect,
                    'pourcentage_disponible': 0,
                }
        for row in par_categorie_by_label.values():
            t = row['total_quantite']
            row['pourcentage_disponible'] = round(100 * row['total_disponible'] / t, 1) if t else 0
        par_categorie = list(par_categorie_by_label.values())

        return Response({
            'total_types': qs.count(),
            'total_quantite': total_quantite,
            'total_disponible': total_disponible,
            'total_defectueuse': total_defectueuse,
            'pourcentage_disponible': pourcentage_disponible,
            'par_categorie': par_categorie,
        })


class EvenementOrganiseViewSet(AuditedModelViewSet):
    queryset = EvenementOrganise.objects.all()
    serializer_class = EvenementOrganiseSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['type_evenement', 'annee']
    audit_rubrique = 'organisation'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        log_audit(self.request, 'creation', rubrique=self.audit_rubrique, objet=instance,
                  description=f"Événement créé : {instance}")
        return instance


class JourneeEvenementViewSet(AuditedModelViewSet):
    queryset = JourneeEvenement.objects.select_related('evenement').prefetch_related('kourels_invites__kourel').all()
    serializer_class = JourneeEvenementSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['evenement']
    audit_rubrique = 'organisation'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        return [IsAuthenticated()]


class KourelInviteViewSet(AuditedModelViewSet):
    queryset = KourelInvite.objects.select_related('journee', 'kourel').all()
    serializer_class = KourelInviteSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['journee', 'kourel']
    audit_rubrique = 'organisation'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinOrganisation()]
        return [IsAuthenticated()]
