from rest_framework import serializers
from .models import CotisationMensuelle, LeveeFonds, Transaction, Don, ParametresFinanciers


class CotisationMensuelleSerializer(serializers.ModelSerializer):
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    membre_nom = serializers.CharField(source='membre.get_full_name', read_only=True)

    class Meta:
        model = CotisationMensuelle
        fields = '__all__'


class LeveeFondsSerializer(serializers.ModelSerializer):
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    pourcentage_atteint = serializers.ReadOnlyField()

    class Meta:
        model = LeveeFonds
        fields = '__all__'
        read_only_fields = ['montant_collecte', 'cree_par', 'date_creation']


class TransactionSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_transaction_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    membre_nom = serializers.CharField(source='membre.get_full_name', read_only=True)

    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ['date_transaction', 'reference_interne', 'membre']


class DonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Don
        fields = '__all__'
        read_only_fields = ['date_don', 'donateur']


class ParametresFinanciersSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParametresFinanciers
        fields = '__all__'
