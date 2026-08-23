from rest_framework import serializers
from .models import CotisationMensuelle, LeveeFonds, Transaction, Don, ParametresFinanciers, Depense


class CotisationMensuelleSerializer(serializers.ModelSerializer):
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    membre_nom = serializers.CharField(source='membre.get_full_name', read_only=True)

    class Meta:
        model = CotisationMensuelle
        fields = '__all__'


class LeveeFondsSerializer(serializers.ModelSerializer):
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    statut_reel = serializers.ReadOnlyField()
    statut_reel_display = serializers.SerializerMethodField()
    pourcentage_atteint = serializers.ReadOnlyField()

    class Meta:
        model = LeveeFonds
        fields = '__all__'
        read_only_fields = ['montant_collecte', 'cree_par', 'date_creation']
    
    def get_statut_reel_display(self, obj):
        """Retourne le libellé du statut réel."""
        statut_reel = obj.statut_reel
        return dict(LeveeFonds.STATUT_CHOICES).get(statut_reel, statut_reel)


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


class DepenseSerializer(serializers.ModelSerializer):
    categorie_display = serializers.CharField(source='get_categorie_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    cree_par_nom = serializers.CharField(source='cree_par.get_full_name', read_only=True)
    valide_par_nom = serializers.CharField(source='valide_par.get_full_name', read_only=True, default='')

    class Meta:
        model = Depense
        fields = [
            'id', 'motif', 'categorie', 'categorie_display', 'montant', 'justificatif',
            'date_depense', 'cree_par', 'cree_par_nom', 'valide_par', 'valide_par_nom',
            'date_validation', 'statut', 'statut_display', 'notes', 'date_creation',
        ]
        read_only_fields = ['cree_par', 'valide_par', 'date_validation', 'statut', 'date_creation']


class ParametresFinanciersSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParametresFinanciers
        fields = '__all__'
