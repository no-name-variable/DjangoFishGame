"""Конфигурация Celery."""

import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('russian_fishing')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()


# Автоматическое расписание периодических задач
app.conf.beat_schedule = {
    # Продвижение игрового времени - каждые 30 секунд
    'advance-game-time': {
        'task': 'apps.fishing.tasks.advance_game_time',
        'schedule': 30.0,  # секунды
    },
    # Снижение голода - каждые 5 минут
    'hunger-tick': {
        'task': 'apps.fishing.tasks.hunger_tick',
        'schedule': 300.0,  # 5 минут * 60
    },
    # Очистка истёкших прикормочных пятен - каждый час
    'cleanup-expired-groundbait': {
        'task': 'apps.fishing.tasks.cleanup_expired_groundbait',
        'schedule': 3600.0,  # 1 час
    },
    # Удаление истёкших зелий - каждый час
    'expire-potions': {
        'task': 'apps.potions.tasks.expire_potions',
        'schedule': 3600.0,  # 1 час
    },
    # Завершение турниров - каждые 10 минут
    'check-and-finalize-tournaments': {
        'task': 'apps.tournaments.tasks.check_and_finalize_tournaments',
        'schedule': 600.0,  # 10 минут
    },
    # Рыбнадзор - каждые 30 минут
    'fish-inspection': {
        'task': 'apps.inspection.tasks.fish_inspection',
        'schedule': 1800.0,  # 30 минут
    },
}
