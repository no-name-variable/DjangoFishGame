"""Конфигурация приложения рыбнадзора."""

from django.apps import AppConfig


class InspectionConfig(AppConfig):
    """Конфигурация приложения рыбнадзора."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.inspection'
    verbose_name = 'Рыбнадзор'
