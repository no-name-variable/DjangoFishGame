"""Use case: статус всех рыболовных сессий (polling)."""

from dataclasses import dataclass

from django.utils import timezone

from apps.fishing.models import FightState, FishingSession, GameTime
from apps.fishing.services.bite_calculator import BiteCalculatorService
from apps.fishing.services.fish_selector import FishSelectorService

SELECT_RELATED = (
    'location', 'rod__rod_type', 'rod__reel', 'rod__line',
    'rod__hook', 'rod__bait', 'rod__lure', 'hooked_species',
)


@dataclass
class FishingStatusResult:
    sessions: list
    fights: dict
    game_time: object


class FishingStatusUseCase:
    """Получить статус всех сессий. Для каждой WAITING — try_bite()."""

    def __init__(
        self,
        bite_calculator: BiteCalculatorService,
        fish_selector: FishSelectorService,
    ):
        self._bite = bite_calculator
        self._fish = fish_selector

    def execute(self, player) -> FishingStatusResult:
        """Возвращает статус всех сессий игрока."""
        sessions = list(
            FishingSession.objects.filter(player=player)
            .select_related(*SELECT_RELATED)
            .order_by('slot')
        )

        gt = GameTime.get_instance()

        if not sessions:
            return FishingStatusResult(sessions=[], fights={}, game_time=gt)

        # Сбрасываем протухшие поклёвки (> 3 секунд без подсечки)
        now = timezone.now()
        for session in sessions:
            if session.state == FishingSession.State.BITE and session.bite_time:
                if (now - session.bite_time).total_seconds() > 3:
                    session.state = FishingSession.State.WAITING
                    session.hooked_species = None
                    session.hooked_weight = None
                    session.hooked_length = None
                    session.bite_time = None
                    session.save()

        # Для каждой WAITING — пробуем поклёвку и обновляем прогресс проводки
        for session in sessions:
            if session.state == FishingSession.State.WAITING:
                # Обновляем прогресс проводки для спиннинга
                if session.rod.rod_class == 'spinning' and session.is_retrieving:
                    increment = session.rod.retrieve_speed * 0.005
                    session.retrieve_progress = min(1.0, session.retrieve_progress + increment)
                    session.save(update_fields=['retrieve_progress'])

                    # Если приманка дошла до берега — автоматически вытаскиваем
                    if session.retrieve_progress >= 1.0:
                        session.delete()
                        continue

                if self._bite.try_bite(player, session.location, session.rod, session):
                    fish = self._fish.select_fish(session.location, session.rod)
                    if fish:
                        weight = self._fish.generate_fish_weight(fish, player)
                        length = self._fish.generate_fish_length(fish, weight)
                        session.state = FishingSession.State.BITE
                        session.bite_time = timezone.now()
                        session.hooked_species = fish
                        session.hooked_weight = weight
                        session.hooked_length = length
                        session.save()

        # Собираем fights
        fights = {}
        for session in sessions:
            if session.state == FishingSession.State.FIGHTING:
                try:
                    fights[session.pk] = session.fight
                except FightState.DoesNotExist:
                    pass

        return FishingStatusResult(sessions=sessions, fights=fights, game_time=gt)
