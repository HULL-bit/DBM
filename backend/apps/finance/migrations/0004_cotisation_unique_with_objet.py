# Permettre plusieurs assignations par membre/mois/année (ex: MAGAL, GAMOU)

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0003_alter_cotisationmensuelle_unique_together'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='cotisationmensuelle',
            unique_together={('membre', 'mois', 'annee', 'type_cotisation', 'objet_assignation')},
        ),
    ]
