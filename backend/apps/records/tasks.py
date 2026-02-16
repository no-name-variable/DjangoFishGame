"""Celery-задачи для рекордов."""

from celery import shared_task
from django.utils import timezone


@shared_task
def calculate_weekly_records():
    """
    Подсчёт рекордсменов недели (вызывается по понедельникам).
    Сбрасывает предыдущие weekly champion и выбирает новых.
    """
    from .models import FishRecord

    # Сбросить предыдущих чемпионов
    FishRecord.objects.filter(is_weekly_champion=True).update(is_weekly_champion=False)

    # Найти рекорды за последнюю неделю
    week_ago = timezone.now() - timezone.timedelta(days=7)
    recent_records = FishRecord.objects.filter(caught_at__gte=week_ago)

    # Для каждого вида — лучший результат за неделю
    species_ids = recent_records.values_list('species_id', flat=True).distinct()
    for species_id in species_ids:
        best = recent_records.filter(species_id=species_id).order_by('-weight').first()
        if best:
            best.is_weekly_champion = True
            best.save(update_fields=['is_weekly_champion'])
