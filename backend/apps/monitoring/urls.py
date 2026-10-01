from django.urls import path

from . import views

urlpatterns = [
    path('health/', views.health),
    path('monitoring/erreur-client/', views.erreur_client),
    path('monitoring/incidents/', views.incidents),
    path('monitoring/incidents/<int:pk>/resoudre/', views.resoudre_incident),
    path('monitoring/tester-alerte/', views.tester_alerte),
]
