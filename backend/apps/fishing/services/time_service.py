"""Сервис игрового времени."""

from apps.fishing.models import GameTime


def get_game_time():
    """Получить текущее игровое время."""
    return GameTime.get_instance()


def get_time_of_day():
    """Получить текущую фазу суток."""
    return get_game_time().time_of_day


def get_time_of_day_modifier(fish_species):
    """Модификатор клёва по времени суток для конкретного вида рыбы."""
    tod = get_time_of_day()
    active_time = fish_species.active_time or {}
    return active_time.get(tod, 0.5)
