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
    path('rbac/matrice/', views.rbac_matrice),
    path('rbac/overrides/', views.rbac_overrides),
    path('rbac/mes-permissions/', views.mes_permissions),
    path('audit/', views.journal_audit),
]
