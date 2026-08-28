from rest_framework import generics, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Count, Q

from .models import (
    Groupe, Evenement, EvenementLike, EvenementComment,
    ParticipationEvenement, Publication, Annonce, GalerieMedia,
    NewsPost, NewsImage, NewsLike, NewsBookmark, NewsComment,
)
from apps.accounts.permissions import IsAdminOrJewrinInformations, has_rubrique_access, log_audit
from apps.communication.push import send_push_to_user
from .serializers import (
    GroupeSerializer, EvenementSerializer, EvenementCommentSerializer, ParticipationEvenementSerializer,
    PublicationSerializer, AnnonceSerializer, GalerieMediaSerializer,
    NewsPostSerializer, NewsCommentSerializer,
)


def _detecter_type_media(fichier):
    content_type = getattr(fichier, 'content_type', '') or ''
    if content_type.startswith('video/'):
        return 'video'
    if content_type.startswith('audio/'):
        return 'audio'
    nom = (getattr(fichier, 'name', '') or '').lower()
    if nom.endswith(('.mp4', '.mov', '.webm', '.avi', '.mkv')):
        return 'video'
    if nom.endswith(('.mp3', '.wav', '.ogg', '.m4a')):
        return 'audio'
    return 'image'


class GroupeViewSet(viewsets.ModelViewSet):
    queryset = Groupe.objects.filter(est_actif=True)
    serializer_class = GroupeSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinInformations()]
        return [IsAuthenticated()]


class EvenementViewSet(viewsets.ModelViewSet):
    queryset = Evenement.objects.select_related('cree_par').filter(est_publie=True).order_by('-date_debut')
    serializer_class = EvenementSerializer
    filterset_fields = ['type_evenement', 'est_publie']
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = (
            Evenement.objects.select_related('cree_par')
            .prefetch_related('medias', 'likes')
            .annotate(nb_likes=Count('likes', distinct=True), nb_comments=Count('comments', distinct=True))
            .order_by('-date_debut')
        )
        if not has_rubrique_access(self.request.user, 'informations', 'gerer'):
            qs = qs.filter(est_publie=True)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinInformations()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        evt = serializer.save(cree_par=request.user)
        self._enregistrer_medias(evt, request)
        self._notifier_creation(evt)
        out = self.get_serializer(evt)
        return Response(out.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        resp = super().update(request, *args, **kwargs)
        if resp.status_code < 400:
            self._enregistrer_medias(self.get_object(), request)
            resp.data = self.get_serializer(self.get_object()).data
        return resp

    def _enregistrer_medias(self, evt, request):
        fichiers = request.FILES.getlist('medias') or []
        if fichiers:
            batch = [
                GalerieMedia(
                    titre=f"{evt.titre} — média {i + 1}",
                    type_media=_detecter_type_media(f),
                    fichier=f,
                    evenement=evt,
                    upload_par=request.user,
                )
                for i, f in enumerate(fichiers)
            ]
            GalerieMedia.objects.bulk_create(batch)

    def _notifier_creation(self, evt):
        from apps.accounts.models import CustomUser
        from django.conf import settings

        membres_ids = list(CustomUser.objects.filter(is_active=True).values_list('id', flat=True))

        # Notification in-app pour tous les membres actifs (indépendant de la passerelle externe)
        if evt.est_publie:
            from apps.communication.notifications import creer_notifications
            creer_notifications(
                membres_ids, 'evenement', f"Nouvel événement : {evt.titre}",
                evt.description or '', lien='/informations/evenements'
            )

        # Notifier tous les membres de la daara via la passerelle (WhatsApp / SMS), si configurée
        if getattr(settings, "PUSH_ENABLED", False):
            membres = CustomUser.objects.filter(id__in=membres_ids).only('id', 'first_name', 'last_name', 'username', 'telephone')
            texte = f"[EVENEMENT] {evt.titre}\n\n{evt.description or ''}"
            if getattr(evt, "date_debut", None) or getattr(evt, "lieu", None):
                details = []
                if getattr(evt, "date_debut", None):
                    details.append(f"Date : {evt.date_debut}")
                if getattr(evt, "lieu", None):
                    details.append(f"Lieu : {evt.lieu}")
                if details:
                    texte += "\n\n" + " | ".join(details)
            for m in membres:
                send_push_to_user(m, texte, contexte='evenement')

    @action(detail=True, methods=['post'])
    def s_inscrire(self, request, pk=None):
        evt = self.get_object()
        part, created = ParticipationEvenement.objects.get_or_create(evenement=evt, membre=request.user)
        if not created:
            return Response({'detail': 'Déjà inscrit'}, status=400)
        return Response({'detail': 'Inscription enregistrée'}, status=201)

    @action(detail=True, methods=['post'])
    def se_desinscrire(self, request, pk=None):
        evt = self.get_object()
        deleted, _ = ParticipationEvenement.objects.filter(evenement=evt, membre=request.user).delete()
        if not deleted:
            return Response({'detail': 'Non inscrit'}, status=400)
        return Response(status=204)

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        evt = self.get_object()
        EvenementLike.objects.get_or_create(evenement=evt, membre=request.user)
        return Response({'detail': 'OK'})

    @action(detail=True, methods=['post'])
    def unlike(self, request, pk=None):
        evt = self.get_object()
        EvenementLike.objects.filter(evenement=evt, membre=request.user).delete()
        return Response({'detail': 'OK'})

    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        evt = self.get_object()
        qs = EvenementComment.objects.filter(evenement=evt).select_related('membre').order_by('date_creation')
        return Response(EvenementCommentSerializer(qs, many=True).data)

    @action(detail=True, methods=['post'])
    def comment(self, request, pk=None):
        evt = self.get_object()
        texte = (request.data.get('texte') or '').strip()
        parent_id = request.data.get('parent')
        if not texte:
            return Response({'detail': 'Texte requis.'}, status=400)
        parent = EvenementComment.objects.filter(id=parent_id, evenement=evt).first() if parent_id else None
        c = EvenementComment.objects.create(evenement=evt, membre=request.user, parent=parent, texte=texte)
        return Response(EvenementCommentSerializer(c).data, status=201)


class PublicationViewSet(viewsets.ModelViewSet):
    queryset = Publication.objects.filter(est_publiee=True).order_by('-date_publication')
    serializer_class = PublicationSerializer
    filterset_fields = ['categorie', 'est_publiee']

    def get_queryset(self):
        qs = Publication.objects.all().order_by('-date_publication')
        if not has_rubrique_access(self.request.user, 'informations', 'gerer'):
            qs = qs.filter(est_publiee=True)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinInformations()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)


class AnnonceViewSet(viewsets.ModelViewSet):
    queryset = Annonce.objects.filter(est_active=True).order_by('-date_publication')
    serializer_class = AnnonceSerializer
    filterset_fields = ['priorite', 'est_active']

    def get_queryset(self):
        qs = Annonce.objects.all().order_by('-date_publication')
        if not has_rubrique_access(self.request.user, 'informations', 'gerer'):
            qs = qs.filter(est_active=True)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinInformations()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)


class GalerieMediaViewSet(viewsets.ModelViewSet):
    queryset = GalerieMedia.objects.all().order_by('-date_upload')
    serializer_class = GalerieMediaSerializer
    filterset_fields = ['type_media', 'evenement']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinInformations()]
        return [IsAuthenticated()]


class NewsPostViewSet(viewsets.ModelViewSet):
    serializer_class = NewsPostSerializer
    queryset = NewsPost.objects.all()
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ['auteur']

    def get_queryset(self):
        qs = (
            NewsPost.objects.select_related('auteur')
            .prefetch_related('images', 'likes', 'bookmarks')
            .annotate(
                nb_likes=Count('likes', distinct=True),
                nb_comments=Count('comments', distinct=True),
            )
            .order_by('-date_creation')
        )
        if not has_rubrique_access(self.request.user, 'informations', 'gerer'):
            qs = qs.filter(est_publie=True)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinInformations()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)

    def perform_destroy(self, instance):
        log_audit(self.request, 'suppression', rubrique='informations', objet=instance, description=f"Actualité supprimée : {instance.titre or instance.contenu[:50]}")
        instance.delete()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        post = serializer.save(auteur=request.user)

        images = request.FILES.getlist('images') or []
        if images:
            batch = [
                NewsImage(post=post, image=f, type_media=_detecter_type_media(f), ordre=i)
                for i, f in enumerate(images)
            ]
            NewsImage.objects.bulk_create(batch)

        log_audit(request, 'creation', rubrique='informations', objet=post, description=f"Actualité publiée : {post.titre or post.contenu[:50]}")
        out = self.get_serializer(post)
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        post = self.get_object()
        NewsLike.objects.get_or_create(post=post, membre=request.user)
        return Response({'detail': 'OK'})

    @action(detail=True, methods=['post'])
    def unlike(self, request, pk=None):
        post = self.get_object()
        NewsLike.objects.filter(post=post, membre=request.user).delete()
        return Response({'detail': 'OK'})

    @action(detail=True, methods=['post'])
    def bookmark(self, request, pk=None):
        post = self.get_object()
        NewsBookmark.objects.get_or_create(post=post, membre=request.user)
        return Response({'detail': 'OK'})

    @action(detail=True, methods=['post'])
    def unbookmark(self, request, pk=None):
        post = self.get_object()
        NewsBookmark.objects.filter(post=post, membre=request.user).delete()
        return Response({'detail': 'OK'})

    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        post = self.get_object()
        qs = NewsComment.objects.filter(post=post).select_related('membre').order_by('date_creation')
        return Response(NewsCommentSerializer(qs, many=True).data)

    @action(detail=True, methods=['post'])
    def comment(self, request, pk=None):
        post = self.get_object()
        texte = (request.data.get('texte') or request.data.get('text') or '').strip()
        parent_id = request.data.get('parent')
        if not texte:
            return Response({'detail': 'Texte requis.'}, status=400)
        parent = None
        if parent_id:
            parent = NewsComment.objects.filter(id=parent_id, post=post).first()
        c = NewsComment.objects.create(post=post, membre=request.user, parent=parent, texte=texte)
        return Response(NewsCommentSerializer(c).data, status=201)
