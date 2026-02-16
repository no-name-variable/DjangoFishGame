"""Расчёт вероятности поклёвки."""

import random

from apps.fishing.services.time_service import get_time_of_day, get_time_of_day_modifier


def calculate_bite_chance(player, location, rod_setup):
    """
    Рассчитывает шанс поклёвки за один тик.

    Возвращает: float (0.0 - 1.0) — вероятность поклёвки.
    """
    base_chance = 0.05  # 5% базовый шанс за тик

    modifiers = 1.0

    # Модификатор времени суток (средний по рыбам локации)
    tod = get_time_of_day()
    location_fish = location.location_fish.select_related('fish').all()
    if location_fish:
        tod_values = []
        for lf in location_fish:
            active_time = lf.fish.active_time or {}
            tod_values.append(active_time.get(tod, 0.5))
        modifiers *= sum(tod_values) / len(tod_values)

    # Модификатор наживки/приманки
    bait_match = False
    if rod_setup.bait:
        bait_match = rod_setup.bait.target_species.filter(
            location_fish__location=location,
        ).exists()
    elif rod_setup.lure:
        bait_match = rod_setup.lure.target_species.filter(
            location_fish__location=location,
        ).exists()
    modifiers *= 1.5 if bait_match else 0.7

    # Модификатор разряда игрока
    rank_mod = 1.0 + min(player.rank, 100) * 0.003  # макс +30%
    modifiers *= rank_mod

    # Модификатор кармы
    if player.karma > 0:
        karma_mod = 1.0 + min(player.karma, 1000) * 0.0002  # макс +20%
    else:
        karma_mod = max(0.8, 1.0 + player.karma * 0.0002)
    modifiers *= karma_mod

    # Модификатор голода
    hunger_mod = 0.7 + (player.hunger / 100) * 0.3  # 0.7 при 0, 1.0 при 100
    modifiers *= hunger_mod

    # Модификатор прикормки
    from apps.fishing.models import GroundbaitSpot
    active_spots = GroundbaitSpot.objects.filter(player=player, location=location)
    for spot in active_spots:
        if spot.is_active():
            groundbait_mod = 1.0 + spot.groundbait.effectiveness * 0.05  # макс +50%
            modifiers *= groundbait_mod
            if spot.flavoring:
                modifiers *= spot.flavoring.bonus_multiplier
            break  # Только один прикорм за раз

    # Модификатор спиннинга: скорость проводки влияет на поклёвку
    if rod_setup.rod_type.rod_class == 'spinning' and rod_setup.lure:
        speed = rod_setup.retrieve_speed  # 1-10
        # Оптимальная скорость 4-7, слишком медленная или быстрая — штраф
        if 4 <= speed <= 7:
            modifiers *= 1.2
        elif speed <= 2 or speed >= 9:
            modifiers *= 0.7
        else:
            modifiers *= 1.0

    # Модификатор зелья удачи
    from apps.potions.services import get_potion_effect_value
    luck_val = get_potion_effect_value(player, 'luck')
    if luck_val:
        modifiers *= 1.3  # +30% шанс поклёвки с зельем удачи

    # Модификатор зелья трофея (привлекает крупную рыбу, немного повышает шанс)
    trophy_val = get_potion_effect_value(player, 'trophy')
    if trophy_val:
        modifiers *= 1.1

    return min(base_chance * modifiers, 0.5)  # Не более 50% за тик


def try_bite(player, location, rod_setup):
    """Попытка поклёвки. Возвращает True, если поклёвка произошла."""
    chance = calculate_bite_chance(player, location, rod_setup)
    return random.random() < chance
