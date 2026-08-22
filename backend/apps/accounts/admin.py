from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import CustomUser, ProfilComplementaire, PreferencesNotification, HistoriqueConnexion, Badge, AttributionBadge, CodeReinitialisation, MatricePermissionRole, PermissionMembreOverride, JournalAudit


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'est_actif', 'date_inscription']
    list_filter = ['role', 'est_actif']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'telephone']
    ordering = ['-date_inscription']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Daara', {'fields': ('telephone', 'adresse', 'role', 'photo', 'numero_wave', 'specialite', 'biographie', 'est_actif', 'cotisations_payees', 'chapitres_lus', 'evenements_participes')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (None, {'fields': ('email', 'telephone', 'adresse', 'role')}),
    )


@admin.register(ProfilComplementaire)
class ProfilComplementaireAdmin(admin.ModelAdmin):
    list_display = ['user', 'profession', 'pays', 'ville_residence']


@admin.register(PreferencesNotification)
class PreferencesNotificationAdmin(admin.ModelAdmin):
    list_display = ['user']


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ['nom', 'categorie', 'points', 'est_actif']


@admin.register(AttributionBadge)
class AttributionBadgeAdmin(admin.ModelAdmin):
    list_display = ['user', 'badge', 'date_obtention']


@admin.register(HistoriqueConnexion)
class HistoriqueConnexionAdmin(admin.ModelAdmin):
    list_display = ['user', 'date_connexion', 'adresse_ip', 'succes']


@admin.register(CodeReinitialisation)
class CodeReinitialisationAdmin(admin.ModelAdmin):
    list_display = ['user', 'date_creation', 'date_expiration', 'utilise', 'tentatives']
    list_filter = ['utilise']
    readonly_fields = ['code', 'date_creation']


@admin.register(MatricePermissionRole)
class MatricePermissionRoleAdmin(admin.ModelAdmin):
    list_display = ['role', 'rubrique', 'peut_voir', 'peut_creer', 'peut_modifier', 'peut_supprimer', 'peut_valider']
    list_filter = ['role', 'rubrique']


@admin.register(PermissionMembreOverride)
class PermissionMembreOverrideAdmin(admin.ModelAdmin):
    list_display = ['user', 'rubrique', 'peut_voir', 'peut_creer', 'peut_modifier', 'peut_supprimer', 'peut_valider']
    list_filter = ['rubrique']
    search_fields = ['user__username', 'user__first_name', 'user__last_name']


@admin.register(JournalAudit)
class JournalAuditAdmin(admin.ModelAdmin):
    list_display = ['date', 'utilisateur', 'action', 'rubrique', 'succes']
    list_filter = ['action', 'succes', 'rubrique']
    search_fields = ['utilisateur__username', 'objet_repr', 'description']
    readonly_fields = [f.name for f in JournalAudit._meta.fields]
