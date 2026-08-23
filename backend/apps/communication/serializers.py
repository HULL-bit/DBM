from rest_framework import serializers
from .models import Message, CategorieForum, SujetForum, ReponseForum, Notification, Canal, MembreCanal, MessageCanal, AbonnementPush


class MessageSerializer(serializers.ModelSerializer):
    expediteur_nom = serializers.CharField(source='expediteur.get_full_name', read_only=True)
    destinataire_nom = serializers.CharField(source='destinataire.get_full_name', read_only=True)
    expediteur_photo = serializers.ImageField(source='expediteur.photo', read_only=True)
    expediteur_photo_updated_at = serializers.DateTimeField(source='expediteur.photo_updated_at', read_only=True)
    destinataire_photo = serializers.ImageField(source='destinataire.photo', read_only=True)
    destinataire_photo_updated_at = serializers.DateTimeField(source='destinataire.photo_updated_at', read_only=True)

    class Meta:
        model = Message
        fields = '__all__'
        read_only_fields = ['date_envoi', 'expediteur', 'date_lecture']


class CategorieForumSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategorieForum
        fields = '__all__'


class ReponseForumSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.CharField(source='auteur.get_full_name', read_only=True)

    class Meta:
        model = ReponseForum
        fields = '__all__'
        read_only_fields = ['date_creation', 'auteur']


class SujetForumSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.CharField(source='auteur.get_full_name', read_only=True)
    categorie_nom = serializers.CharField(source='categorie.nom', read_only=True)

    class Meta:
        model = SujetForum
        fields = '__all__'
        read_only_fields = ['date_creation', 'auteur', 'vues']


class MembreCanalSerializer(serializers.ModelSerializer):
    membre_nom = serializers.CharField(source='user.get_full_name', read_only=True)
    membre_photo = serializers.ImageField(source='user.photo', read_only=True)

    class Meta:
        model = MembreCanal
        fields = ['id', 'canal', 'user', 'membre_nom', 'membre_photo', 'est_admin_canal', 'date_ajout']
        read_only_fields = ['date_ajout']


class CanalSerializer(serializers.ModelSerializer):
    cree_par_nom = serializers.CharField(source='cree_par.get_full_name', read_only=True)
    membres = serializers.SerializerMethodField()
    nb_membres = serializers.SerializerMethodField()
    est_admin_canal = serializers.SerializerMethodField()

    class Meta:
        model = Canal
        fields = [
            'id', 'nom', 'description', 'image', 'cree_par', 'cree_par_nom', 'date_creation',
            'est_actif', 'lien_reunion', 'membres', 'nb_membres', 'est_admin_canal',
        ]
        read_only_fields = ['cree_par', 'date_creation', 'lien_reunion']

    def get_membres(self, obj):
        return MembreCanalSerializer(obj.membres_canal.select_related('user'), many=True).data

    def get_nb_membres(self, obj):
        return obj.membres_canal.count()

    def get_est_admin_canal(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        if obj.membres_canal.filter(user=request.user, est_admin_canal=True).exists():
            return True
        from apps.accounts.permissions import has_admin_access
        return has_admin_access(request.user, 'communication')


class MessageCanalSerializer(serializers.ModelSerializer):
    expediteur_nom = serializers.CharField(source='expediteur.get_full_name', read_only=True)
    expediteur_photo = serializers.ImageField(source='expediteur.photo', read_only=True)

    class Meta:
        model = MessageCanal
        fields = [
            'id', 'canal', 'expediteur', 'expediteur_nom', 'expediteur_photo', 'type_message',
            'contenu', 'fichier', 'duree', 'date_envoi', 'repond_a',
        ]
        read_only_fields = ['expediteur', 'date_envoi']


class AbonnementPushSerializer(serializers.ModelSerializer):
    class Meta:
        model = AbonnementPush
        fields = ['id', 'endpoint', 'cle_p256dh', 'cle_auth', 'date_creation']
        read_only_fields = ['date_creation']


class NotificationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_notification_display', read_only=True)

    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['date_creation', 'utilisateur', 'date_lecture']
