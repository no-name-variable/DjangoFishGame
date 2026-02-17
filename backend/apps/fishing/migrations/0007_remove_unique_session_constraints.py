"""Убрать уникальные ограничения на сессии рыбалки (вызывали IntegrityError при зависших сессиях)."""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('fishing', '0006_fishingsession_retrieve_progress'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='fishingsession',
            name='unique_player_rod_session',
        ),
        migrations.RemoveConstraint(
            model_name='fishingsession',
            name='unique_player_slot_session',
        ),
    ]
