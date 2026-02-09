from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from .models import Message, CategorieForum, SujetForum, ReponseForum, Notification
from .serializers import MessageSerializer, CategorieForumSerializer, SujetForumSerializer, ReponseForumSerializer, NotificationSerializer


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.none()
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Message.objects.filter(Q(expediteur=user) | Q(destinataire=user)).order_by('-date_envoi')

    @action(detail=False, methods=['get'])
    def destinataires(self, request):
        """Liste des utilisateurs que l'utilisateur connecté peut choisir comme destinataires (tous les membres, côté membre ou admin)."""
        from apps.accounts.models import CustomUser
        user = request.user
        qs = CustomUser.objects.filter(is_active=True).exclude(id=user.id).order_by('first_name', 'last_name')
        return Response([
            {'id': u.id, 'first_name': u.first_name or '', 'last_name': u.last_name or '', 'email': u.email or ''}
            for u in qs
        ])

    def create(self, request, *args, **kwargs):
        destinataires = request.data.get('destinataires')
        if isinstance(destinataires, list) and len(destinataires) > 0:
            expediteur = request.user
            sujet = request.data.get('sujet', '')
            contenu = request.data.get('contenu', '')
            fichier_joint = request.FILES.get('fichier_joint')
            from apps.accounts.models import CustomUser
            created = []
            for uid in destinataires:
                user = CustomUser.objects.filter(id=uid).first()
                if user and user.id != expediteur.id:
                    msg = Message.objects.create(
                        expediteur=expediteur,
                        destinataire=user,
                        sujet=sujet,
                        contenu=contenu,
                        fichier_joint=fichier_joint,
                    )
                    created.append(MessageSerializer(msg).data)
            if not created:
                return Response(
                    {'detail': 'Aucun destinataire valide.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response(created[0] if len(created) == 1 else {'detail': f'{len(created)} messages envoyés.', 'count': len(created)}, status=status.HTTP_201_CREATED)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(expediteur=self.request.user)

    @action(detail=True, methods=['post'])
    def marquer_lu(self, request, pk=None):
        """Marquer un message comme lu par le destinataire."""
        msg = self.get_object()
        if msg.destinataire != request.user:
            return Response({'detail': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        if not msg.est_lu:
            from django.utils import timezone
            msg.est_lu = True
            msg.date_lecture = timezone.now()
            msg.save(update_fields=['est_lu', 'date_lecture'])
        return Response(MessageSerializer(msg).data)


class CategorieForumViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CategorieForum.objects.filter(est_active=True)
    serializer_class = CategorieForumSerializer
    permission_classes = [IsAuthenticated]


class SujetForumViewSet(viewsets.ModelViewSet):
    queryset = SujetForum.objects.all().order_by('-est_epingle', '-date_modification')
    serializer_class = SujetForumSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['categorie', 'est_epingle']

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)


class ReponseForumViewSet(viewsets.ModelViewSet):
    queryset = ReponseForum.objects.all().order_by('date_creation')
    serializer_class = ReponseForumSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['sujet', 'auteur']

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.none()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.all().order_by('-date_creation')
        if not (self.request.user.is_staff or self.request.user.role == 'admin'):
            qs = qs.filter(utilisateur=self.request.user)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        utilisateurs = request.data.get('utilisateurs')
        if isinstance(utilisateurs, list) and len(utilisateurs) > 0 and (request.user.is_staff or getattr(request.user, 'role', None) == 'admin'):
            from apps.accounts.models import CustomUser
            type_notification = request.data.get('type_notification', 'info')
            titre = request.data.get('titre', '')
            message = request.data.get('message', '')
            lien = request.data.get('lien', '')
            created = []
            for uid in utilisateurs:
                target = CustomUser.objects.filter(id=uid).first()
                if target:
                    notif = Notification.objects.create(
                        utilisateur=target,
                        type_notification=type_notification,
                        titre=titre,
                        message=message,
                        lien=lien or '',
                    )
                    created.append(NotificationSerializer(notif).data)
            if not created:
                return Response(
                    {'detail': 'Aucun destinataire valide.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response(created[0] if len(created) == 1 else {'detail': f'{len(created)} notifications créées.', 'count': len(created)}, status=status.HTTP_201_CREATED)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        utilisateur_id = self.request.data.get('utilisateur')
        if utilisateur_id and (self.request.user.is_staff or self.request.user.role == 'admin'):
            from apps.accounts.models import CustomUser
            user = CustomUser.objects.filter(id=utilisateur_id).first()
            serializer.save(utilisateur=user or self.request.user)
        else:
            serializer.save(utilisateur=self.request.user)

    @action(detail=True, methods=['post'])
    def marquer_lue(self, request, pk=None):
        notif = self.get_object()
        from django.utils import timezone
        notif.est_lue = True
        notif.date_lecture = timezone.now()
        notif.save()
        return Response(NotificationSerializer(notif).data)
