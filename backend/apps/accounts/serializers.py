from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ProfilComplementaire, Badge, AttributionBadge, BadgeMission, MatricePermissionRole, PermissionMembreOverride, JournalAudit

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8,
        help_text='Laisser vide pour ne pas changer le mot de passe'
    )

    def validate_categorie(self, value):
        """Normaliser et valider la catégorie"""
        # Si None ou chaîne vide, utiliser le défaut
        if value is None or (isinstance(value, str) and not value.strip()):
            return 'professionnel'
        
        # Normaliser la valeur
        value_normalized = str(value).strip().lower()
        
        # Gérer les variations d'orthographe
        if value_normalized == 'professionel':
            value_normalized = 'professionnel'
        
        # Vérifier que c'est une valeur valide et la retourner telle quelle
        valid_categories = ['eleve', 'etudiant', 'professionnel']
        if value_normalized in valid_categories:
            return value_normalized
        
        # Si invalide, utiliser le défaut
        return 'professionnel'

    def update(self, instance, validated_data):
        """Mettre à jour l'utilisateur, y compris le mot de passe si fourni"""
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        
        # Mettre à jour les autres champs
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'telephone', 'adresse', 'sexe', 'profession', 'categorie',
            'cellule', 'groupe_sanguin', 'niveau_alquran', 'niveau_majalis',
            'role', 'role_display', 'photo', 'password',
            'date_inscription', 'est_actif', 'numero_wave', 'numero_carte', 'date_naissance',
            'date_delivrance_carte',
            'specialite', 'biographie',
            'cotisations_payees', 'chapitres_lus', 'evenements_participes',
        ]
        read_only_fields = ['date_inscription', 'cotisations_payees', 'chapitres_lus', 'evenements_participes']


class UserPublicSerializer(serializers.ModelSerializer):
    """Version allégée de l'utilisateur, sans données sensibles (adresse, numéro Wave,
    groupe sanguin, etc.) : utilisée pour les sélecteurs de membres (création de canal,
    kourel, notification...) accessibles à tout utilisateur authentifié, pas seulement
    à ceux ayant un droit sur la rubrique 'comptes'."""
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'telephone', 'role', 'role_display', 'photo', 'cellule', 'est_actif',
        ]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_categorie(self, value):
        """Normaliser et valider la catégorie"""
        # Si None ou chaîne vide, utiliser le défaut
        if value is None or (isinstance(value, str) and not value.strip()):
            return 'professionnel'
        
        # Normaliser la valeur
        value_normalized = str(value).strip().lower()
        
        # Gérer les variations d'orthographe
        if value_normalized == 'professionel':
            value_normalized = 'professionnel'
        
        # Vérifier que c'est une valeur valide et la retourner telle quelle
        valid_categories = ['eleve', 'etudiant', 'professionnel']
        if value_normalized in valid_categories:
            return value_normalized
        
        # Si invalide, utiliser le défaut
        return 'professionnel'

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'first_name', 'last_name',
            'telephone', 'adresse', 'sexe', 'profession', 'categorie',
            'cellule', 'groupe_sanguin', 'niveau_alquran', 'niveau_majalis',
            'numero_wave', 'numero_carte',
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
    categorie = serializers.CharField(required=False, allow_blank=True, allow_null=True, read_only=False)

    def validate_categorie(self, value):
        """Normaliser et valider la catégorie"""
        if value is None or (isinstance(value, str) and not value.strip()):
            return 'professionnel'
        value_normalized = str(value).strip().lower()
        if value_normalized == 'professionel':
            value_normalized = 'professionnel'
        valid_categories = ['eleve', 'etudiant', 'professionnel']
        if value_normalized in valid_categories:
            return value_normalized
        return 'professionnel'
    
    def to_representation(self, instance):
        """Override pour gérer les cas où categorie pourrait ne pas exister dans la DB"""
        try:
            data = super().to_representation(instance)
        except Exception as e:
            # Si erreur lors de la sérialisation (ex: champ categorie n'existe pas), 
            # construire les données manuellement
            data = {}
            for field_name in self.Meta.fields:
                if field_name == 'categorie':
                    data['categorie'] = 'professionnel'
                elif field_name == 'role_display':
                    data['role_display'] = instance.get_role_display() if hasattr(instance, 'get_role_display') else ''
                else:
                    try:
                        data[field_name] = getattr(instance, field_name, None)
                    except:
                        pass
            return data
        
        # S'assurer que categorie a toujours une valeur valide
        categorie_value = data.get('categorie')
        if not categorie_value or categorie_value not in ['eleve', 'etudiant', 'professionnel']:
            data['categorie'] = 'professionnel'
        return data

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'telephone', 'adresse', 'sexe', 'profession', 'categorie',
            'cellule', 'groupe_sanguin', 'niveau_alquran', 'niveau_majalis',
            'role', 'role_display', 'photo',
            'photo_updated_at',
            'date_inscription', 'est_actif', 'numero_wave', 'numero_carte', 'date_naissance',
            'date_delivrance_carte',
            'specialite', 'biographie',
            'cotisations_payees', 'chapitres_lus', 'evenements_participes',
        ]
        # numero_carte / date_naissance / date_delivrance_carte : visibles par le membre (sa
        # propre carte) mais modifiables uniquement par l'admin (via UserSerializer), pas par
        # le membre lui-même sur son profil.
        read_only_fields = [
            'id', 'username', 'role', 'role_display', 'photo_updated_at', 'date_inscription',
            'est_actif', 'cotisations_payees', 'chapitres_lus', 'evenements_participes',
            'numero_carte', 'date_naissance', 'date_delivrance_carte',
        ]


class MatricePermissionRoleSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    rubrique_display = serializers.CharField(source='get_rubrique_display', read_only=True)

    class Meta:
        model = MatricePermissionRole
        fields = [
            'id', 'role', 'role_display', 'rubrique', 'rubrique_display',
            'peut_voir', 'peut_creer', 'peut_modifier', 'peut_supprimer', 'peut_valider',
        ]


class PermissionMembreOverrideSerializer(serializers.ModelSerializer):
    rubrique_display = serializers.CharField(source='get_rubrique_display', read_only=True)
    membre_nom = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = PermissionMembreOverride
        fields = [
            'id', 'user', 'membre_nom', 'rubrique', 'rubrique_display',
            'peut_voir', 'peut_creer', 'peut_modifier', 'peut_supprimer', 'peut_valider',
            'date_modification',
        ]
        read_only_fields = ['date_modification']


def _deduire_os(user_agent):
    ua = (user_agent or '').lower()
    if 'windows' in ua:
        return 'Windows'
    if 'android' in ua:
        return 'Android'
    if 'iphone' in ua or 'ipad' in ua or 'ios' in ua:
        return 'iOS'
    if 'mac os' in ua or 'macintosh' in ua:
        return 'macOS'
    if 'linux' in ua:
        return 'Linux'
    return 'Inconnu' if ua else ''


class JournalAuditSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    utilisateur_nom = serializers.CharField(source='utilisateur.get_full_name', read_only=True, default='')
    systeme_exploitation = serializers.SerializerMethodField()

    class Meta:
        model = JournalAudit
        fields = [
            'id', 'utilisateur', 'utilisateur_nom', 'action', 'action_display', 'rubrique',
            'objet_repr', 'description', 'adresse_ip', 'user_agent', 'systeme_exploitation',
            'date', 'succes',
        ]

    def get_systeme_exploitation(self, obj):
        return _deduire_os(obj.user_agent)


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ['id', 'nom', 'description', 'categorie', 'icone', 'points']


class AttributionBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = AttributionBadge
        fields = ['id', 'badge', 'date_obtention', 'raison']


class BadgeMissionSerializer(serializers.ModelSerializer):
    membre_nom = serializers.CharField(source='membre.get_full_name', read_only=True)
    cree_par_nom = serializers.CharField(source='cree_par.get_full_name', read_only=True, default='')

    class Meta:
        model = BadgeMission
        fields = [
            'id', 'membre', 'membre_nom', 'evenement', 'mission', 'date_evenement',
            'description', 'cree_par', 'cree_par_nom', 'date_creation',
        ]
        read_only_fields = ['cree_par', 'date_creation']
