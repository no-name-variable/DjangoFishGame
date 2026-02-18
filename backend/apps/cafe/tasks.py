"""Celery-задачи кафе."""

import random

from celery import shared_task
from django.utils import timezone
from datetime import timedelta


@shared_task
def refresh_cafe_orders():
    """
    Обновление заказов кафе.

    1. Деактивирует истёкшие заказы.
    2. Для каждой локации, где менее 3 активных заказов, генерирует недостающие.
    """
    from apps.cafe.models import CafeOrder
    from apps.world.models import Location, LocationFish

    now = timezone.now()

    # Деактивируем истёкшие
    CafeOrder.objects.filter(
        is_active=True, expires_at__lte=now,
    ).update(is_active=False)

    # Количества по редкости
    qty_ranges = {
        'common': (5, 15),
        'uncommon': (3, 10),
        'rare': (2, 6),
        'trophy': (1, 3),
        'legendary': (1, 2),
    }

    for location in Location.objects.all():
        active_count = CafeOrder.objects.filter(
            location=location, is_active=True, expires_at__gt=now,
        ).count()

        needed = 3 - active_count
        if needed <= 0:
            continue

        # Доступные виды на локации
        location_fish = list(
            LocationFish.objects.filter(
                location=location,
            ).select_related('fish')
        )
        if not location_fish:
            continue

        # Исключаем виды, на которые уже есть активный заказ
        active_species_ids = set(
            CafeOrder.objects.filter(
                location=location, is_active=True, expires_at__gt=now,
            ).values_list('species_id', flat=True)
        )
        available = [lf for lf in location_fish if lf.fish_id not in active_species_ids]
        if not available:
            available = location_fish

        for _ in range(needed):
            if not available:
                break

            lf = random.choice(available)
            species = lf.fish
            available = [x for x in available if x.fish_id != species.pk]

            rarity = species.rarity
            qty_min, qty_max = qty_ranges.get(rarity, (3, 10))
            quantity = random.randint(qty_min, qty_max)

            # Мин. вес: 30-70% от weight_max, округлено до 100г
            weight_max_grams = int(species.weight_max * 1000)
            min_weight = int(weight_max_grams * random.uniform(0.3, 0.7))
            min_weight = max(100, (min_weight // 100) * 100)

            # Награда: sell_price_per_kg × (min_weight/1000) × множитель(1.5-2.5)
            multiplier = random.uniform(1.5, 2.5)
            reward = float(species.sell_price_per_kg) * (min_weight / 1000) * multiplier
            reward = round(reward, 2)

            CafeOrder.objects.create(
                location=location,
                species=species,
                quantity_required=quantity,
                min_weight_grams=min_weight,
                reward_per_fish=reward,
                expires_at=now + timedelta(hours=12),
            )
