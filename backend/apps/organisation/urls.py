from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'organisation/types-reunion', views.TypeReunionViewSet)
router.register(r'organisation/reunions', views.ReunionViewSet)
router.register(r'organisation/pv', views.ProcesVerbalViewSet)
router.register(r'organisation/decisions', views.DecisionViewSet)
router.register(r'organisation/votes', views.VoteViewSet)
router.register(r'organisation/structures', views.StructureOrganisationViewSet)
router.register(r'organisation/rapports', views.RapportActiviteViewSet)
router.register(r'organisation/materiels', views.MaterielViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
