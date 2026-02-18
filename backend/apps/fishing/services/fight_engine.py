"""Движок вываживания рыбы."""

import math
import random

from apps.fishing.models import FightState

# Нормализованная сила рыбы: 1–10 (логарифмическая шкала)
_RARITY_MULT = {
    'common': 1.0, 'uncommon': 1.2, 'rare': 1.5,
    'trophy': 2.0, 'legendary': 3.0,
}


def _normalized_strength(fish_weight, rarity):
    """Сила рыбы 1–10: лог. шкала от веса × редкость."""
    raw = fish_weight * _RARITY_MULT.get(rarity, 1.0)
    return min(max(1.0 + math.log1p(raw) * 2.0, 1.0), 10.0)


class FightEngineService:
    """Движок вываживания: создание боя, подмотка, подтяжка, ожидание."""

    def create_fight(self, session, fish_weight, fish_species):
        """Создать состояние вываживания."""
        strength = _normalized_strength(fish_weight, fish_species.rarity)

        # Дистанция зависит от точки заброса (упрощённо — от 10 до 30 м)
        distance = random.uniform(10, 30)

        fight = FightState.objects.create(
            session=session,
            fish_strength=strength,
            line_tension=20,
            distance=distance,
            rod_durability=session.rod.durability_current,
        )
        return fight

    def reel_in(self, fight):
        """
        Подмотка — приближает рыбу, увеличивает натяжение.
        Возвращает результат: 'fighting', 'caught', 'line_break', 'rod_break'.
        """
        rod = fight.session.rod

        # Тяга катушки → подтяжка ~1 м (слабая катушка) .. ~2 м (сильная)
        reel_power = rod.reel.drag_power if rod.reel else 2.0
        pull_distance = (reel_power / 6) * random.uniform(0.8, 1.8)
        fight.distance = max(0, fight.distance - pull_distance)

        # Натяжение: +1..4 в зависимости от силы рыбы (1–10)
        tension_add = 1 + fight.fish_strength * random.uniform(0.1, 0.5)
        fight.line_tension += tension_add

        _fish_action(fight)

        fight.save()
        return _check_result(fight)

    def pull_rod(self, fight):
        """Подтяжка удилищем — сильнее приближает, больше нагрузка."""
        rod = fight.session.rod
        reel_power = rod.reel.drag_power if rod.reel else 2.0
        pull_distance = (reel_power / 6) * random.uniform(1.5, 3.0)
        fight.distance = max(0, fight.distance - pull_distance)

        # Больше натяжение: +3..9
        tension_add = 2 + fight.fish_strength * random.uniform(0.2, 0.7)
        fight.line_tension += tension_add

        # Износ удилища
        fight.rod_durability -= 1

        _fish_action(fight)

        fight.save()
        return _check_result(fight)

    def wait_action(self, fight):
        """Ожидание — натяжение снижается, рыба может дёрнуть."""
        fight.line_tension = max(0, fight.line_tension - 8)
        _fish_action(fight)
        fight.save()
        return _check_result(fight)


def _fish_action(fight):
    """Рывок рыбы (автоматический)."""
    if random.random() < 0.2:
        # Рывок: дистанция +0.5..2.5 м, натяжение +2..6
        fight.distance += random.uniform(0.3, 0.8) + fight.fish_strength * 0.15
        fight.line_tension += random.uniform(1.5, 3.5) + fight.fish_strength * 0.2

    # Естественное снижение натяжения
    fight.line_tension = max(0, fight.line_tension - 2)

    # Рыба устаёт со временем
    fight.fish_strength = max(fight.fish_strength * 0.97, 1.0)


def _check_result(fight):
    """Проверка результата вываживания."""
    # Проверка обрыва лески: натяжение vs прочность лески
    # Формула: 5кг леска → порог 100, 2кг → 82, 8кг → 118
    line = fight.session.rod.line
    line_limit = (70 + line.breaking_strength * 6) if line else 100
    if fight.line_tension >= line_limit:
        return 'line_break'

    if fight.distance <= 0:
        return 'caught'
    if fight.rod_durability <= 0:
        return 'rod_break'
    return 'fighting'
