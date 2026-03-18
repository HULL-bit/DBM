# Generated manually - News (actualités) + réactions

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('informations', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='NewsPost',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titre', models.CharField(max_length=200)),
                ('contenu', models.TextField()),
                ('est_publie', models.BooleanField(default=True)),
                ('date_creation', models.DateTimeField(auto_now_add=True)),
                ('date_modification', models.DateTimeField(auto_now=True)),
                ('auteur', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='news_posts', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Actualité',
                'verbose_name_plural': 'Actualités',
                'ordering': ['-date_creation'],
            },
        ),
        migrations.CreateModel(
            name='NewsImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(upload_to='news/')),
                ('ordre', models.IntegerField(default=0)),
                ('post', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='images', to='informations.newspost')),
            ],
            options={
                'verbose_name': 'Image (actualité)',
                'verbose_name_plural': 'Images (actualité)',
                'ordering': ['ordre', 'id'],
            },
        ),
        migrations.CreateModel(
            name='NewsLike',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_creation', models.DateTimeField(auto_now_add=True)),
                ('membre', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='news_likes', to=settings.AUTH_USER_MODEL)),
                ('post', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='likes', to='informations.newspost')),
            ],
            options={
                'verbose_name': 'Like (actualité)',
                'verbose_name_plural': 'Likes (actualité)',
                'unique_together': {('post', 'membre')},
            },
        ),
        migrations.CreateModel(
            name='NewsBookmark',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_creation', models.DateTimeField(auto_now_add=True)),
                ('membre', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='news_bookmarks', to=settings.AUTH_USER_MODEL)),
                ('post', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bookmarks', to='informations.newspost')),
            ],
            options={
                'verbose_name': 'Enregistrement (actualité)',
                'verbose_name_plural': 'Enregistrements (actualité)',
                'unique_together': {('post', 'membre')},
            },
        ),
        migrations.CreateModel(
            name='NewsComment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('texte', models.TextField()),
                ('date_creation', models.DateTimeField(auto_now_add=True)),
                ('membre', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='news_comments', to=settings.AUTH_USER_MODEL)),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='replies', to='informations.newscomment')),
                ('post', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments', to='informations.newspost')),
            ],
            options={
                'verbose_name': 'Commentaire (actualité)',
                'verbose_name_plural': 'Commentaires (actualité)',
                'ordering': ['date_creation'],
            },
        ),
    ]

