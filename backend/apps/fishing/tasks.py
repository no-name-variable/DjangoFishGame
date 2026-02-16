"""Celery-задачи рыбалки."""

from celery import shared_task
from django.conf import settings
from django.db.models import F
from django.utils import timezone


@shared_task
def advance_game_time():
    """Продвинуть игровое время на 1 час."""
    from .models import GameTime

    gt = GameTime.get_instance()
    gt.current_hour += 1
    if gt.current_hour >= 24:
        gt.current_hour = 0
        gt.current_day += 1
    gt.last_tick = timezone.now()
    gt.save()


@shared_task
def hunger_tick():
    """Снизить сытость у активных игроков."""
    from apps.accounts.models import Player

    decrease = settings.GAME_SETTINGS['HUNGER_DECREASE']
    Player.objects.filter(
        current_location__isnull=False, hunger__gt=0,
    ).update(hunger=F('hunger') - decrease)
    Player.objects.filter(hunger__lt=0).update(hunger=0)


@shared_task
def cleanup_expired_groundbait():
    """Удалить истёкшие прикормочные пятна."""
    from .models import GameTime, GroundbaitSpot

    gt = GameTime.get_instance()

    # Удаляем прикормку, у которой истёк срок
    expired = GroundbaitSpot.objects.filter(
        expires_at_day__lt=gt.current_day,
    ) | GroundbaitSpot.objects.filter(
        expires_at_day=gt.current_day,
        expires_at_hour__lte=gt.current_hour,
    )

    count = expired.count()
    expired.delete()
    return f'Удалено {count} истёкших прикормочных пятен.'
