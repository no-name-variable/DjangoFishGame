"""Use case: подсечка при поклёвке."""

from dataclasses import dataclass

from django.utils import timezone

from apps.fishing.models import FishingSession
from apps.fishing.services.fight_engine import FightEngineService


@dataclass
class StrikeResult:
    session_id: int
    fish_name: str
    species_id: int
    species_image: str | None
    tension: float
    distance: float


class StrikeUseCase:
    """Подсечка при поклёвке — переводит сессию в FIGHTING."""

    def __init__(self, fight_engine: FightEngineService):
        self._engine = fight_engine

    def execute(self, player, session_id: int) -> StrikeResult:
        """Raises: FishingSession.DoesNotExist, ValueError."""
        session = FishingSession.objects.select_related(
            'rod__rod_type', 'rod__reel', 'rod__line',
            'rod__hook', 'hooked_species',
        ).get(pk=session_id, player=player)

        if session.state != FishingSession.State.BITE:
            raise ValueError('Сессия не в нужном состоянии.')

        # Проверяем, что нет другой сессии в FIGHTING
        if FishingSession.objects.filter(
            player=player, state=FishingSession.State.FIGHTING,
        ).exists():
            raise ValueError('Уже идёт вываживание на другой удочке.')

        # Проверка таймера подсечки (3 секунды)
        if session.bite_time and (timezone.now() - session.bite_time).total_seconds() > 3:
            session.state = FishingSession.State.WAITING
            session.hooked_species = None
            session.hooked_weight = None
            session.hooked_length = None
            session.save()
            raise ValueError('Поздно! Рыба сошла.')

        session.state = FishingSession.State.FIGHTING
        session.save()

        fight = self._engine.create_fight(session, session.hooked_weight, session.hooked_species)

        species = session.hooked_species
        return StrikeResult(
            session_id=session.pk,
            fish_name=species.name_ru,
            species_id=species.pk,
            species_image=species.image.url if species.image else None,
            tension=fight.line_tension,
            distance=fight.distance,
        )
