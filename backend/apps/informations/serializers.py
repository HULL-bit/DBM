from rest_framework import serializers
from .models import (
    Groupe, Evenement, ParticipationEvenement, Publication, Annonce, GalerieMedia,
    NewsPost, NewsImage, NewsLike, NewsBookmark, NewsComment,
)


class GroupeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Groupe
        fields = '__all__'
        read_only_fields = ['date_creation']


class EvenementSerializer(serializers.ModelSerializer):
    type_evenement_display = serializers.CharField(source='get_type_evenement_display', read_only=True)
    cree_par_nom = serializers.CharField(source='cree_par.get_full_name', read_only=True)

    class Meta:
        model = Evenement
        fields = '__all__'
        read_only_fields = ['date_creation', 'cree_par']


class ParticipationEvenementSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParticipationEvenement
        fields = '__all__'
        read_only_fields = ['date_inscription']


class PublicationSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.CharField(source='auteur.get_full_name', read_only=True)

    class Meta:
        model = Publication
        fields = '__all__'
        read_only_fields = ['date_publication', 'date_modification', 'auteur', 'vues']


class AnnonceSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.CharField(source='auteur.get_full_name', read_only=True)

    class Meta:
        model = Annonce
        fields = '__all__'
        read_only_fields = ['date_publication', 'auteur']


class GalerieMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = GalerieMedia
        fields = '__all__'
        read_only_fields = ['date_upload', 'upload_par', 'vues']


class NewsImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsImage
        fields = ['id', 'image', 'ordre']


class NewsCommentSerializer(serializers.ModelSerializer):
    membre_nom = serializers.CharField(source='membre.get_full_name', read_only=True)

    class Meta:
        model = NewsComment
        fields = ['id', 'post', 'membre', 'membre_nom', 'parent', 'texte', 'date_creation']
        read_only_fields = ['post', 'membre', 'date_creation']


class NewsPostSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.CharField(source='auteur.get_full_name', read_only=True)
    images = NewsImageSerializer(many=True, read_only=True)
    nb_likes = serializers.SerializerMethodField()
    nb_comments = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()

    class Meta:
        model = NewsPost
        fields = [
            'id',
            'auteur', 'auteur_nom',
            'titre', 'contenu', 'est_publie',
            'date_creation', 'date_modification',
            'images',
            'nb_likes', 'nb_comments', 'is_liked', 'is_bookmarked',
        ]
        read_only_fields = ['auteur', 'date_creation', 'date_modification', 'images', 'nb_likes', 'nb_comments', 'is_liked', 'is_bookmarked']

    def _user(self):
        req = self.context.get('request')
        return getattr(req, 'user', None) if req else None

    def get_nb_likes(self, obj):
        return getattr(obj, 'nb_likes', None) if getattr(obj, 'nb_likes', None) is not None else obj.likes.count()

    def get_nb_comments(self, obj):
        return getattr(obj, 'nb_comments', None) if getattr(obj, 'nb_comments', None) is not None else obj.comments.count()

    def get_is_liked(self, obj):
        user = self._user()
        if not user or not getattr(user, 'is_authenticated', False):
            return False
        if hasattr(obj, '_prefetched_objects_cache') and 'likes' in obj._prefetched_objects_cache:
            return any(l.membre_id == user.id for l in obj.likes.all())
        return NewsLike.objects.filter(post=obj, membre=user).exists()

    def get_is_bookmarked(self, obj):
        user = self._user()
        if not user or not getattr(user, 'is_authenticated', False):
            return False
        if hasattr(obj, '_prefetched_objects_cache') and 'bookmarks' in obj._prefetched_objects_cache:
            return any(b.membre_id == user.id for b in obj.bookmarks.all())
        return NewsBookmark.objects.filter(post=obj, membre=user).exists()
