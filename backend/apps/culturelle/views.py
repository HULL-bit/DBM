from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count
from apps.accounts.permissions import IsAdminOrJewrinCulturelle, has_admin_access

from .models import (
    Kamil, Chapitre, Jukki, ProgressionLecture, ActiviteReligieuse, Enseignement, VersementKamil,
    AssignationTere, Bind, Laaj,
)
from .serializers import (
    KamilSerializer, ChapitreSerializer, JukkiSerializer, ProgressionLectureSerializer,
    ActiviteReligieuseSerializer, EnseignementSerializer, VersementKamilSerializer,
    AssignationTereSerializer, BindSerializer, LaajSerializer,
)

User = get_user_model()


class KamilViewSet(viewsets.ModelViewSet):
    queryset = Kamil.objects.filter(statut='actif').order_by('-date_creation')
    serializer_class = KamilSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['statut']

    def get_queryset(self):
        return Kamil.objects.all().prefetch_related('jukkis').order_by('-date_creation')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'assigner_jukkis']:
            return [IsAdminOrJewrinCulturelle()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        kamil = serializer.save(cree_par=self.request.user)
        for i in range(1, 31):
            Jukki.objects.create(kamil=kamil, numero=i)

    @action(detail=True, methods=['patch'])
    def assigner_jukkis(self, request, pk=None):
        """Assigner les membres aux JUKKIs. Payload: { "assignations": { "1": membre_id, "2": membre_id, ... } }"""
        kamil = self.get_object()
        assignations = request.data.get('assignations', {})
        membres_notifies = set()
        for numero_str, membre_id in assignations.items():
            try:
                numero = int(numero_str)
                if 1 <= numero <= 30:
                    Jukki.objects.filter(kamil=kamil, numero=numero).update(
                        membre_id=membre_id if membre_id else None
                    )
                    if membre_id:
                        membres_notifies.add(int(membre_id))
            except (ValueError, TypeError):
                continue
        kamil.refresh_from_db()

        if membres_notifies:
            from apps.communication.notifications import creer_notifications
            creer_notifications(
                membres_notifies, 'kamil', f"JUKKI assigné — {kamil.titre}",
                "Un JUKKI vous a été assigné dans le programme Kamil. Consultez vos JUKKI pour le lire.",
                lien='/culturelle/mes-progressions'
            )

        return Response(KamilSerializer(kamil).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrJewrinCulturelle])
    def recommencer(self, request, pk=None):
        """Réinitialise tous les JUKKI du Kamil : chaque membre devra revalider. Incrémente nb_lectures."""
        kamil = self.get_object()
        Jukki.objects.filter(kamil=kamil).update(est_valide=False, date_validation=None)
        kamil.nb_lectures = (kamil.nb_lectures or 0) + 1
        kamil.save(update_fields=['nb_lectures'])
        kamil.refresh_from_db()
        return Response(KamilSerializer(kamil).data)


class ChapitreViewSet(viewsets.ModelViewSet):
    queryset = Chapitre.objects.all().order_by('kamil', 'numero')
    serializer_class = ChapitreSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['kamil', 'est_publie']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinCulturelle()]
        return [IsAuthenticated()]


class JukkiViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Jukki.objects.all().select_related('kamil', 'membre').order_by('kamil', 'numero')
    serializer_class = JukkiSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['kamil', 'membre', 'est_valide']

    def get_queryset(self):
        qs = Jukki.objects.all().select_related('kamil', 'membre').order_by('kamil', 'numero')
        if not has_admin_access(self.request.user, 'culturelle'):
            qs = qs.filter(membre=self.request.user)
        return qs

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        """Le membre marque son JUKKI comme lu/validé."""
        jukki = self.get_object()
        if jukki.membre != request.user:
            return Response({'detail': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        if jukki.est_valide:
            return Response({'detail': 'Déjà validé.'}, status=status.HTTP_400_BAD_REQUEST)
        from django.utils import timezone
        jukki.est_valide = True
        jukki.date_validation = timezone.now()
        jukki.save(update_fields=['est_valide', 'date_validation'])
        return Response(JukkiSerializer(jukki).data)

    @action(detail=False, methods=['get'])
    def mes_jukkis(self, request):
        """JUKKIs assignés au membre connecté."""
        qs = Jukki.objects.filter(membre=request.user).select_related('kamil').order_by('kamil', 'numero')
        serializer = JukkiSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], permission_classes=[IsAdminOrJewrinCulturelle])
    def changer_statut(self, request, pk=None):
        """Admin change le statut de validation d'un JUKKI."""
        jukki = self.get_object()
        est_valide = request.data.get('est_valide')
        if est_valide is None:
            return Response({'detail': 'est_valide requis'}, status=status.HTTP_400_BAD_REQUEST)
        from django.utils import timezone
        jukki.est_valide = bool(est_valide)
        if est_valide:
            jukki.date_validation = timezone.now()
        else:
            jukki.date_validation = None
        jukki.save(update_fields=['est_valide', 'date_validation'])
        return Response(JukkiSerializer(jukki).data)


class ProgressionLectureViewSet(viewsets.ModelViewSet):
    queryset = ProgressionLecture.objects.all().order_by('membre', 'kamil', 'chapitre__numero')
    serializer_class = ProgressionLectureSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['membre', 'kamil', 'chapitre', 'statut']

    def get_queryset(self):
        qs = ProgressionLecture.objects.all().select_related('membre', 'kamil', 'chapitre').order_by('membre', 'kamil', 'chapitre__numero')
        if not has_admin_access(self.request.user, 'culturelle'):
            qs = qs.filter(membre=self.request.user)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]  # Admin/Jewrin pour assignations, membre uniquement via marquer_comme_lu
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        # Admin/Jewrin peut assigner un juzz à un membre ; sinon l'assignation est pour soi
        if has_admin_access(self.request.user, 'culturelle') and self.request.data.get('membre'):
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
        if not has_admin_access(request.user, 'culturelle'):
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
        if not has_admin_access(request.user, 'culturelle'):
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
            return [IsAdminOrJewrinCulturelle()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(animateur=self.request.user)


class AssignationTereViewSet(viewsets.ModelViewSet):
    """Majaaliss : assignation d'un membre à un TERE (livre)."""
    queryset = AssignationTere.objects.all().order_by('membre', '-date_assignation')
    serializer_class = AssignationTereSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['membre', 'statut']

    def get_queryset(self):
        qs = AssignationTere.objects.all().select_related('membre', 'assigne_par').prefetch_related('binds').order_by('membre', '-date_assignation')
        if not has_admin_access(self.request.user, 'culturelle'):
            qs = qs.filter(membre=self.request.user)
        return qs

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy', 'terminer', 'reprendre', 'assigner_multiple']:
            return [IsAdminOrJewrinCulturelle()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        # Admin/jewrine_culturelle peut assigner un TERE à un membre précis ; sinon (le membre
        # lui-même) l'assignation est pour soi — auto-service parmi les TERE proposés.
        if has_admin_access(self.request.user, 'culturelle') and self.request.data.get('membre'):
            membre = get_object_or_404(User, id=self.request.data.get('membre'))
        else:
            membre = self.request.user
        assignation = serializer.save(membre=membre, assigne_par=self.request.user)
        from apps.communication.notifications import creer_notifications
        creer_notifications(
            [membre.id], 'majaaliss', 'Nouveau TERE assigné — Majaaliss',
            f"Vous avez été assigné(e) au TERE « {assignation.nom_tere} ».",
            lien='/culturelle/majaaliss'
        )

    @action(detail=True, methods=['post'])
    def terminer(self, request, pk=None):
        """Le responsable culturelle marque le TERE comme terminé pour ce membre."""
        assignation = self.get_object()
        if assignation.statut == 'termine':
            return Response({'detail': 'Ce TERE est déjà marqué terminé.'}, status=400)
        from django.utils import timezone
        assignation.statut = 'termine'
        assignation.date_fin = timezone.now()
        assignation.save(update_fields=['statut', 'date_fin'])
        return Response(AssignationTereSerializer(assignation).data)

    @action(detail=True, methods=['post'])
    def reprendre(self, request, pk=None):
        """Rouvre un TERE marqué terminé (le responsable culturelle peut alors ajouter d'autres BIND)."""
        assignation = self.get_object()
        if assignation.statut == 'en_cours':
            return Response({'detail': 'Ce TERE est déjà en cours.'}, status=400)
        assignation.statut = 'en_cours'
        assignation.date_fin = None
        assignation.save(update_fields=['statut', 'date_fin'])
        return Response(AssignationTereSerializer(assignation).data)

    @action(detail=False, methods=['post'], url_path='assigner-multiple')
    def assigner_multiple(self, request):
        """Assigner le même TERE (avec éventuellement le PDF du livre) à plusieurs membres en
        une seule fois. `membres` est une liste d'ids (JSON) envoyée en multipart si un PDF
        accompagne l'assignation."""
        import json
        from django.core.files.base import ContentFile

        membres_ids = request.data.get('membres', [])
        if isinstance(membres_ids, str):
            try:
                membres_ids = json.loads(membres_ids)
            except (ValueError, TypeError):
                membres_ids = []
        nom_tere = str(request.data.get('nom_tere', '')).strip()
        fichier_pdf = request.FILES.get('fichier_pdf')
        if not membres_ids or not isinstance(membres_ids, list):
            return Response({'detail': 'Veuillez sélectionner au moins un membre.'}, status=400)
        if not nom_tere:
            return Response({'detail': 'Nom du TERE requis.'}, status=400)

        created, skipped = [], 0
        for membre_id in membres_ids:
            membre = User.objects.filter(pk=membre_id, is_active=True).first()
            if not membre:
                continue
            deja_en_cours = AssignationTere.objects.filter(
                membre=membre, nom_tere__iexact=nom_tere, statut='en_cours'
            ).exists()
            if deja_en_cours:
                skipped += 1
                continue
            assignation = AssignationTere(membre=membre, nom_tere=nom_tere, assigne_par=request.user)
            if fichier_pdf:
                # Même fichier attaché à chaque assignation : on relit son contenu pour
                # chaque membre (le pointeur de fichier est déjà consommé après la 1ère sauvegarde).
                fichier_pdf.seek(0)
                assignation.fichier_pdf.save(fichier_pdf.name, ContentFile(fichier_pdf.read()), save=False)
            assignation.save()
            created.append(assignation)

        if created:
            from apps.communication.notifications import creer_notifications
            creer_notifications(
                [a.membre_id for a in created], 'majaaliss', 'Nouveau TERE assigné — Majaaliss',
                f"Vous avez été assigné(e) au TERE « {nom_tere} ».",
                lien='/culturelle/majaaliss'
            )
        return Response({
            'created_count': len(created),
            'skipped_count': skipped,
            'assignations': AssignationTereSerializer(created, many=True).data,
        }, status=status.HTTP_201_CREATED)


class BindViewSet(viewsets.ModelViewSet):
    """BIND successifs d'une assignation TERE (Majaaliss)."""
    queryset = Bind.objects.all().order_by('assignation', 'numero')
    serializer_class = BindSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['assignation']

    def get_queryset(self):
        qs = Bind.objects.all().select_related('assignation', 'assignation__membre', 'cree_par').order_by('assignation', 'numero')
        if not has_admin_access(self.request.user, 'culturelle'):
            qs = qs.filter(assignation__membre=self.request.user)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinCulturelle()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        assignation_id = self.request.data.get('assignation')
        assignation = get_object_or_404(AssignationTere, id=assignation_id)
        # Un TERE marqué terminé reste modifiable (le responsable culturelle peut ajouter un
        # BIND oublié ou corriger a posteriori) — aucun blocage sur le statut ici.
        prochain_numero = assignation.binds.count() + 1
        bind = serializer.save(assignation=assignation, numero=prochain_numero, cree_par=self.request.user)
        from apps.communication.notifications import creer_notifications
        creer_notifications(
            [assignation.membre_id], 'majaaliss', f"Nouveau BIND {bind.numero} — {assignation.nom_tere}",
            f"Un nouveau BIND vous a été transmis pour le TERE « {assignation.nom_tere} ».",
            lien='/culturelle/majaaliss'
        )


class LaajViewSet(viewsets.ModelViewSet):
    """LAAJ : questions religieuses des membres et réponses du responsable culturelle."""
    queryset = Laaj.objects.all().order_by('-date_question')
    serializer_class = LaajSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['membre', 'statut']

    def get_queryset(self):
        qs = Laaj.objects.all().select_related('membre', 'repondu_par').order_by('-date_question')
        if not has_admin_access(self.request.user, 'culturelle'):
            qs = qs.filter(membre=self.request.user)
        return qs

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy', 'repondre']:
            return [IsAdminOrJewrinCulturelle()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(membre=self.request.user)

    @action(detail=True, methods=['post'])
    def repondre(self, request, pk=None):
        """Le responsable culturelle répond à la question, par écrit et/ou par vocal."""
        laaj = self.get_object()
        reponse = str(request.data.get('reponse', '')).strip()
        reponse_audio = request.FILES.get('reponse_audio')
        if not reponse and not reponse_audio:
            return Response({'detail': 'Écrivez une réponse ou joignez un vocal.'}, status=400)
        from django.utils import timezone
        laaj.reponse = reponse
        if reponse_audio:
            laaj.reponse_audio = reponse_audio
        laaj.repondu_par = request.user
        laaj.date_reponse = timezone.now()
        laaj.statut = 'repondu'
        laaj.save()
        from apps.communication.notifications import creer_notifications
        creer_notifications(
            [laaj.membre_id], 'laaj', 'Votre LAAJ a reçu une réponse',
            'Le responsable culturelle a répondu à votre question.',
            lien='/culturelle/laaj'
        )
        return Response(LaajSerializer(laaj).data)


class EnseignementViewSet(viewsets.ModelViewSet):
    queryset = Enseignement.objects.all().order_by('-date_publication')
    serializer_class = EnseignementSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['categorie', 'auteur']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinCulturelle()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)


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
        if not has_admin_access(self.request.user, 'culturelle'):
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
        if progression.membre != self.request.user and not has_admin_access(self.request.user, 'culturelle'):
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
        if not has_admin_access(request.user, 'culturelle'):
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
        if not has_admin_access(request.user, 'culturelle'):
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
