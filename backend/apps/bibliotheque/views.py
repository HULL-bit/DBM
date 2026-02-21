from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import FileResponse, Http404
from django.utils.encoding import smart_str

from apps.accounts.permissions import IsAdminRoleOrStaff

from .models import LivreNumerique
from .serializers import LivreNumeriqueSerializer


class BibliothequePagination(PageNumberPagination):
    """Jusqu'à 200 livres par page pour supporter 150+ PDF sans multiplier les requêtes."""
    page_size = 200
    page_size_query_param = 'page_size'
    max_page_size = 200


class LivreNumeriqueViewSet(viewsets.ModelViewSet):
    queryset = LivreNumerique.objects.select_related('ajoute_par').order_by('categorie', 'ordre', 'nom')
    serializer_class = LivreNumeriqueSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['categorie']
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    pagination_class = BibliothequePagination

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminRoleOrStaff()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(ajoute_par=self.request.user)

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except ValidationError:
            raise
        except Exception as e:
            return Response(
                {'detail': str(e) or 'Erreur lors de l\'enregistrement du livre.'},
                status=400,
            )

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def lire(self, request, pk=None):
        """Stream le PDF pour lecture intégrée (iframe) et incrémente les vues."""
        livre = self.get_object()
        if not livre.pdf:
            raise Http404("Fichier non disponible.")
        livre.vues += 1
        livre.save(update_fields=['vues'])
        try:
            resp = FileResponse(
                livre.pdf.open('rb'),
                as_attachment=False,
                content_type='application/pdf',
            )
            resp['Content-Disposition'] = 'inline; filename="' + smart_str(livre.nom or 'livre') + '.pdf"'
            return resp
        except Exception:
            raise Http404("Fichier non accessible.")

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def telecharger(self, request, pk=None):
        """Télécharge le PDF et incrémente le compteur."""
        livre = self.get_object()
        if not livre.pdf:
            raise Http404("Fichier non disponible.")
        livre.telechargements += 1
        livre.save(update_fields=['telechargements'])
        try:
            resp = FileResponse(
                livre.pdf.open('rb'),
                as_attachment=True,
                filename=smart_str(livre.nom or 'livre') + '.pdf',
                content_type='application/pdf',
            )
            return resp
        except Exception:
            raise Http404("Fichier non accessible.")
