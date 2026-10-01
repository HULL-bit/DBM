from django.contrib import admin

from .models import IncidentSysteme


@admin.register(IncidentSysteme)
class IncidentSystemeAdmin(admin.ModelAdmin):
    list_display = ('titre', 'source', 'niveau', 'occurrences', 'derniere_date', 'resolu')
    list_filter = ('source', 'niveau', 'resolu')
    search_fields = ('titre', 'chemin', 'details', 'request_id')
