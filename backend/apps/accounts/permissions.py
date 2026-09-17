from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser, BasePermission
from rest_framework.response import Response


class IsAdminRoleOrStaff(IsAdminUser):
    """
    Autorise l'accès si l'utilisateur est staff Django
    OU s'il a role='admin' dans notre modèle CustomUser.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        # is_staff (admin Django) ou role logique 'admin'
        return bool(user.is_staff or getattr(user, "role", None) == "admin")


def _override_value(override, field):
    """Lit un champ nullable d'une exception membre : None = pas d'exception sur ce champ."""
    return getattr(override, field) if override is not None else None


def has_rubrique_access(user, rubrique, action='gerer'):
    """
    Vérifie si un utilisateur a un droit donné sur une rubrique, dans cet ordre de priorité :
    1. Exception explicite pour ce membre (PermissionMembreOverride) sur ce champ précis.
    2. Matrice configurée pour son rôle (MatricePermissionRole), si elle existe pour cette rubrique.
    3. Repli sur l'ancienne logique codée en dur (admin/jewrin/jewrine_<rubrique>), utilisée tant
       que l'admin n'a pas encore configuré la matrice pour cette rubrique — garantit qu'aucun
       déploiement existant ne perd l'accès du jour au lendemain.

    action : 'voir' | 'creer' | 'modifier' | 'supprimer' | 'valider' | 'gerer'
             'gerer' = a un droit d'administration quelconque (creer OU modifier OU supprimer OU valider),
             c'est l'équivalent de l'ancien has_admin_access().
    """
    if not user or not user.is_authenticated:
        return False

    # Admin global / staff Django : accès total à tout, toujours.
    if user.is_staff or getattr(user, "role", None) == "admin":
        return True

    role = getattr(user, "role", None)
    if not role:
        return False

    from .models import PermissionMembreOverride, MatricePermissionRole

    champs_geres = ['peut_creer', 'peut_modifier', 'peut_supprimer', 'peut_valider']

    override = PermissionMembreOverride.objects.filter(user=user, rubrique=rubrique).first()
    matrice = MatricePermissionRole.objects.filter(role=role, rubrique=rubrique).first()

    def repli_code_en_dur():
        if role == 'jewrin':
            return True
        if role.lower() == f"jewrine_{rubrique.lower()}":
            return True
        # 'voir' est ouvert par défaut à tout membre authentifié (comportement historique :
        # permission_classes=[IsAuthenticated] sur la lecture dans la quasi-totalité des vues).
        return action == 'voir'

    if action == 'gerer':
        if override is not None:
            valeurs = [_override_value(override, c) for c in champs_geres]
            valeurs_explicites = [v for v in valeurs if v is not None]
            if valeurs_explicites:
                if any(v is True for v in valeurs_explicites):
                    return True
                if all(v is False for v in valeurs_explicites) and len(valeurs_explicites) == len(champs_geres):
                    return False
        if matrice is not None:
            return any(getattr(matrice, c) for c in champs_geres)
        return repli_code_en_dur()

    champ = f'peut_{action}'
    if override is not None:
        val = _override_value(override, champ)
        if val is not None:
            return val
    if matrice is not None:
        return getattr(matrice, champ)
    return repli_code_en_dur()


def has_admin_access(user, rubrique):
    """
    Vérifie si un utilisateur a les droits admin sur une rubrique spécifique.
    Conservé pour compatibilité : équivalent à has_rubrique_access(user, rubrique, 'gerer').
    """
    return has_rubrique_access(user, rubrique, action='gerer')


class IsAdminOrComptesVoir(BasePermission):
    """Consultation de la fiche complète d'un membre (données personnelles incluses) :
    admin/staff, ou droit explicite 'voir' sur la rubrique 'comptes' (rôle ou exception
    par membre, configuré depuis Rôles & Permissions). Refusé par défaut sinon."""
    def has_permission(self, request, view):
        return has_rubrique_access(request.user, 'comptes', 'voir')


class IsAdminOrComptesGerer(BasePermission):
    """Création/modification/suppression d'un membre : admin/staff, ou droit explicite
    'gérer' sur la rubrique 'comptes'. Refusé par défaut sinon."""
    def has_permission(self, request, view):
        return has_rubrique_access(request.user, 'comptes', 'gerer')


class IsAdminOrJewrinRubrique(BasePermission):
    """
    Permission personnalisée qui autorise :
    - Les admins globaux
    - Les jewrins généraux
    - Les jewrins spécialisés pour la rubrique spécifiée
    """

    def __init__(self, rubrique):
        self.rubrique = rubrique

    def has_permission(self, request, view):
        return has_admin_access(request.user, self.rubrique)


# Permissions spécifiques par rubrique
class IsAdminOrJewrinConservatoire(BasePermission):
    """Permission pour la rubrique Conservatoire"""
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'conservatoire')


class IsAdminOrJewrinCulturelle(BasePermission):
    """Permission pour la rubrique Culturelle"""
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'culturelle')


class IsAdminOrJewrinFinance(BasePermission):
    """Permission pour la rubrique Finance"""
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'finance')


class IsAdminOrJewrinSociale(BasePermission):
    """Permission pour la rubrique Sociale"""
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'sociale')


class IsAdminOrJewrinCommunication(BasePermission):
    """Permission pour la rubrique Communication"""
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'communication')


class IsAdminOrJewrinOrganisation(BasePermission):
    """Permission pour la rubrique Organisation"""
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'organisation')


class IsAdminOrJewrinInformations(BasePermission):
    """Permission pour la rubrique Informations (News, Événements) — aucun rôle jewrine_*
    dédié n'existe pour cette rubrique. Le chargé de communication (jewrine_communication)
    y a accès nativement (c'est lui qui publie actualités/événements et notifie les
    membres) ; les autres passent par admin/jewrin ou une exception par membre accordée
    depuis la page Rôles & Permissions."""
    def has_permission(self, request, view):
        if getattr(request.user, 'role', None) == 'jewrine_communication':
            return True
        return has_admin_access(request.user, 'informations')


class IsAdminOrJewrinScientifique(BasePermission):
    """Permission pour la rubrique Scientifique"""
    def has_permission(self, request, view):
        return has_admin_access(request.user, 'scientifique')


def log_audit(request, action, rubrique='', objet=None, description='', succes=True, acteur=None):
    """Enregistre une entrée dans le journal d'audit/sécurité.
    À appeler explicitement aux points sensibles (connexion, changement de rôle/permission,
    validation de paiement, réinitialisation de mot de passe, etc.).
    `acteur` permet de préciser explicitement l'utilisateur concerné pour les endpoints publics
    (ex: réinitialisation de mot de passe) où request.user n'est pas authentifié.

    Ne doit JAMAIS faire échouer l'action métier appelante (connexion, etc.) : toute erreur
    (table pas encore migrée, format d'IP inattendu derrière un proxy, etc.) est avalée."""
    try:
        from .models import JournalAudit
        import ipaddress

        if acteur is not None:
            user = acteur
        else:
            user = getattr(request, 'user', None)
            if user is not None and not getattr(user, 'is_authenticated', False):
                user = None

        ip_brute = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR', '')
        try:
            ipaddress.ip_address(ip_brute)
            ip = ip_brute
        except ValueError:
            ip = None

        JournalAudit.objects.create(
            utilisateur=user,
            action=action,
            rubrique=rubrique,
            objet_repr=str(objet)[:255] if objet is not None else '',
            description=description,
            adresse_ip=ip,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:300],
            succes=succes,
        )
    except Exception:
        import logging
        logging.getLogger(__name__).exception("Échec non bloquant de l'écriture dans le journal d'audit")


class _AuditMixin:
    """Trace automatiquement dans le journal d'audit la consultation (retrieve) d'un objet.
    Partagé par AuditedModelViewSet et AuditedReadOnlyModelViewSet.

    Définir sur la sous-classe :
    - `audit_rubrique` : code de la rubrique (voir RUBRIQUES dans accounts/models.py).
    - `audit_label` (optionnel) : nom lisible de l'objet dans les messages, sinon déduit
      du verbose_name du modèle.
    - `audit_log_consultation = False` pour désactiver le traçage des consultations sur un
      modèle donné (ex: si trop fréquent/peu utile à l'audit).
    """
    audit_rubrique = ''
    audit_label = None
    audit_log_consultation = True

    def _audit_label(self, instance=None):
        if self.audit_label:
            return self.audit_label
        model = instance.__class__ if instance is not None else self.get_queryset().model
        return str(model._meta.verbose_name)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if self.audit_log_consultation and request.user.is_authenticated:
            log_audit(
                request, 'consultation', rubrique=self.audit_rubrique, objet=instance,
                description=f"{self._audit_label(instance)} consulté(e) : {instance}",
            )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class AuditedModelViewSet(_AuditMixin, viewsets.ModelViewSet):
    """ModelViewSet qui trace automatiquement dans le journal d'audit la création, la
    modification, la suppression et la consultation (retrieve) d'un objet.
    À utiliser à la place de viewsets.ModelViewSet — voir _AuditMixin pour les attributs
    de configuration (`audit_rubrique`, etc.).

    Une sous-classe qui a besoin d'un perform_create/perform_update/perform_destroy
    personnalisé (ex: injecter request.user sur un champ) doit appeler log_audit()
    elle-même dans sa surcharge : ces méthodes ne sont alors plus héritées."""

    def perform_create(self, serializer):
        instance = serializer.save()
        log_audit(
            self.request, 'creation', rubrique=self.audit_rubrique, objet=instance,
            description=f"{self._audit_label(instance)} créé(e) : {instance}",
        )
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        log_audit(
            self.request, 'modification', rubrique=self.audit_rubrique, objet=instance,
            description=f"{self._audit_label(instance)} modifié(e) : {instance}",
        )
        return instance

    def perform_destroy(self, instance):
        log_audit(
            self.request, 'suppression', rubrique=self.audit_rubrique, objet=instance,
            description=f"{self._audit_label(instance)} supprimé(e) : {instance}",
        )
        instance.delete()


class AuditedReadOnlyModelViewSet(_AuditMixin, viewsets.ReadOnlyModelViewSet):
    """ReadOnlyModelViewSet qui trace la consultation (retrieve) d'un objet."""
    pass
