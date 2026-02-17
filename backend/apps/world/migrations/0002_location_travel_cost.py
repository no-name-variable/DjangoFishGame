from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('world', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='location',
            name='travel_cost',
            field=models.DecimalField(
                decimal_places=2, default=0,
                max_digits=10, verbose_name='Стоимость входа',
            ),
        ),
    ]
