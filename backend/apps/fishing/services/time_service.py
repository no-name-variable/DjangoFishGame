"""Сервис игрового времени."""

from apps.fishing.models import GameTime


class TimeService:
    """Сервис для работы с игровым временем и фазами суток."""

    def get_game_time(self):
        """Получить текущее игровое время."""
        return GameTime.get_instance()

    def get_time_of_day(self):
        """Получить текущую фазу суток."""
        return self.get_game_time().time_of_day

    def get_time_of_day_modifier(self, fish_species):
        """Модификатор клёва по времени суток для конкретного вида рыбы."""
        tod = self.get_time_of_day()
        active_time = fish_species.active_time or {}
        return active_time.get(tod, 0.5)
