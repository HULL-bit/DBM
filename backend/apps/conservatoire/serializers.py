from rest_framework import serializers
from .models import (
    CategorieDocument, DocumentNumerique, MediaAudio, MediaVideo,
    ArchiveHistorique, AlbumPhoto, Photo,
    Kourel, SeanceConservatoire, PresenceSeance, KhassidaRepetee
)


class CategorieDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategorieDocument
        fields = '__all__'


class DocumentNumeriqueSerializer(serializers.ModelSerializer):
    categorie_nom = serializers.CharField(source='categorie.nom', read_only=True)

    class Meta:
        model = DocumentNumerique
        fields = '__all__'
        read_only_fields = ['date_ajout', 'telecharge_par', 'telechargements', 'vues']


class MediaAudioSerializer(serializers.ModelSerializer):
    categorie_display = serializers.CharField(source='get_categorie_display', read_only=True)

    class Meta:
        model = MediaAudio
        fields = '__all__'
        read_only_fields = ['date_ajout', 'upload_par', 'ecoutes']


class MediaVideoSerializer(serializers.ModelSerializer):
    categorie_display = serializers.CharField(source='get_categorie_display', read_only=True)

    class Meta:
        model = MediaVideo
        fields = '__all__'
        read_only_fields = ['date_ajout', 'upload_par', 'vues']


class ArchiveHistoriqueSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_archive_display', read_only=True)

    class Meta:
        model = ArchiveHistorique
        fields = '__all__'
        read_only_fields = ['date_archivage', 'archiviste']


class PhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Photo
        fields = '__all__'
        read_only_fields = ['date_upload', 'photographe']


class AlbumPhotoSerializer(serializers.ModelSerializer):
    photos = PhotoSerializer(many=True, read_only=True)

    class Meta:
        model = AlbumPhoto
        fields = '__all__'
        read_only_fields = ['date_creation', 'cree_par']


class KourelSerializer(serializers.ModelSerializer):
    membres_noms = serializers.SerializerMethodField()
    nb_membres = serializers.SerializerMethodField()
    maitre_de_coeur_nom = serializers.SerializerMethodField()

    class Meta:
        model = Kourel
        fields = '__all__'

    def get_membres_noms(self, obj):
        return [u.get_full_name() for u in obj.membres.all()]

    def get_nb_membres(self, obj):
        return obj.membres.count()

    def get_maitre_de_coeur_nom(self, obj):
        return obj.maitre_de_coeur.get_full_name() if obj.maitre_de_coeur else None


class PresenceSeanceSerializer(serializers.ModelSerializer):
    membre_nom = serializers.SerializerMethodField()
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)

    def get_membre_nom(self, obj):
        return obj.membre.get_full_name() if obj.membre else ''

    class Meta:
        model = PresenceSeance
        fields = '__all__'


class KhassidaRepeteeSerializer(serializers.ModelSerializer):
    class Meta:
        model = KhassidaRepetee
        fields = '__all__'


class SeanceConservatoireSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_seance_display', read_only=True)
    kourel_nom = serializers.CharField(source='kourel.nom', read_only=True)
    presences = PresenceSeanceSerializer(many=True, read_only=True)
    khassidas = KhassidaRepeteeSerializer(many=True, read_only=True)

    class Meta:
        model = SeanceConservatoire
        fields = '__all__'
        read_only_fields = ['date_creation', 'cree_par']
