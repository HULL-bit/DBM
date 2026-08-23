from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from apps.accounts.permissions import IsAdminOrJewrinCommunication, has_admin_access, has_rubrique_access

from .models import Message, CategorieForum, SujetForum, ReponseForum, Notification, Canal, MembreCanal, MessageCanal, AbonnementPush
from .push import send_push_to_user
from .serializers import (
    MessageSerializer, CategorieForumSerializer, SujetForumSerializer, ReponseForumSerializer, NotificationSerializer,
    CanalSerializer, MembreCanalSerializer, MessageCanalSerializer, AbonnementPushSerializer,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cle_publique_push(request):
    return Response({'cle_publique': getattr(settings, 'VAPID_PUBLIC_KEY', '')})


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def abonnement_push(request):
    """POST : enregistre (ou met à jour) l'abonnement push du navigateur courant.
    DELETE : désabonne ce navigateur (envoyer `endpoint` dans le corps)."""
    endpoint = request.data.get('endpoint')
    if not endpoint:
        return Response({'detail': 'endpoint requis.'}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        AbonnementPush.objects.filter(endpoint=endpoint).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    keys = request.data.get('keys', {})
    cle_p256dh = keys.get('p256dh') or request.data.get('cle_p256dh')
    cle_auth = keys.get('auth') or request.data.get('cle_auth')
    if not cle_p256dh or not cle_auth:
        return Response({'detail': 'Clés p256dh/auth requises.'}, status=status.HTTP_400_BAD_REQUEST)

    abo, _ = AbonnementPush.objects.update_or_create(
        endpoint=endpoint,
        defaults={'user': request.user, 'cle_p256dh': cle_p256dh, 'cle_auth': cle_auth},
    )
    return Response(AbonnementPushSerializer(abo).data, status=status.HTTP_201_CREATED)


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.none()
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy pour faire un soft delete au lieu d'une suppression physique."""
        instance = self.get_object()
        user = request.user
        
        # Vérifier que l'utilisateur est soit l'expéditeur soit le destinataire
        if instance.expediteur != user and instance.destinataire != user:
            return Response({'detail': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        
        # Marquer comme archivé selon le rôle de l'utilisateur
        if instance.expediteur == user:
            instance.est_archive_expediteur = True
            instance.save(update_fields=['est_archive_expediteur'])
        elif instance.destinataire == user:
            instance.est_archive_destinataire = True
            instance.save(update_fields=['est_archive_destinataire'])
        
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        user = self.request.user
        # Filtrer par contact si fourni dans les query params
        contact_id = self.request.query_params.get('contact_id')
        base = Message.objects.select_related('expediteur', 'destinataire')
        if contact_id:
            try:
                contact_id_int = int(contact_id)
                return base.filter(
                    Q(expediteur=user, destinataire_id=contact_id_int, est_archive_expediteur=False) |
                    Q(expediteur_id=contact_id_int, destinataire=user, est_archive_destinataire=False)
                ).order_by('date_envoi')
            except (ValueError, TypeError):
                pass
        return base.filter(
            Q(expediteur=user, est_archive_expediteur=False) |
            Q(destinataire=user, est_archive_destinataire=False)
        ).order_by('-date_envoi')
    
    def get_object(self):
        """Surcharger get_object pour permettre l'accès aux messages même lors de la suppression."""
        user = self.request.user
        pk = self.kwargs.get('pk')
        try:
            # Pour la suppression, permettre l'accès même si le message est archivé par l'autre utilisateur
            # mais toujours vérifier que l'utilisateur est soit l'expéditeur soit le destinataire
            return Message.objects.filter(
                Q(pk=pk) & (Q(expediteur=user) | Q(destinataire=user))
            ).get()
        except Message.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('Message non trouvé.')

    @action(detail=False, methods=['get'])
    def destinataires(self, request):
        """Liste de tous les membres de la daara que l'utilisateur connecté peut choisir comme destinataires."""
        from apps.accounts.models import CustomUser
        user = request.user
        # Utiliser seulement is_active car est_actif peut ne pas être défini pour tous les utilisateurs
        qs = CustomUser.objects.filter(is_active=True).exclude(id=user.id).order_by('first_name', 'last_name')
        result = []
        for u in qs:
            photo = None
            photo_updated_at = None
            try:
                if u.photo:
                    photo = str(u.photo)
                    photo_updated_at = u.photo_updated_at.isoformat() if u.photo_updated_at else None
            except Exception:
                photo = None
                photo_updated_at = None
            
            result.append({
                'id': u.id,
                'first_name': u.first_name or '',
                'last_name': u.last_name or '',
                'email': u.email or '',
                'photo': photo,
                'photo_updated_at': photo_updated_at,
                'full_name': u.get_full_name() or f'{u.first_name or ""} {u.last_name or ""}'.strip() or u.email or f'Utilisateur #{u.id}'
            })
        return Response(result)
    
    @action(detail=False, methods=['get'])
    def conversations(self, request):
        """Liste de tous les membres de la daara comme contacts (avec qui l'utilisateur a échangé ou non)."""
        from apps.accounts.models import CustomUser
        from django.db.models import Q
        
        user = request.user
        
        try:
            # Récupérer tous les utilisateurs avec qui on a échangé
            messages_sent = Message.objects.filter(expediteur=user).values_list('destinataire_id', flat=True).distinct()
            messages_received = Message.objects.filter(destinataire=user).values_list('expediteur_id', flat=True).distinct()
            contact_ids = set(list(messages_sent) + list(messages_received))
        except Exception:
            contact_ids = set()
        
        # Récupérer TOUS les membres actifs de la daara pour permettre de communiquer avec n'importe qui
        # Utiliser seulement is_active car est_actif peut ne pas être défini pour tous les utilisateurs
        try:
            all_users = list(CustomUser.objects.filter(is_active=True).exclude(id=user.id).order_by('first_name', 'last_name'))
        except Exception as e:
            # En cas d'erreur, retourner une liste vide plutôt que de planter
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Erreur lors de la récupération des utilisateurs: {e}")
            return Response([])
        
        conversations = []
        for contact in all_users:
            # Récupérer le dernier message avec ce contact (non archivé)
            last_message = Message.objects.filter(
                Q(expediteur=user, destinataire=contact, est_archive_expediteur=False) | 
                Q(expediteur=contact, destinataire=user, est_archive_destinataire=False)
            ).order_by('-date_envoi').first()
            
            # Compter les messages non lus de ce contact (non archivés)
            unread_count = Message.objects.filter(
                expediteur=contact,
                destinataire=user,
                est_lu=False,
                est_archive_destinataire=False
            ).count()
            
            contact_name = contact.get_full_name() or f'{contact.first_name or ""} {contact.last_name or ""}'.strip() or contact.email or f'Utilisateur #{contact.id}'
            
            # Gérer la photo de manière sécurisée - retourner le nom du fichier pour que le frontend construise l'URL
            contact_photo = None
            contact_photo_updated_at = None
            try:
                if contact.photo:
                    # Retourner le chemin relatif du fichier (ex: photos_membres/xxx.jpg)
                    contact_photo = str(contact.photo)
                    contact_photo_updated_at = contact.photo_updated_at.isoformat() if contact.photo_updated_at else None
            except Exception as e:
                contact_photo = None
                contact_photo_updated_at = None
            
            # Sérialiser le dernier message si disponible
            last_message_data = None
            if last_message:
                try:
                    last_message_data = MessageSerializer(last_message).data
                except Exception as e:
                    last_message_data = None
            
            conversations.append({
                'contact_id': contact.id,
                'contact_name': contact_name,
                'contact_email': contact.email or '',
                'contact_photo': contact_photo,
                'contact_photo_updated_at': contact_photo_updated_at,
                'last_message': last_message_data,
                'unread_count': unread_count,
                'has_conversation': contact.id in contact_ids,
            })
        
        # Trier par dernier message (conversations avec messages en premier)
        # Les conversations avec messages récents apparaissent en premier
        try:
            def sort_key(x):
                if x['last_message'] and x['last_message'].get('date_envoi'):
                    return (x['last_message']['date_envoi'], x['has_conversation'])
                elif x['has_conversation']:
                    return ('', True)
                else:
                    return ('', False)
            
            conversations.sort(key=sort_key, reverse=True)
        except Exception as e:
            # En cas d'erreur de tri, retourner quand même les conversations non triées
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Erreur lors du tri des conversations: {e}")
        
        return Response(conversations)

    def create(self, request, *args, **kwargs):
        # Gérer les destinataires depuis request.data (peut être une liste ou une valeur multiple depuis FormData)
        destinataires = request.data.get('destinataires')
        if not destinataires:
            return Response(
                {'detail': 'Destinataires requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Si c'est une liste depuis JSON, utiliser directement
        # Si c'est depuis FormData, getlist() retourne une liste
        if not isinstance(destinataires, list):
            # Si c'est une valeur unique depuis FormData
            if hasattr(request.data, 'getlist'):
                destinataires = request.data.getlist('destinataires')
            else:
                destinataires = [destinataires]
        
        # Normaliser: convertir en liste d'entiers uniques
        destinataires_ids = []
        for uid in destinataires:
            try:
                uid_int = int(uid)
                if uid_int not in destinataires_ids:
                    destinataires_ids.append(uid_int)
            except (ValueError, TypeError):
                continue
        
        if len(destinataires_ids) == 0:
            return Response(
                {'detail': 'Au moins un destinataire valide requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        expediteur = request.user
        sujet = request.data.get('sujet', '')
        contenu = request.data.get('contenu', '')
        fichier_joint = request.FILES.get('fichier_joint')
        
        from apps.accounts.models import CustomUser
        import os
        from django.core.files.base import ContentFile
        
        # Si un fichier est fourni, lire son contenu une seule fois
        contenu_fichier = None
        nom_original = None
        if fichier_joint:
            fichier_joint.seek(0)
            contenu_fichier = fichier_joint.read()
            nom_original = fichier_joint.name
        
        created = []
        # Créer un message pour chaque destinataire unique
        for uid_int in destinataires_ids:
            # Ne pas permettre d'envoyer un message à soi-même
            if uid_int == expediteur.id:
                continue
            
            user = CustomUser.objects.filter(id=uid_int, is_active=True).first()
            if not user:
                continue
            
            # Si un fichier est fourni, créer une copie pour chaque message
            fichier_copie = None
            if contenu_fichier and nom_original:
                # Créer un nouveau fichier avec un nom unique
                nom_base, extension = os.path.splitext(nom_original)
                nouveau_nom = f"{nom_base}_{uid_int}{extension}"
                fichier_copie = ContentFile(contenu_fichier, name=nouveau_nom)
            
            # Créer un seul message pour ce destinataire
            msg = Message.objects.create(
                expediteur=expediteur,
                destinataire=user,
                sujet=sujet,
                contenu=contenu,
                fichier_joint=fichier_copie,
            )
            created.append(MessageSerializer(msg).data)

        if created:
            from .notifications import creer_notifications
            creer_notifications(
                destinataires_ids, 'message', f"Nouveau message de {expediteur.get_full_name()}",
                (sujet or contenu or '')[:200], lien='/communication/messagerie'
            )

        if not created:
            return Response(
                {'detail': 'Aucun destinataire valide.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Si un seul message a été créé, retourner directement l'objet
        # Sinon, retourner un résumé avec le nombre de messages créés
        if len(created) == 1:
            return Response(created[0], status=status.HTTP_201_CREATED)
        else:
            return Response({
                'detail': f'{len(created)} messages envoyés.',
                'count': len(created),
                'messages': created
            }, status=status.HTTP_201_CREATED)

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

    @action(detail=False, methods=['post'], url_path='marquer_conversation_lue')
    def marquer_conversation_lue(self, request):
        """Marquer tous les messages non lus d'une conversation (contact_id) comme lus en une requête."""
        contact_id = request.data.get('contact_id')
        if contact_id is None:
            return Response({'detail': 'contact_id requis.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            contact_id = int(contact_id)
        except (TypeError, ValueError):
            return Response({'detail': 'contact_id invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        from django.utils import timezone
        now = timezone.now()
        updated = Message.objects.filter(
            expediteur_id=contact_id,
            destinataire=request.user,
            est_lu=False,
        ).update(est_lu=True, date_lecture=now)
        return Response({'detail': f'{updated} message(s) marqué(s) comme lu(s).', 'count': updated})
    
    @action(detail=True, methods=['post'], url_path='supprimer')
    def supprimer(self, request, pk=None):
        """Supprimer un message (soft delete). L'expéditeur peut supprimer de son côté, le destinataire du sien."""
        msg = self.get_object()
        user = request.user
        
        # Vérifier que l'utilisateur est soit l'expéditeur soit le destinataire
        if msg.expediteur != user and msg.destinataire != user:
            return Response({'detail': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        
        # Marquer comme archivé selon le rôle de l'utilisateur
        if msg.expediteur == user:
            msg.est_archive_expediteur = True
            msg.save(update_fields=['est_archive_expediteur'])
        elif msg.destinataire == user:
            msg.est_archive_destinataire = True
            msg.save(update_fields=['est_archive_destinataire'])
        
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


def _est_gestionnaire_canal(canal, user):
    """Le créateur du canal, un membre marqué admin de ce canal, ou un utilisateur ayant
    les droits de gestion sur la rubrique communication (admin/jewrin/jewrine_communication)."""
    if canal.cree_par_id == user.id:
        return True
    if MembreCanal.objects.filter(canal=canal, user=user, est_admin_canal=True).exists():
        return True
    return has_admin_access(user, 'communication')


class CanalViewSet(viewsets.ModelViewSet):
    serializer_class = CanalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if has_admin_access(self.request.user, 'communication'):
            return Canal.objects.filter(est_actif=True).distinct().order_by('-date_creation')
        return Canal.objects.filter(
            membres_canal__user=self.request.user, est_actif=True
        ).distinct().order_by('-date_creation')

    def update(self, request, *args, **kwargs):
        canal = self.get_object()
        if not _est_gestionnaire_canal(canal, request.user):
            return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        # Créer un canal est un droit accordé par l'admin (rubrique communication, action creer) :
        # pas ouvert à tout membre par défaut, comme les autres actions de gestion.
        if not has_rubrique_access(request.user, 'communication', 'creer'):
            return Response(
                {'detail': "Vous n'avez pas la permission de créer un canal."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        canal = serializer.save(cree_par=self.request.user)
        MembreCanal.objects.create(canal=canal, user=self.request.user, est_admin_canal=True)
        membres_ids = self.request.data.get('membres', [])
        if isinstance(membres_ids, str):
            membres_ids = [membres_ids]
        for uid in membres_ids or []:
            try:
                uid_int = int(uid)
            except (TypeError, ValueError):
                continue
            if uid_int == self.request.user.id:
                continue
            from apps.accounts.models import CustomUser
            membre = CustomUser.objects.filter(id=uid_int, is_active=True).first()
            if membre:
                MembreCanal.objects.get_or_create(canal=canal, user=membre)

    def destroy(self, request, *args, **kwargs):
        canal = self.get_object()
        if not _est_gestionnaire_canal(canal, request.user):
            return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        canal.est_actif = False
        canal.save(update_fields=['est_actif'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='ajouter-membres')
    def ajouter_membres(self, request, pk=None):
        canal = self.get_object()
        if not _est_gestionnaire_canal(canal, request.user):
            return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        from apps.accounts.models import CustomUser
        membres_ids = request.data.get('membres', [])
        ajoutes = []
        for uid in membres_ids:
            try:
                uid_int = int(uid)
            except (TypeError, ValueError):
                continue
            membre = CustomUser.objects.filter(id=uid_int, is_active=True).first()
            if membre:
                _, created = MembreCanal.objects.get_or_create(canal=canal, user=membre)
                if created:
                    ajoutes.append(membre.get_full_name())
        return Response(CanalSerializer(canal, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='retirer-membre')
    def retirer_membre(self, request, pk=None):
        canal = self.get_object()
        if not _est_gestionnaire_canal(canal, request.user):
            return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        membre_id = request.data.get('membre')
        if membre_id == canal.cree_par_id:
            return Response({'detail': 'Impossible de retirer le créateur du canal.'}, status=status.HTTP_400_BAD_REQUEST)
        MembreCanal.objects.filter(canal=canal, user_id=membre_id).delete()
        return Response(CanalSerializer(canal, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='demarrer-reunion')
    def demarrer_reunion(self, request, pk=None):
        """Génère un lien de visioconférence Jitsi Meet pour ce canal (aucun serveur à héberger,
        utilise le service public meet.jit.si) et prévient les membres via un message système."""
        import uuid
        canal = self.get_object()
        if not MembreCanal.objects.filter(canal=canal, user=request.user).exists():
            return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        room = f"DBM-{canal.id}-{uuid.uuid4().hex[:10]}"
        canal.lien_reunion = f"https://meet.jit.si/{room}"
        canal.save(update_fields=['lien_reunion'])
        MessageCanal.objects.create(
            canal=canal, expediteur=request.user, type_message='texte',
            contenu=f"📹 {request.user.get_full_name()} a démarré une réunion vidéo : {canal.lien_reunion}",
        )
        return Response(CanalSerializer(canal, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='terminer-reunion')
    def terminer_reunion(self, request, pk=None):
        canal = self.get_object()
        if not MembreCanal.objects.filter(canal=canal, user=request.user).exists():
            return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        canal.lien_reunion = ''
        canal.save(update_fields=['lien_reunion'])
        return Response(CanalSerializer(canal, context={'request': request}).data)


class MessageCanalViewSet(viewsets.ModelViewSet):
    serializer_class = MessageCanalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = MessageCanal.objects.filter(
            canal__membres_canal__user=self.request.user
        ).exclude(masque_pour=self.request.user).select_related('expediteur', 'canal').distinct().order_by('date_envoi')
        canal_id = self.request.query_params.get('canal')
        if canal_id:
            qs = qs.filter(canal_id=canal_id)
        apres = self.request.query_params.get('apres')
        if apres:
            try:
                qs = qs.filter(id__gt=int(apres))
            except (TypeError, ValueError):
                pass
        return qs

    def perform_create(self, serializer):
        canal = serializer.validated_data.get('canal')
        if canal is None or not MembreCanal.objects.filter(canal=canal, user=self.request.user).exists():
            raise PermissionDenied("Vous n'êtes pas membre de ce canal.")
        msg = serializer.save(expediteur=self.request.user)

        from .notifications import creer_notifications
        autres_membres = MembreCanal.objects.filter(canal=canal).exclude(user=self.request.user).values_list('user_id', flat=True)
        aperçu = msg.contenu[:200] if msg.contenu else f"[{msg.get_type_message_display()}]"
        creer_notifications(
            list(autres_membres), 'message', f"{self.request.user.get_full_name()} dans « {canal.nom} »",
            aperçu, lien='/communication/canaux'
        )

    def destroy(self, request, *args, **kwargs):
        """Suppression pour tout le monde : réservée à l'auteur du message ou à un
        gestionnaire du canal (voir `masquer` pour une suppression côté membre uniquement)."""
        message = self.get_object()
        if message.expediteur_id != request.user.id and not _est_gestionnaire_canal(message.canal, request.user):
            return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def masquer(self, request, pk=None):
        """Supprime ce message uniquement du côté du membre courant : il reste visible pour
        les autres membres du canal (équivalent « Supprimer pour moi »)."""
        message = self.get_object()
        message.masque_pour.add(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.none()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Chaque utilisateur (y compris admin) ne voit que ses propres notifications = 1 message reçu par membre
        return Notification.objects.filter(utilisateur=self.request.user).select_related('utilisateur').order_by('-date_creation')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrJewrinCommunication()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """Créer une notification (accessible à quiconque a déjà passé get_permissions() ci-dessus,
        donc admin/jewrin/jewrine_communication ou un membre explicitement autorisé sur la
        rubrique 'communication' — pas seulement is_staff/role=='admin').

        Trois modes, portés par `destinataires` (liste d'IDs utilisateur) :
        - absent/vide : envoyée à tous les membres actifs (notification générale)
        - fourni : envoyée uniquement à ces membres (sélection manuelle, ou résolue côté
          frontend à partir des membres d'un canal ciblé)
        """
        from apps.accounts.models import CustomUser
        type_notification = request.data.get('type_notification', 'info')
        titre = (request.data.get('titre') or '').strip()
        message = request.data.get('message', '')
        lien = request.data.get('lien', '')
        destinataires = request.data.get('destinataires')  # attendu: liste d'IDs
        if not message:
            return Response({'detail': 'Message requis.'}, status=status.HTTP_400_BAD_REQUEST)
        if not titre:
            titre = dict(Notification.TYPE_CHOICES).get(type_notification, 'Notification')

        # Si une liste explicite de destinataires est fournie, on la respecte
        user_ids = None
        if isinstance(destinataires, (list, tuple)):
            # Nettoyer / caster en int et enlever les doublons
            cleaned_ids = []
            for v in destinataires:
                try:
                    cleaned_ids.append(int(v))
                except (TypeError, ValueError):
                    continue
            cleaned_ids = list(sorted(set(cleaned_ids)))
            if cleaned_ids:
                user_ids = list(
                    CustomUser.objects.filter(is_active=True, id__in=cleaned_ids)
                    .values_list('id', flat=True)
                )

        # Sinon, fallback : tous les utilisateurs actifs = tous les membres (notification générale)
        if user_ids is None:
            user_ids = list(CustomUser.objects.filter(is_active=True).values_list('id', flat=True))

        if not user_ids:
            return Response(
                {'detail': 'Aucun membre à notifier.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from .notifications import creer_notifications
        creer_notifications(user_ids, type_notification, titre, message, lien=lien or '')
        nb_membres = len(user_ids)

        # En plus du push navigateur (ci-dessus) : passerelle WhatsApp/SMS pour les types
        # à forte importance, vers les membres sélectionnés / tous les membres actifs.
        if type_notification in ['evenement', 'systeme', 'finance']:
            utilisateurs = CustomUser.objects.filter(id__in=user_ids).only('id', 'first_name', 'last_name', 'username', 'telephone')
            texte = f"[{type_notification.upper()}] {titre}\n\n{message}"
            if lien:
                texte += f"\n\nPlus d'infos : {lien}"
            for u in utilisateurs:
                send_push_to_user(u, texte, contexte='notification')

        return Response(
            {'detail': f'1 message envoyé à {nb_membres} membre(s).', 'count': nb_membres},
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def marquer_lue(self, request, pk=None):
        notif = self.get_object()
        from django.utils import timezone
        notif.est_lue = True
        notif.date_lecture = timezone.now()
        notif.save()
        return Response(NotificationSerializer(notif).data)
