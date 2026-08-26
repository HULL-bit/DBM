from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .views import CustomTokenObtainPairView

urlpatterns = [
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', views.register),
    path('me/', views.me),
    path('me/change-password/', views.change_password),
    path('password/forgot/', views.mot_de_passe_oublie),
    path('password/reset/', views.reinitialiser_mot_de_passe),
    path('users/', views.UserList.as_view()),
    path('users/<int:pk>/', views.UserDetail.as_view()),
    path('admin/statistiques/', views.stats_admin),
    path('me/badges/', views.mes_badges),
    path('badges/', views.BadgeViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('badges/<int:pk>/', views.BadgeViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})),
    path('users/<int:user_id>/badges/', views.badges_membre),
    path('badges-attribution/<int:attribution_id>/', views.retirer_badge),
    path('badges-mission/', views.BadgeMissionViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('badges-mission/<int:pk>/', views.BadgeMissionViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})),
    path('rbac/matrice/', views.rbac_matrice),
    path('rbac/overrides/', views.rbac_overrides),
    path('rbac/mes-permissions/', views.mes_permissions),
    path('audit/', views.journal_audit),
    path('audit/export/', views.journal_audit_export),
]
