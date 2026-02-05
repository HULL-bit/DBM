from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ProfilComplementaire, Badge, AttributionBadge

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'telephone', 'adresse', 'sexe', 'profession',
            'role', 'role_display', 'photo',
            'date_inscription', 'est_actif', 'numero_wave', 'numero_carte',
            'specialite', 'biographie',
            'cotisations_payees', 'chapitres_lus', 'evenements_participes',
        ]
        read_only_fields = ['date_inscription', 'cotisations_payees', 'chapitres_lus', 'evenements_participes']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'first_name', 'last_name',
            'telephone', 'adresse', 'sexe', 'profession',
            'role', 'numero_wave', 'numero_carte',
            'specialite', 'biographie',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserMeSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'telephone', 'adresse', 'sexe', 'profession',
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
