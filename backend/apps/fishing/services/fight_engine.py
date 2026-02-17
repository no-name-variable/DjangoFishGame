"""Движок вываживания рыбы."""

import random

from apps.fishing.models import FightState


class FightEngineService:
    """Движок вываживания: создание боя, подмотка, подтяжка, ожидание."""

    def create_fight(self, session, fish_weight, fish_species):
        """Создать состояние вываживания."""
        # Сила рыбы зависит от веса и редкости
        rarity_mult = {
            'common': 1.0, 'uncommon': 1.2, 'rare': 1.5,
            'trophy': 2.0, 'legendary': 3.0,
        }
        strength = fish_weight * 3 * rarity_mult.get(fish_species.rarity, 1.0)

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

        # Тяга катушки
        reel_power = rod.reel.drag_power if rod.reel else 2.0
        pull_distance = reel_power * random.uniform(0.5, 1.5)
        fight.distance = max(0, fight.distance - pull_distance)

        # Натяжение увеличивается
        tension_add = fight.fish_strength * random.uniform(0.3, 1.0)
        fight.line_tension = min(100, fight.line_tension + tension_add)

        # Рыба сопротивляется
        _fish_action(fight)

        fight.save()
        return _check_result(fight)

    def pull_rod(self, fight):
        """Подтяжка удилищем — сильнее приближает, больше нагрузка."""
        rod = fight.session.rod
        reel_power = rod.reel.drag_power if rod.reel else 2.0
        pull_distance = reel_power * random.uniform(1.0, 2.0)
        fight.distance = max(0, fight.distance - pull_distance)

        # Больше натяжение
        tension_add = fight.fish_strength * random.uniform(0.5, 1.5)
        fight.line_tension = min(100, fight.line_tension + tension_add)

        # Износ удилища
        fight.rod_durability -= 1

        _fish_action(fight)

        fight.save()
        return _check_result(fight)

    def wait_action(self, fight):
        """Ожидание — натяжение снижается, рыба может дёрнуть."""
        fight.line_tension = max(0, fight.line_tension - 5)
        _fish_action(fight)
        fight.save()
        return _check_result(fight)


def _fish_action(fight):
    """Рывок рыбы (автоматический)."""
    if random.random() < 0.3:
        # Рывок
        fight.distance += fight.fish_strength * random.uniform(0.5, 2.0)
        fight.line_tension = min(100, fight.line_tension + random.uniform(5, 15))

    # Естественное снижение натяжения
    fight.line_tension = max(0, fight.line_tension - 2)

    # Рыба устаёт со временем
    fight.fish_strength = max(fight.fish_strength * 0.98, 1.0)


def _check_result(fight):
    """Проверка результата вываживания."""
    # Проверка прочности лески
    line = fight.session.rod.line
    if line and fight.line_tension >= 100:
        line_strength_check = fight.line_tension / 100
        if random.random() < line_strength_check:
            return 'line_break'

    if fight.line_tension >= 100:
        return 'line_break'
    if fight.distance <= 0:
        return 'caught'
    if fight.rod_durability <= 0:
        return 'rod_break'
    return 'fighting'
