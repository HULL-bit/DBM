from rest_framework.permissions import IsAdminUser


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

