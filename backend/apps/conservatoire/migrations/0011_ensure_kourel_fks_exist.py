"""
Migration de sécurité : s'assure que les colonnes FK de Kourel existent dans PostgreSQL.
Idempotente grâce à IF NOT EXISTS — peut tourner même si 0010 a déjà créé ces colonnes.
Nécessaire quand django_migrations enregistre 0010 comme appliqué mais que les colonnes
manquent réellement (ex : restauration de backup ou transaction incomplète).
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('conservatoire', '0010_add_responsable_maitre2_jewrine_kourel'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE conservatoire_kourel
                    ADD COLUMN IF NOT EXISTS responsable_id integer
                        REFERENCES accounts_customuser(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

                ALTER TABLE conservatoire_kourel
                    ADD COLUMN IF NOT EXISTS maitre_de_coeur_2_id integer
                        REFERENCES accounts_customuser(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

                ALTER TABLE conservatoire_kourel
                    ADD COLUMN IF NOT EXISTS jewrine_id integer
                        REFERENCES accounts_customuser(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
