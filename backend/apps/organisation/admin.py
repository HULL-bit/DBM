from django.contrib import admin
from .models import TypeReunion, Reunion, ProcesVerbal, Decision, Vote, ChoixVote, StructureOrganisation, RapportActivite

admin.site.register(TypeReunion)
admin.site.register(Reunion)
admin.site.register(ProcesVerbal)
admin.site.register(Decision)
admin.site.register(Vote)
admin.site.register(ChoixVote)
admin.site.register(StructureOrganisation)
admin.site.register(RapportActivite)
