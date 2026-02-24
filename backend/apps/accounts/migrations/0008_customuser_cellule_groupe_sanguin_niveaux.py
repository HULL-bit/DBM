# Champs cellule, groupe_sanguin, niveau_alquran, niveau_majalis

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_alter_customuser_role_max_length'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='cellule',
            field=models.CharField(
                choices=[('dakar', 'Dakar'), ('touba_mbacke', 'Touba / Mbacké'), ('diaspora', 'Diaspora')],
                max_length=30,
                blank=True,
            ),
        ),
        migrations.AddField(
            model_name='customuser',
            name='groupe_sanguin',
            field=models.CharField(
                choices=[
                    ('A+', 'A+'), ('A-', 'A-'), ('B+', 'B+'), ('B-', 'B-'),
                    ('AB+', 'AB+'), ('AB-', 'AB-'), ('O+', 'O+'), ('O-', 'O-'),
                ],
                max_length=5,
                blank=True,
            ),
        ),
        migrations.AddField(
            model_name='customuser',
            name='niveau_alquran',
            field=models.CharField(
                choices=[
                    ('faible', 'Faible'), ('debutant', 'Débutant'), ('moyen', 'Moyen'),
                    ('intermediaire', 'Intermédiaire'), ('avance', 'Avancé'),
                ],
                max_length=20,
                blank=True,
            ),
        ),
        migrations.AddField(
            model_name='customuser',
            name='niveau_majalis',
            field=models.CharField(
                choices=[
                    ('faible', 'Faible'), ('debutant', 'Débutant'), ('moyen', 'Moyen'),
                    ('intermediaire', 'Intermédiaire'), ('avance', 'Avancé'),
                ],
                max_length=20,
                blank=True,
            ),
        ),
    ]
