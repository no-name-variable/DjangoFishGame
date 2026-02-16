"""Конфигурация приложения зелий."""

from django.apps import AppConfig


class PotionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.potions'
    verbose_name = 'Зелья'
