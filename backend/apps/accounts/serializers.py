from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ProfilComplementaire, Badge, AttributionBadge

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    def validate_categorie(self, value):
        """Normaliser et valider la catégorie"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"validate_categorie appelé avec value: {value} (type: {type(value)})")
        
        # Si None ou chaîne vide, utiliser le défaut
        if value is None or (isinstance(value, str) and not value.strip()):
            logger.info("Valeur vide, retourne 'professionnel'")
            return 'professionnel'  # Utiliser le défaut explicitement
        
        # Normaliser la valeur
        value_normalized = str(value).strip().lower()
        logger.info(f"Valeur normalisée: {value_normalized}")
        
        # Gérer les variations d'orthographe
        if value_normalized == 'professionel':
            value_normalized = 'professionnel'
        
        # Vérifier que c'est une valeur valide et la retourner telle quelle
        valid_categories = ['eleve', 'etudiant', 'professionnel']
        if value_normalized in valid_categories:
            logger.info(f"Valeur valide, retourne: {value_normalized}")
            return value_normalized
        
        # Si invalide, utiliser le défaut
        logger.info(f"Valeur invalide, retourne 'professionnel'")
        return 'professionnel'

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'telephone', 'adresse', 'sexe', 'profession', 'categorie',
            'role', 'role_display', 'photo',
            'date_inscription', 'est_actif', 'numero_wave', 'numero_carte',
            'specialite', 'biographie',
            'cotisations_payees', 'chapitres_lus', 'evenements_participes',
        ]
        read_only_fields = ['date_inscription', 'cotisations_payees', 'chapitres_lus', 'evenements_participes']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_categorie(self, value):
        """Normaliser et valider la catégorie"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"validate_categorie appelé avec value: {value} (type: {type(value)})")
        
        # Si None ou chaîne vide, utiliser le défaut
        if value is None or (isinstance(value, str) and not value.strip()):
            logger.info("Valeur vide, retourne 'professionnel'")
            return 'professionnel'  # Utiliser le défaut explicitement
        
        # Normaliser la valeur
        value_normalized = str(value).strip().lower()
        logger.info(f"Valeur normalisée: {value_normalized}")
        
        # Gérer les variations d'orthographe
        if value_normalized == 'professionel':
            value_normalized = 'professionnel'
        
        # Vérifier que c'est une valeur valide et la retourner telle quelle
        valid_categories = ['eleve', 'etudiant', 'professionnel']
        if value_normalized in valid_categories:
            logger.info(f"Valeur valide, retourne: {value_normalized}")
            return value_normalized
        
        # Si invalide, utiliser le défaut
        logger.info(f"Valeur invalide, retourne 'professionnel'")
        return 'professionnel'

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'first_name', 'last_name',
            'telephone', 'adresse', 'sexe', 'profession', 'categorie',
            'role', 'numero_wave', 'numero_carte',
            'specialite', 'biographie',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        # Si on crée un admin via l'API, on lui donne aussi les droits staff
        if user.role == 'admin':
            user.is_staff = True
        user.set_password(password)
        user.save()
        return user


class UserMeSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    def validate_categorie(self, value):
        """Normaliser et valider la catégorie"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"validate_categorie appelé avec value: {value} (type: {type(value)})")
        
        # Si None ou chaîne vide, utiliser le défaut
        if value is None or (isinstance(value, str) and not value.strip()):
            logger.info("Valeur vide, retourne 'professionnel'")
            return 'professionnel'  # Utiliser le défaut explicitement
        
        # Normaliser la valeur
        value_normalized = str(value).strip().lower()
        logger.info(f"Valeur normalisée: {value_normalized}")
        
        # Gérer les variations d'orthographe
        if value_normalized == 'professionel':
            value_normalized = 'professionnel'
        
        # Vérifier que c'est une valeur valide et la retourner telle quelle
        valid_categories = ['eleve', 'etudiant', 'professionnel']
        if value_normalized in valid_categories:
            logger.info(f"Valeur valide, retourne: {value_normalized}")
            return value_normalized
        
        # Si invalide, utiliser le défaut
        logger.info(f"Valeur invalide, retourne 'professionnel'")
        return 'professionnel'

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'telephone', 'adresse', 'sexe', 'profession', 'categorie',
            'role', 'role_display', 'photo',
            'photo_updated_at',
            'date_inscription', 'est_actif', 'numero_wave', 'numero_carte',
            'specialite', 'biographie',
            'cotisations_payees', 'chapitres_lus', 'evenements_participes',
        ]
        read_only_fields = [
            'id', 'username', 'role', 'role_display', 'photo_updated_at', 'date_inscription',
            'est_actif', 'cotisations_payees', 'chapitres_lus', 'evenements_participes',
        ]


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ['id', 'nom', 'description', 'categorie', 'icone', 'points']


class AttributionBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = AttributionBadge
        fields = ['id', 'badge', 'date_obtention', 'raison']
