"""Celery-задачи для tackle — управление ценами рыбы."""

from celery import shared_task


@shared_task
def reset_fish_prices():
    """
    Сброс динамических цен рыбы.
    Запускается каждый игровой день (через Celery beat).
    Обнуляет sold_weight_today для всех записей FishPriceDynamic.
    """
    from .models import FishPriceDynamic
    updated = FishPriceDynamic.objects.update(sold_weight_today=0.0)
    return f'Сброшены цены: {updated} записей'
