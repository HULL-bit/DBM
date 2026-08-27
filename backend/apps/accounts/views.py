from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view, permission_classes, parser_classes, authentication_classes
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.http import HttpResponse, Http404
import mimetypes

from .serializers import (
    UserSerializer, UserPublicSerializer, UserCreateSerializer, UserMeSerializer, BadgeSerializer, AttributionBadgeSerializer,
    BadgeMissionSerializer,
    MatricePermissionRoleSerializer, PermissionMembreOverrideSerializer, JournalAuditSerializer,
)
from .models import Badge, AttributionBadge, BadgeMission, CodeReinitialisation, MatricePermissionRole, PermissionMembreOverride, JournalAudit, RUBRIQUES
from .permissions import IsAdminRoleOrStaff, IsAdminOrComptesVoir, IsAdminOrComptesGerer, has_rubrique_access, log_audit

User = get_user_model()

# Réponse générique pour ne jamais révéler si un compte existe ou non.
_FORGOT_PASSWORD_GENERIC_RESPONSE = {
    'detail': "Si un compte correspond à ces informations, un code de réinitialisation vient d'être envoyé par email."
}


def _find_user_for_reset(identifiant):
    """Retrouve un utilisateur actif par username, email ou téléphone (formats variés acceptés)."""
    if not identifiant:
        return None
    identifiant = str(identifiant).strip()
    user = User.objects.filter(is_active=True, username__iexact=identifiant).first()
    if user:
        return user
    if '@' in identifiant:
        user = User.objects.filter(is_active=True, email__iexact=identifiant).first()
        if user:
            return user
    # Comparaison du téléphone en ne gardant que les chiffres, pour tolérer +221/espaces/tirets.
    chiffres = ''.join(ch for ch in identifiant if ch.isdigit())
    if len(chiffres) < 8:
        return None
    for candidat in User.objects.filter(is_active=True).exclude(telephone=''):
        if ''.join(ch for ch in candidat.telephone if ch.isdigit()).endswith(chiffres[-9:]):
            return candidat
    return None


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def mot_de_passe_oublie(request):
    """Étape 1 : envoie un code à usage unique par email au membre qui a oublié son mot de passe."""
    import random
    from datetime import timedelta

    identifiant = request.data.get('identifiant') or request.data.get('username') or request.data.get('email')
    user = _find_user_for_reset(identifiant)

    if user and user.email:
        # Anti-spam simple : pas plus d'un envoi par minute pour ce compte.
        recent = CodeReinitialisation.objects.filter(
            user=user, date_creation__gte=timezone.now() - timedelta(seconds=60)
        ).exists()
        if not recent:
            code = f"{random.randint(0, 999999):06d}"
            CodeReinitialisation.objects.create(
                user=user,
                code=code,
                date_expiration=timezone.now() + timedelta(minutes=10),
            )
            from django.core.mail import send_mail
            message = (
                f"Bonjour {user.first_name or user.username},\n\n"
                f"Voici votre code de réinitialisation de mot de passe : {code}\n"
                "Ce code est valable 10 minutes. Ne le partagez avec personne.\n\n"
                "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\n"
                "Daara Barakatul Mahaahidi"
            )
            send_mail(
                subject="Réinitialisation de votre mot de passe",
                message=message,
                from_email=None,
                recipient_list=[user.email],
                fail_silently=True,
            )

    # Réponse identique dans tous les cas (compte inexistant, sans email, ou envoi réussi)
    # pour ne pas laisser deviner quels comptes existent.
    return Response(_FORGOT_PASSWORD_GENERIC_RESPONSE)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def reinitialiser_mot_de_passe(request):
    """Étape 2 : vérifie le code reçu par WhatsApp et applique le nouveau mot de passe."""
    identifiant = request.data.get('identifiant') or request.data.get('username') or request.data.get('telephone')
    code = str(request.data.get('code', '')).strip()
    new_password = request.data.get('new_password', '')

    if not identifiant or not code or not new_password:
        return Response(
            {'detail': 'identifiant, code et new_password sont requis.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    if len(new_password) < 8:
        return Response(
            {'detail': 'Le nouveau mot de passe doit faire au moins 8 caractères.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = _find_user_for_reset(identifiant)
    if not user:
        return Response({'detail': 'Code invalide ou expiré.'}, status=status.HTTP_400_BAD_REQUEST)

    code_obj = CodeReinitialisation.objects.filter(
        user=user, utilise=False
    ).order_by('-date_creation').first()

    if not code_obj:
        return Response({'detail': 'Code invalide ou expiré.'}, status=status.HTTP_400_BAD_REQUEST)

    if not code_obj.est_valide:
        return Response({'detail': 'Code invalide ou expiré.'}, status=status.HTTP_400_BAD_REQUEST)

    if code_obj.code != code:
        code_obj.tentatives += 1
        code_obj.save(update_fields=['tentatives'])
        return Response({'detail': 'Code invalide ou expiré.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save(update_fields=['password'])
    code_obj.utilise = True
    code_obj.save(update_fields=['utilise'])
    log_audit(request, 'reset_mot_de_passe', objet=user, acteur=user, description=f"Mot de passe réinitialisé pour {user.username} via code email")

    return Response({'detail': 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.'})


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        request = self.context.get('request')
        try:
            data = super().validate(attrs)
        except Exception:
            if request is not None:
                username = attrs.get(self.username_field, '')
                log_audit(request, 'echec_connexion', description=f"Échec de connexion pour '{username}'", succes=False)
            raise
        data['user'] = UserMeSerializer(self.user).data
        if request is not None:
            log_audit(request, 'connexion', acteur=self.user, description=f"Connexion réussie pour {self.user.username}")
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def register(request):
    try:
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        import logging
        logging.getLogger(__name__).exception('Erreur lors de l\'inscription')
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def me(request):
    if request.method == 'GET':
        serializer = UserMeSerializer(request.user, context={'request': request})
        return Response(serializer.data)
    
    # Pour PATCH avec fichier (photo), DRF met les fichiers dans request.data directement
    # ou dans request.FILES selon le parser utilisé
    data = {}
    photo_file = None
    
    for key in request.data:
        value = request.data.get(key)
        if key == 'photo':
            # Vérifie si c'est un fichier (InMemoryUploadedFile ou TemporaryUploadedFile)
            if hasattr(value, 'read'):
                photo_file = value
        else:
            data[key] = value
    
    # Aussi vérifier request.FILES (au cas où)
    if not photo_file and request.FILES.get('photo'):
        photo_file = request.FILES.get('photo')
    
    if photo_file:
        data['photo'] = photo_file
    
    serializer = UserMeSerializer(request.user, data=data, partial=True, context={'request': request})
    if serializer.is_valid():
        user = serializer.save()
        if photo_file:
            from django.utils import timezone
            user.photo_updated_at = timezone.now()
            user.save(update_fields=['photo_updated_at'])
        # Recharger l'utilisateur pour avoir l'URL mise à jour
        user.refresh_from_db()
        return Response(UserMeSerializer(user, context={'request': request}).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    if not old_password or not new_password:
        return Response(
            {'detail': 'old_password et new_password requis'},
            status=status.HTTP_400_BAD_REQUEST
        )
    if not request.user.check_password(old_password):
        return Response(
            {'detail': 'Ancien mot de passe incorrect'},
            status=status.HTTP_400_BAD_REQUEST
        )
    if len(new_password) < 8:
        return Response(
            {'detail': 'Le nouveau mot de passe doit faire au moins 8 caractères'},
            status=status.HTTP_400_BAD_REQUEST
        )
    request.user.set_password(new_password)
    request.user.save(update_fields=['password'])
    return Response({'detail': 'Mot de passe modifié avec succès'})


class UserList(generics.ListAPIView):
    # Accessible à tout utilisateur authentifié (sélection de membres pour un canal, un
    # kourel, une notification, etc. — cf. demande "afficher tous les membres sans
    # exception dans les créations, quel que soit leur rôle"). Le niveau de détail
    # renvoyé dépend en revanche du droit sur la rubrique 'comptes' (voir
    # get_serializer_class) : seuls admin/staff ou un utilisateur explicitement
    # autorisé voient les données personnelles complètes (téléphone, adresse, etc.).
    queryset = User.objects.all().order_by('-date_inscription')
    permission_classes = [IsAuthenticated]
    filterset_fields = ['role', 'est_actif', 'cellule', 'groupe_sanguin', 'niveau_alquran', 'niveau_majalis']
    pagination_class = None  # Désactiver pagination pour afficher tous les membres

    def get_serializer_class(self):
        if has_rubrique_access(self.request.user, 'comptes', 'voir'):
            return UserSerializer
        return UserPublicSerializer


class UserDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAdminOrComptesGerer()]
        return [IsAdminOrComptesVoir()]
    
    def partial_update(self, request, *args, **kwargs):
        """Override pour s'assurer que la catégorie est bien sauvegardée"""
        instance = self.get_object()
        ancien_role = instance.role
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        nouveau_role = serializer.instance.role
        if 'role' in request.data and nouveau_role != ancien_role:
            log_audit(
                request, 'changement_role', objet=serializer.instance,
                description=f"Rôle de {serializer.instance.get_full_name()} changé de '{ancien_role}' à '{nouveau_role}'"
            )
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_admin(request):
    if not request.user.is_staff and request.user.role != 'admin':
        return Response({'detail': 'Non autorisé'}, status=403)
    from apps.accounts.models import CustomUser
    from apps.finance.models import CotisationMensuelle
    from apps.informations.models import Evenement

    now = timezone.now()
    annee = now.year
    mois = now.month

    # Aligné sur Gestion des membres : tous les utilisateurs actifs
    membres_actifs = CustomUser.objects.filter(is_active=True, est_actif=True).count()
    total_membres = CustomUser.objects.filter(is_active=True).count()
    # Cotisations du mois courant
    cotisations_total_ce_mois = CotisationMensuelle.objects.filter(annee=annee, mois=mois).count()
    cotisations_payees_ce_mois = CotisationMensuelle.objects.filter(
        annee=annee, mois=mois, statut='payee'
    ).count()
    if cotisations_total_ce_mois > 0:
        taux_paiement_cotisations_ce_mois = (cotisations_payees_ce_mois / cotisations_total_ce_mois) * 100
    else:
        taux_paiement_cotisations_ce_mois = 0.0

    # Global (toutes cotisations depuis le début)
    cotisations_total_global = CotisationMensuelle.objects.all().count()
    cotisations_payees_global = CotisationMensuelle.objects.filter(statut='payee').count()
    if cotisations_total_global > 0:
        taux_paiement_cotisations_global = (cotisations_payees_global / cotisations_total_global) * 100
    else:
        taux_paiement_cotisations_global = 0.0

    evenements_count = Evenement.objects.filter(est_publie=True).count()
    return Response({
        'membres_actifs': membres_actifs,
        'total_membres': total_membres,
        'cotisations_payees_ce_mois': cotisations_payees_ce_mois,
        'cotisations_total_ce_mois': cotisations_total_ce_mois,
        'taux_paiement_cotisations_ce_mois': round(taux_paiement_cotisations_ce_mois, 2),
        'cotisations_total_global': cotisations_total_global,
        'cotisations_payees_global': cotisations_payees_global,
        'taux_paiement_cotisations_global': round(taux_paiement_cotisations_global, 2),
        'evenements': evenements_count,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mes_badges(request):
    qs = AttributionBadge.objects.filter(user=request.user).select_related('badge')
    serializer = AttributionBadgeSerializer(qs, many=True)
    return Response(serializer.data)


class BadgeViewSet(viewsets.ModelViewSet):
    """Définitions de badges (nom, catégorie, points...) : consultables par tous, gérées
    (créer/modifier/supprimer) par l'admin ou un utilisateur autorisé sur 'comptes'."""
    queryset = Badge.objects.filter(est_actif=True).order_by('categorie', 'nom')
    serializer_class = BadgeSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method not in ['GET', 'HEAD', 'OPTIONS']:
            return [IsAdminOrComptesGerer()]
        return [IsAuthenticated()]


class BadgeMissionViewSet(viewsets.ModelViewSet):
    """Badges d'événement/mission (distincts des badges de récompense) : un membre voit ses
    propres badges, un utilisateur avec un droit de gestion sur 'comptes' (admin y compris)
    voit et gère ceux de tout le monde."""
    serializer_class = BadgeMissionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['membre']

    def get_queryset(self):
        qs = BadgeMission.objects.select_related('membre', 'cree_par').order_by('-date_evenement')
        if has_rubrique_access(self.request.user, 'comptes', 'voir'):
            return qs
        return qs.filter(membre=self.request.user)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrComptesGerer()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def photo_membre(request, user_id):
    """Sert la photo de profil d'un membre via l'API (et non /media/ directement).

    Utilisé pour l'export de la carte de membre / badge de mission en image ou PDF : lire
    les pixels d'une image cross-origin via canvas (html2canvas) exige des en-têtes CORS
    que /media/ ne garantit pas dans tous les environnements (stockage S3, hébergement sans
    CORS dédié...). Les appels à /api/ passent déjà de façon fiable par CORS_ALLOWED_ORIGINS
    pour tout le reste de l'application : on réutilise ce chemin plutôt que de dépendre de
    la configuration CORS du stockage média, qu'on ne contrôle pas toujours.
    La photo est déjà une donnée visible de tout utilisateur authentifié (via
    UserPublicSerializer) : aucune restriction d'accès supplémentaire ici.
    """
    membre = User.objects.filter(id=user_id).first()
    if not membre or not membre.photo or not membre.photo.name:
        raise Http404("Photo non disponible.")
    try:
        with membre.photo.storage.open(membre.photo.name, 'rb') as f:
            content = f.read()
    except Exception:
        raise Http404("Photo non accessible.")
    content_type = mimetypes.guess_type(membre.photo.name)[0] or 'image/jpeg'
    return HttpResponse(content, content_type=content_type)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def badges_membre(request, user_id):
    """GET : badges obtenus par ce membre — visible par lui-même, ou par un utilisateur
    ayant un droit de consultation sur la rubrique 'comptes' (admin y compris).
    POST : attribue un badge à ce membre — nécessite un droit de gestion sur 'comptes'."""
    membre = User.objects.filter(id=user_id).first()
    if not membre:
        return Response({'detail': 'Membre introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        if request.user.id != membre.id and not has_rubrique_access(request.user, 'comptes', 'voir'):
            return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        qs = AttributionBadge.objects.filter(user=membre).select_related('badge')
        return Response(AttributionBadgeSerializer(qs, many=True).data)

    if not has_rubrique_access(request.user, 'comptes', 'gerer'):
        return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
    badge = Badge.objects.filter(id=request.data.get('badge')).first()
    if not badge:
        return Response({'detail': 'Badge invalide.'}, status=status.HTTP_400_BAD_REQUEST)
    attribution, created = AttributionBadge.objects.get_or_create(
        user=membre, badge=badge, defaults={'raison': request.data.get('raison', '')}
    )
    if not created:
        return Response({'detail': 'Ce membre a déjà ce badge.'}, status=status.HTTP_400_BAD_REQUEST)

    from apps.communication.notifications import creer_notifications
    creer_notifications(
        [membre.id], 'systeme', 'Nouveau badge obtenu !',
        f"Vous avez obtenu le badge « {badge.nom} »." + (f" {attribution.raison}" if attribution.raison else '')
    )
    log_audit(request, 'modification', rubrique='comptes', objet=membre,
              description=f"Badge « {badge.nom} » attribué à {membre.get_full_name()}")
    return Response(AttributionBadgeSerializer(attribution).data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAdminOrComptesGerer])
def retirer_badge(request, attribution_id):
    """Retire un badge précédemment attribué à un membre."""
    attribution = AttributionBadge.objects.filter(id=attribution_id).select_related('user', 'badge').first()
    if not attribution:
        return Response(status=status.HTTP_204_NO_CONTENT)
    log_audit(request, 'modification', rubrique='comptes', objet=attribution.user,
              description=f"Badge « {attribution.badge.nom} » retiré à {attribution.user.get_full_name()}")
    attribution.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ──────────────────────────── Rôles & Permissions (RBAC) ────────────────────────────

_ROLES_MATRICE = [choix[0] for choix in User.ROLE_CHOICES if choix[0] != 'admin']
_RUBRIQUES_CODES = [code for code, _ in RUBRIQUES]

_DEFAULTS_PAR_ROLE = {
    'jewrin': {'peut_voir': True, 'peut_creer': True, 'peut_modifier': True, 'peut_supprimer': True, 'peut_valider': True},
    'membre': {'peut_voir': True, 'peut_creer': False, 'peut_modifier': False, 'peut_supprimer': False, 'peut_valider': False},
}


def _defaults_pour(role, rubrique):
    # 'comptes' expose des données personnelles (téléphone, adresse, numéro Wave...) :
    # contrairement aux autres rubriques, refusé par défaut pour tout le monde sauf admin
    # (qui contourne déjà la matrice). L'admin général doit l'activer explicitement.
    if rubrique == 'comptes':
        return {'peut_voir': False, 'peut_creer': False, 'peut_modifier': False, 'peut_supprimer': False, 'peut_valider': False}
    if role in _DEFAULTS_PAR_ROLE:
        return dict(_DEFAULTS_PAR_ROLE[role])
    # jewrine_<rubrique> : droits élargis sur SA rubrique, simple lecture sur les autres.
    if role.lower() == f'jewrine_{rubrique.lower()}':
        return {'peut_voir': True, 'peut_creer': True, 'peut_modifier': True, 'peut_supprimer': False, 'peut_valider': True}
    return {'peut_voir': True, 'peut_creer': False, 'peut_modifier': False, 'peut_supprimer': False, 'peut_valider': False}


def _ensure_matrice_complete():
    """Crée les lignes manquantes de la matrice (role x rubrique) avec des valeurs par défaut
    équivalentes au comportement historique codé en dur, pour que la grille affichée soit toujours
    complète."""
    existants = set(MatricePermissionRole.objects.values_list('role', 'rubrique'))
    a_creer = []
    for role in _ROLES_MATRICE:
        for rubrique in _RUBRIQUES_CODES:
            if (role, rubrique) not in existants:
                a_creer.append(MatricePermissionRole(role=role, rubrique=rubrique, **_defaults_pour(role, rubrique)))
    if a_creer:
        MatricePermissionRole.objects.bulk_create(a_creer)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAdminRoleOrStaff])
def rbac_matrice(request):
    """GET : renvoie la matrice complète rôle × rubrique (créée avec des valeurs par défaut si
    absente). PATCH : met à jour une ou plusieurs lignes. Payload PATCH attendu :
    { "lignes": [ { "id": 3, "peut_voir": true, "peut_creer": false, ... }, ... ] }"""
    _ensure_matrice_complete()

    if request.method == 'PATCH':
        lignes = request.data.get('lignes', [])
        champs = ['peut_voir', 'peut_creer', 'peut_modifier', 'peut_supprimer', 'peut_valider']
        maj = []
        for item in lignes:
            try:
                ligne = MatricePermissionRole.objects.get(id=item.get('id'))
            except (MatricePermissionRole.DoesNotExist, TypeError, ValueError):
                continue
            for champ in champs:
                if champ in item:
                    setattr(ligne, champ, bool(item[champ]))
            ligne.save()
            maj.append(ligne)
        log_audit(request, 'changement_permission', description=f"Matrice de permissions modifiée ({len(maj)} ligne(s))")

    qs = MatricePermissionRole.objects.all().order_by('role', 'rubrique')
    return Response(MatricePermissionRoleSerializer(qs, many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminRoleOrStaff])
def rbac_overrides(request):
    """GET ?membre=<id> : renvoie, pour ce membre, une ligne par rubrique (existante ou vide) —
    pratique pour afficher une grille complète d'exceptions côté frontend.
    POST : crée/modifie une exception. Si les 5 champs sont laissés à null, l'exception est
    supprimée (retour à l'héritage du rôle)."""
    if request.method == 'POST':
        membre_id = request.data.get('user')
        rubrique = request.data.get('rubrique')
        membre = User.objects.filter(id=membre_id).first()
        if not membre or rubrique not in _RUBRIQUES_CODES:
            return Response({'detail': 'membre ou rubrique invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        champs = ['peut_voir', 'peut_creer', 'peut_modifier', 'peut_supprimer', 'peut_valider']
        existant = PermissionMembreOverride.objects.filter(user=membre, rubrique=rubrique).first()
        # Ne modifier que les champs explicitement fournis dans la requête (mise à jour
        # partielle) : les champs absents du payload conservent leur valeur actuelle.
        valeurs = {}
        for c in champs:
            if c in request.data:
                v = request.data.get(c)
                valeurs[c] = None if v is None else bool(v)
            else:
                valeurs[c] = getattr(existant, c) if existant is not None else None

        if all(v is None for v in valeurs.values()):
            if existant is not None:
                existant.delete()
            log_audit(request, 'changement_permission', rubrique=rubrique, objet=membre,
                      description=f"Exception de permission supprimée pour {membre.get_full_name()}")
            return Response({'detail': 'Exception supprimée, retour aux droits du rôle.'})

        override, _ = PermissionMembreOverride.objects.update_or_create(
            user=membre, rubrique=rubrique, defaults=valeurs
        )
        log_audit(request, 'changement_permission', rubrique=rubrique, objet=membre,
                  description=f"Exception de permission modifiée pour {membre.get_full_name()}")
        return Response(PermissionMembreOverrideSerializer(override).data)

    membre_id = request.query_params.get('membre')
    membre = User.objects.filter(id=membre_id).first()
    if not membre:
        return Response({'detail': 'Paramètre membre requis.'}, status=status.HTTP_400_BAD_REQUEST)

    existantes = {o.rubrique: o for o in PermissionMembreOverride.objects.filter(user=membre)}
    resultat = []
    for code, libelle in RUBRIQUES:
        if code in existantes:
            resultat.append(PermissionMembreOverrideSerializer(existantes[code]).data)
        else:
            resultat.append({
                'id': None, 'user': membre.id, 'membre_nom': membre.get_full_name(),
                'rubrique': code, 'rubrique_display': libelle,
                'peut_voir': None, 'peut_creer': None, 'peut_modifier': None,
                'peut_supprimer': None, 'peut_valider': None, 'date_modification': None,
            })
    return Response(resultat)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mes_permissions(request):
    """Permissions effectives de l'utilisateur connecté, par rubrique — consommé par le frontend
    pour construire le menu et les gardes d'accès (Sidebar notamment)."""
    resultat = {}
    for code, _ in RUBRIQUES:
        resultat[code] = {
            'voir': has_rubrique_access(request.user, code, 'voir'),
            'gerer': has_rubrique_access(request.user, code, 'gerer'),
        }
    return Response(resultat)


def _filtrer_journal_audit(request):
    qs = JournalAudit.objects.select_related('utilisateur').all()
    utilisateur_id = request.query_params.get('utilisateur')
    action = request.query_params.get('action')
    rubrique = request.query_params.get('rubrique')
    date_debut = request.query_params.get('date_debut')
    date_fin = request.query_params.get('date_fin')
    if utilisateur_id:
        qs = qs.filter(utilisateur_id=utilisateur_id)
    if action:
        qs = qs.filter(action=action)
    if rubrique:
        qs = qs.filter(rubrique=rubrique)
    if date_debut:
        qs = qs.filter(date__gte=date_debut)
    if date_fin:
        qs = qs.filter(date__lte=date_fin)
    return qs


@api_view(['GET', 'DELETE'])
@permission_classes([IsAdminRoleOrStaff])
def journal_audit(request):
    """GET : journal de sécurité/traçabilité, filtrable par utilisateur/action/rubrique/dates.
    DELETE : purge les entrées correspondant aux mêmes filtres (irréversible)."""
    qs = _filtrer_journal_audit(request)

    if request.method == 'DELETE':
        nb = qs.count()
        qs.delete()
        log_audit(request, 'suppression', description=f"Purge du journal de sécurité ({nb} entrée(s))")
        return Response({'detail': f'{nb} entrée(s) supprimée(s).'})

    from rest_framework.pagination import PageNumberPagination
    paginator = PageNumberPagination()
    paginator.page_size = 50
    page = paginator.paginate_queryset(qs, request)
    return paginator.get_paginated_response(JournalAuditSerializer(page, many=True).data)


@api_view(['GET'])
@permission_classes([IsAdminRoleOrStaff])
def journal_audit_export(request):
    """Export du journal de sécurité (mêmes filtres que journal_audit) en Excel ou PDF."""
    from django.http import HttpResponse
    from .audit_export import export_audit_excel, export_audit_pdf

    qs = _filtrer_journal_audit(request).order_by('-date')
    # 'export_format' et non 'format' : réservé par DRF pour choisir un renderer
    # (json/api) — une valeur inconnue comme 'pdf' fait échouer la négociation de
    # contenu avec un Http404, avant même la vérification des permissions.
    fmt = request.query_params.get('export_format', 'excel').lower()

    if fmt == 'pdf':
        buf = export_audit_pdf(qs)
        content_type, ext = 'application/pdf', 'pdf'
    else:
        buf = export_audit_excel(qs)
        content_type, ext = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'

    if buf is None:
        return Response({'detail': 'Erreur de génération du journal.'}, status=500)

    resp = HttpResponse(buf.read(), content_type=content_type)
    resp['Content-Disposition'] = f'attachment; filename="journal_securite.{ext}"'
    return resp
