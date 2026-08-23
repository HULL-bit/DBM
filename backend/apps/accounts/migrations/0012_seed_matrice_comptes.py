from django.db import migrations


ROLES_NON_ADMIN = [
    'membre', 'jewrin', 'jewrine_conservatoire', 'jewrine_culturelle',
    'jewrine_finance', 'jewrine_sociale', 'jewrine_communication',
    'jewrine_organisation', 'jewrine_scientifique',
]


def seed_matrice_comptes(apps, schema_editor):
    """La rubrique 'comptes' (gestion des membres) expose des données personnelles
    (téléphone, adresse, numéro Wave...) : contrairement aux autres rubriques, l'accès
    n'est PAS ouvert par défaut. On force explicitement à False pour tous les rôles non-admin,
    pour que ça corresponde au comportement actuel (admin uniquement) et que l'admin général
    doive l'activer explicitement depuis la page Rôles & Permissions s'il veut déléguer.
    update_or_create (pas get_or_create) : si la page Rôles & Permissions a déjà été ouverte
    avant ce correctif, elle a pu créer ces lignes avec les valeurs permissives génériques
    (peut_voir=True pour tous, tout à True pour 'jewrin') — on les corrige ici explicitement."""
    MatricePermissionRole = apps.get_model('accounts', 'MatricePermissionRole')
    for role in ROLES_NON_ADMIN:
        MatricePermissionRole.objects.update_or_create(
            role=role, rubrique='comptes',
            defaults={
                'peut_voir': False, 'peut_creer': False, 'peut_modifier': False,
                'peut_supprimer': False, 'peut_valider': False,
            },
        )


def unseed_matrice_comptes(apps, schema_editor):
    MatricePermissionRole = apps.get_model('accounts', 'MatricePermissionRole')
    MatricePermissionRole.objects.filter(rubrique='comptes', role__in=ROLES_NON_ADMIN).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0011_journalaudit_user_agent'),
    ]

    operations = [
        migrations.RunPython(seed_matrice_comptes, unseed_matrice_comptes),
    ]
