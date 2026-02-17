from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('tackle', '0002_add_hook_image'),
        ('world', '0002_location_travel_cost'),
    ]

    operations = [
        migrations.CreateModel(
            name='FishPriceDynamic',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sold_weight_today', models.FloatField(default=0.0, verbose_name='Продано кг сегодня')),
                ('location', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='price_dynamics',
                    to='world.location',
                    verbose_name='Локация',
                )),
                ('species', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='price_dynamics',
                    to='tackle.fishspecies',
                    verbose_name='Вид рыбы',
                )),
            ],
            options={
                'verbose_name': 'Динамика цены рыбы',
                'verbose_name_plural': 'Динамика цен рыбы',
                'unique_together': {('species', 'location')},
            },
        ),
    ]
