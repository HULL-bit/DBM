from rest_framework import generics, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny, BasePermission
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Count, Q

from .models import (
    Groupe, Evenement, ParticipationEvenement, Publication, Annonce, GalerieMedia,
    NewsPost, NewsImage, NewsLike, NewsBookmark, NewsComment,
)
from apps.communication.push import send_push_to_user
from .serializers import (
    GroupeSerializer, EvenementSerializer, ParticipationEvenementSerializer, PublicationSerializer, AnnonceSerializer, GalerieMediaSerializer,
    NewsPostSerializer, NewsCommentSerializer,
)


class IsAdminOrJewrinCommunication(BasePermission):
    def has_permission(self, request, view):
        u = getattr(request, 'user', None)
        if not u or not getattr(u, 'is_authenticated', False):
            return False
        role = (getattr(u, 'role', '') or '').lower()
        return u.is_staff or role == 'admin' or role == 'jewrine_communication'


class GroupeViewSet(viewsets.ModelViewSet):
    queryset = Groupe.objects.filter(est_actif=True)
    serializer_class = GroupeSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]


class EvenementViewSet(viewsets.ModelViewSet):
    queryset = Evenement.objects.select_related('cree_par').filter(est_publie=True).order_by('-date_debut')
    serializer_class = EvenementSerializer
    filterset_fields = ['type_evenement', 'est_publie']

    def get_queryset(self):
        qs = Evenement.objects.select_related('cree_par').all().order_by('-date_debut')
        if not (self.request.user.is_staff or self.request.user.role == 'admin'):
            qs = qs.filter(est_publie=True)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        evt = serializer.save(cree_par=self.request.user)

        # Notifier tous les membres de la daara via la passerelle (WhatsApp / SMS)
        from apps.accounts.models import CustomUser
        from django.conf import settings

        if getattr(settings, "PUSH_ENABLED", False):
            membres = CustomUser.objects.filter(is_active=True).only('id', 'first_name', 'last_name', 'username', 'telephone')
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


class PublicationViewSet(viewsets.ModelViewSet):
    queryset = Publication.objects.filter(est_publiee=True).order_by('-date_publication')
    serializer_class = PublicationSerializer
    filterset_fields = ['categorie', 'est_publiee']

    def get_queryset(self):
        qs = Publication.objects.all().order_by('-date_publication')
        if not (self.request.user.is_staff or self.request.user.role == 'admin'):
            qs = qs.filter(est_publiee=True)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)


class AnnonceViewSet(viewsets.ModelViewSet):
    queryset = Annonce.objects.filter(est_active=True).order_by('-date_publication')
    serializer_class = AnnonceSerializer
    filterset_fields = ['priorite', 'est_active']

    def get_queryset(self):
        qs = Annonce.objects.all().order_by('-date_publication')
        if not (self.request.user.is_staff or self.request.user.role == 'admin'):
            qs = qs.filter(est_active=True)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)


class GalerieMediaViewSet(viewsets.ModelViewSet):
    queryset = GalerieMedia.objects.all().order_by('-date_upload')
    serializer_class = GalerieMediaSerializer
    filterset_fields = ['type_media', 'evenement']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]


class NewsPostViewSet(viewsets.ModelViewSet):
    serializer_class = NewsPostSerializer
    queryset = NewsPost.objects.all()
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

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
        u = self.request.user
        role = (getattr(u, 'role', '') or '').lower()
        can_manage = u.is_staff or role == 'admin' or role == 'jewrine_communication'
        if not can_manage:
            qs = qs.filter(est_publie=True)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinCommunication()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        post = serializer.save(auteur=request.user)

        images = request.FILES.getlist('images') or []
        if images:
            batch = [NewsImage(post=post, image=f, ordre=i) for i, f in enumerate(images)]
            NewsImage.objects.bulk_create(batch)

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
