"""Расчёт вероятности поклёвки."""

import random

from apps.fishing.services.time_service import TimeService
from apps.home.services import MoonshineService
from apps.potions.services import PotionService


class BiteCalculatorService:
    """Сервис расчёта шанса поклёвки с модификаторами."""

    def __init__(self, time_service: TimeService, potion_service: PotionService, moonshine_service: MoonshineService):
        self._time = time_service
        self._potions = potion_service
        self._moonshine = moonshine_service

    def calculate_bite_chance(self, player, location, rod_setup, session=None):
        """
        Рассчитывает шанс поклёвки за один тик.

        Возвращает: float (0.0 - 1.0) — вероятность поклёвки.
        """
        base_chance = 0.05  # 5% базовый шанс за тик

        modifiers = 1.0

        # Модификатор времени суток (средний по рыбам локации)
        tod = self._time.get_time_of_day()
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

        # Модификатор зелья удачи
        luck_val = self._potions.get_potion_effect_value(player, 'luck')
        if luck_val:
            modifiers *= 1.3  # +30% шанс поклёвки с зельем удачи

        # Модификатор зелья трофея (привлекает крупную рыбу, немного повышает шанс)
        trophy_val = self._potions.get_potion_effect_value(player, 'trophy')
        if trophy_val:
            modifiers *= 1.1

        # Модификатор самогона (bite_boost)
        bite_val = self._moonshine.get_buff_effect_value(player, 'bite_boost')
        if bite_val:
            modifiers *= (1.0 + bite_val)

        return min(base_chance * modifiers, 0.5)  # Не более 50% за тик

    def try_bite(self, player, location, rod_setup, session=None):
        """Попытка поклёвки. Возвращает True, если поклёвка произошла."""
        chance = self.calculate_bite_chance(player, location, rod_setup, session)
        return random.random() < chance
