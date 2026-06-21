from django.contrib import admin
from django.utils.html import format_html
from .models import (
    CategorieDocument, DocumentNumerique, MediaAudio, MediaVideo,
    ArchiveHistorique, AlbumPhoto, Photo,
    Kourel, SeanceConservatoire, PresenceSeance, KhassidaRepetee
)


@admin.register(CategorieDocument)
class CategorieDocumentAdmin(admin.ModelAdmin):
    list_display = ['nom', 'parent', 'ordre']
    list_editable = ['ordre']
    search_fields = ['nom']
    list_filter = ['parent']


@admin.register(DocumentNumerique)
class DocumentNumeriqueAdmin(admin.ModelAdmin):
    list_display = ['titre', 'auteur', 'type_document', 'categorie', 'langue', 'telechargements', 'vues', 'date_ajout']
    list_filter = ['type_document', 'categorie', 'langue']
    search_fields = ['titre', 'auteur', 'isbn', 'tags']
    readonly_fields = ['date_ajout', 'telechargements', 'vues', 'telecharge_par']
    date_hierarchy = 'date_ajout'


@admin.register(MediaAudio)
class MediaAudioAdmin(admin.ModelAdmin):
    list_display = ['titre', 'categorie', 'orateur', 'ecoutes', 'date_ajout']
    list_filter = ['categorie']
    search_fields = ['titre', 'orateur', 'tags']
    readonly_fields = ['date_ajout', 'ecoutes', 'upload_par']


@admin.register(MediaVideo)
class MediaVideoAdmin(admin.ModelAdmin):
    list_display = ['titre', 'categorie', 'intervenant', 'vues', 'date_ajout']
    list_filter = ['categorie']
    search_fields = ['titre', 'intervenant', 'tags']
    readonly_fields = ['date_ajout', 'vues', 'upload_par']


@admin.register(ArchiveHistorique)
class ArchiveHistoriqueAdmin(admin.ModelAdmin):
    list_display = ['titre', 'type_archive', 'annee', 'date_evenement', 'source', 'date_archivage']
    list_filter = ['type_archive', 'annee']
    search_fields = ['titre', 'evenement', 'source', 'texte']
    readonly_fields = ['date_archivage', 'archiviste']
    date_hierarchy = 'date_archivage'


class PhotoInline(admin.TabularInline):
    model = Photo
    extra = 0
    fields = ['titre', 'fichier', 'ordre', 'lieu', 'date_prise']
    readonly_fields = ['date_upload']


@admin.register(AlbumPhoto)
class AlbumPhotoAdmin(admin.ModelAdmin):
    list_display = ['titre', 'date_evenement', 'est_public', 'nb_photos', 'date_creation']
    list_filter = ['est_public', 'date_evenement']
    search_fields = ['titre', 'description']
    readonly_fields = ['date_creation', 'cree_par']
    inlines = [PhotoInline]

    def nb_photos(self, obj):
        return obj.photos.count()
    nb_photos.short_description = 'Nb photos'


@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'album', 'lieu', 'date_prise', 'ordre']
    list_filter = ['album']
    search_fields = ['titre', 'lieu']
    readonly_fields = ['date_upload', 'photographe']


class PresenceSeanceInline(admin.TabularInline):
    model = PresenceSeance
    extra = 0
    fields = ['membre', 'statut', 'remarque']
    autocomplete_fields = ['membre']


class KhassidaRepeteeInline(admin.TabularInline):
    model = KhassidaRepetee
    extra = 1
    fields = ['nom_khassida', 'dathie', 'khassida_portion', 'ordre']


@admin.register(Kourel)
class KourelAdmin(admin.ModelAdmin):
    list_display = [
        'nom', 'ordre',
        'responsable_display', 'maitre_de_coeur_display', 'maitre_de_coeur_2_display',
        'jewrine_display', 'nb_membres_display'
    ]
    list_editable = ['ordre']
    search_fields = ['nom', 'description']
    filter_horizontal = ['membres']
    autocomplete_fields = ['responsable', 'maitre_de_coeur', 'maitre_de_coeur_2', 'jewrine']
    fieldsets = (
        ('Informations générales', {
            'fields': ('nom', 'description', 'ordre')
        }),
        ('Encadrement', {
            'fields': ('responsable', 'maitre_de_coeur', 'maitre_de_coeur_2', 'jewrine'),
            'description': 'Responsables et encadrants du kourel'
        }),
        ('Membres', {
            'fields': ('membres',),
            'classes': ('collapse',)
        }),
    )

    def responsable_display(self, obj):
        if obj.responsable:
            return format_html('<b>{}</b>', obj.responsable.get_full_name())
        return format_html('<span style="color:#aaa">—</span>')
    responsable_display.short_description = 'Responsable'

    def maitre_de_coeur_display(self, obj):
        if obj.maitre_de_coeur:
            return format_html('🎵 {}', obj.maitre_de_coeur.get_full_name())
        return format_html('<span style="color:#aaa">—</span>')
    maitre_de_coeur_display.short_description = '1er Maître de cœur'

    def maitre_de_coeur_2_display(self, obj):
        if obj.maitre_de_coeur_2:
            return format_html('🎵 {}', obj.maitre_de_coeur_2.get_full_name())
        return format_html('<span style="color:#aaa">—</span>')
    maitre_de_coeur_2_display.short_description = '2ème Maître de cœur'

    def jewrine_display(self, obj):
        if obj.jewrine:
            return format_html('<span style="color:#2D5F3F"><b>{}</b></span>', obj.jewrine.get_full_name())
        return format_html('<span style="color:#aaa">—</span>')
    jewrine_display.short_description = 'Jewrine'

    def nb_membres_display(self, obj):
        count = obj.membres.count()
        color = '#2D5F3F' if count > 0 else '#aaa'
        return format_html('<span style="color:{};font-weight:bold">{} membre(s)</span>', color, count)
    nb_membres_display.short_description = 'Membres'


@admin.register(SeanceConservatoire)
class SeanceConservatoireAdmin(admin.ModelAdmin):
    list_display = ['titre', 'kourel', 'type_seance', 'date_heure', 'heure_fin', 'lieu', 'nb_presences', 'date_creation']
    list_filter = ['type_seance', 'kourel', 'date_heure']
    search_fields = ['titre', 'description', 'lieu', 'kourel__nom']
    readonly_fields = ['date_creation', 'cree_par']
    date_hierarchy = 'date_heure'
    inlines = [KhassidaRepeteeInline, PresenceSeanceInline]
    autocomplete_fields = ['kourel']

    def nb_presences(self, obj):
        nb = obj.presences.filter(statut='present').count()
        total = obj.presences.count()
        if total == 0:
            return format_html('<span style="color:#aaa">—</span>')
        color = '#2D5F3F' if nb == total else ('#e6a817' if nb > 0 else '#cc3333')
        return format_html('<span style="color:{}">{}/{}</span>', color, nb, total)
    nb_presences.short_description = 'Présences'


@admin.register(PresenceSeance)
class PresenceSeanceAdmin(admin.ModelAdmin):
    list_display = ['membre', 'seance', 'statut_display_colored', 'remarque']
    list_filter = ['statut', 'seance__kourel', 'seance']
    search_fields = ['membre__first_name', 'membre__last_name', 'seance__titre']
    autocomplete_fields = ['membre', 'seance']

    def statut_display_colored(self, obj):
        colors = {
            'present': '#2D5F3F',
            'absent_justifie': '#e6a817',
            'absent_non_justifie': '#cc3333',
        }
        color = colors.get(obj.statut, '#333')
        return format_html('<span style="color:{};font-weight:bold">{}</span>', color, obj.get_statut_display())
    statut_display_colored.short_description = 'Statut'


@admin.register(KhassidaRepetee)
class KhassidaRepeteeAdmin(admin.ModelAdmin):
    list_display = ['nom_khassida', 'dathie', 'khassida_portion', 'seance', 'ordre']
    list_filter = ['dathie', 'seance__kourel']
    search_fields = ['nom_khassida', 'dathie']
