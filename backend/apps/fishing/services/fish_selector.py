"""Выбор вида рыбы при поклёвке (weighted random)."""

import random

from apps.fishing.services.time_service import TimeService
from apps.home.services import MoonshineService
from apps.potions.services import PotionService


class FishSelectorService:
    """Сервис выбора рыбы при поклёвке."""

    def __init__(self, time_service: TimeService, potion_service: PotionService, moonshine_service: MoonshineService):
        self._time = time_service
        self._potions = potion_service
        self._moonshine = moonshine_service

    def select_fish(self, location, rod_setup):
        """
        Выбирает вид рыбы для поклёвки на основе весов.

        Учитывает: spawn_weight локации, совместимость наживки/приманки,
        время суток, глубину.
        """
        location_fish = location.location_fish.select_related('fish').all()
        if not location_fish:
            return None

        candidates = []
        weights = []

        # Получить активный прикорм для бонуса к целевым видам
        from apps.fishing.models import GroundbaitSpot
        groundbait_species_ids = set()
        active_spot = GroundbaitSpot.objects.filter(
            player=rod_setup.player,
            location=location,
        ).select_related('groundbait').first()
        if active_spot and active_spot.is_active():
            groundbait_species_ids = set(
                active_spot.groundbait.target_species.values_list('pk', flat=True)
            )

        for lf in location_fish:
            fish = lf.fish
            weight = lf.spawn_weight

            # Модификатор времени суток
            weight *= self._time.get_time_of_day_modifier(fish)

            # Модификатор наживки
            if rod_setup.bait and rod_setup.bait.target_species.filter(pk=fish.pk).exists():
                weight *= 2.0

            # Модификатор глубины
            depth = rod_setup.depth_setting
            if fish.preferred_depth_min <= depth <= fish.preferred_depth_max:
                weight *= 1.5
            else:
                weight *= 0.3

            # Модификатор прикормки (целевые виды)
            if fish.pk in groundbait_species_ids:
                weight *= 1.8

            if weight > 0:
                candidates.append(lf)
                weights.append(weight)

        if not candidates:
            return None

        # Модификатор зелья редкости (увеличивает вес редких рыб)
        rarity_val = self._potions.get_potion_effect_value(rod_setup.player, 'rarity')
        if rarity_val:
            for i, lf in enumerate(candidates):
                if lf.fish.rarity in ('rare', 'trophy', 'legendary'):
                    weights[i] *= rarity_val

        # Модификатор самогона (luck — редкие рыбы)
        luck_val = self._moonshine.get_buff_effect_value(rod_setup.player, 'luck')
        if luck_val:
            for i, lf in enumerate(candidates):
                if lf.fish.rarity in ('rare', 'trophy', 'legendary'):
                    weights[i] *= (1.0 + luck_val)

        selected = random.choices(candidates, weights=weights, k=1)[0]
        return selected.fish

    def generate_fish_weight(self, species, player=None):
        """
        Генерирует вес рыбы в пределах диапазона вида.
        Распределение: больше мелких, меньше крупных (бета-распределение).
        Зелье трофея сдвигает распределение в сторону крупных экземпляров.
        """
        min_w = species.weight_min
        max_w = species.weight_max

        alpha, beta_param = 2, 5
        if player:
            trophy_val = self._potions.get_potion_effect_value(player, 'trophy')
            if trophy_val:
                alpha = 3
                beta_param = 3  # Сдвиг к крупным экземплярам

        raw = random.betavariate(alpha, beta_param)
        weight = min_w + (max_w - min_w) * raw
        return round(weight, 3)

    def generate_fish_length(self, species, weight):
        """Генерирует длину рыбы пропорционально весу."""
        weight_ratio = (weight - species.weight_min) / max(species.weight_max - species.weight_min, 0.01)
        length = species.length_min + (species.length_max - species.length_min) * weight_ratio
        length *= random.uniform(0.9, 1.1)
        return round(max(species.length_min, min(species.length_max, length)), 1)
