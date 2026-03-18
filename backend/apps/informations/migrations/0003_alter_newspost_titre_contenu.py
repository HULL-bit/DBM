from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('informations', '0002_news_posts'),
    ]

    operations = [
        migrations.AlterField(
            model_name='newspost',
            name='titre',
            field=models.CharField(max_length=200, blank=True),
        ),
        migrations.AlterField(
            model_name='newspost',
            name='contenu',
            field=models.TextField(blank=True),
        ),
    ]

