"""Celery-задачи дома рыбака."""

from celery import shared_task


@shared_task
def check_brewing_ready():
    """Переводит готовые сессии варки brewing -> ready."""
    from apps.fishing.models import GameTime
    from apps.home.models import BrewingSession

    gt = GameTime.get_instance()
    brewing = BrewingSession.objects.filter(status=BrewingSession.Status.BREWING)

    count = 0
    for session in brewing:
        if gt.current_day > session.ready_at_day or (
            gt.current_day == session.ready_at_day and gt.current_hour >= session.ready_at_hour
        ):
            session.status = BrewingSession.Status.READY
            session.save(update_fields=['status'])
            count += 1

    return f'Переведено {count} сессий в статус "готов".'


@shared_task
def expire_moonshine_buffs():
    """Удаляет истёкшие баффы самогона."""
    from apps.fishing.models import GameTime
    from apps.home.models import PlayerMoonshineBuff

    gt = GameTime.get_instance()
    expired = PlayerMoonshineBuff.objects.filter(
        expires_at_day__lt=gt.current_day,
    ) | PlayerMoonshineBuff.objects.filter(
        expires_at_day=gt.current_day,
        expires_at_hour__lte=gt.current_hour,
    )
    count = expired.count()
    expired.delete()
    return f'Удалено {count} истёкших баффов самогона.'
