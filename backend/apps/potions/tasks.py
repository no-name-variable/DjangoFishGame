"""Celery-задачи зелий."""

from celery import shared_task


@shared_task
def expire_potions():
    """Удаляет истёкшие зелья."""
    from apps.fishing.models import GameTime
    from apps.potions.models import PlayerPotion

    gt = GameTime.get_instance()
    expired = PlayerPotion.objects.filter(
        expires_at_day__lt=gt.current_day,
    ) | PlayerPotion.objects.filter(
        expires_at_day=gt.current_day,
        expires_at_hour__lte=gt.current_hour,
    )
    count = expired.count()
    expired.delete()
    return f'Удалено {count} истёкших зелий.'
