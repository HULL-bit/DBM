from django.contrib import admin
from .models import Message, CategorieForum, SujetForum, ReponseForum, Notification, Canal, MembreCanal, MessageCanal, AbonnementPush

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['sujet', 'expediteur', 'destinataire', 'est_lu', 'date_envoi']

@admin.register(CategorieForum)
class CategorieForumAdmin(admin.ModelAdmin):
    list_display = ['nom', 'ordre', 'est_active']

@admin.register(SujetForum)
class SujetForumAdmin(admin.ModelAdmin):
    list_display = ['titre', 'categorie', 'auteur', 'est_epingle', 'date_creation']

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['utilisateur', 'titre', 'type_notification', 'est_lue', 'date_creation']

admin.site.register(ReponseForum)


@admin.register(Canal)
class CanalAdmin(admin.ModelAdmin):
    list_display = ['nom', 'cree_par', 'date_creation', 'est_actif']


@admin.register(MembreCanal)
class MembreCanalAdmin(admin.ModelAdmin):
    list_display = ['canal', 'user', 'est_admin_canal', 'date_ajout']


@admin.register(MessageCanal)
class MessageCanalAdmin(admin.ModelAdmin):
    list_display = ['canal', 'expediteur', 'type_message', 'date_envoi']


@admin.register(AbonnementPush)
class AbonnementPushAdmin(admin.ModelAdmin):
    list_display = ['user', 'date_creation']
