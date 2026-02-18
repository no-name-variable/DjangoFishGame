"""Use cases: подмотка и подтяжка (вываживание)."""

from dataclasses import dataclass

from apps.fishing.models import FightState, FishingSession
from apps.fishing.services.fight_engine import FightEngineService


@dataclass
class FightActionResult:
    result: str  # 'fighting', 'caught', 'line_break', 'rod_break'
    session_id: int
    # Данные при caught
    fish_name: str | None = None
    species_id: int | None = None
    species_image: str | None = None
    weight: float | None = None
    length: float | None = None
    rarity: str | None = None
    # Данные при fighting
    tension: float | None = None
    distance: float | None = None
    rod_durability: float | None = None


class ReelInUseCase:
    """Подмотка при вываживании."""

    def __init__(self, fight_engine: FightEngineService):
        self._engine = fight_engine

    def execute(self, player, session_id: int) -> FightActionResult:
        """Raises: FishingSession.DoesNotExist, ValueError."""
        return _fight_action(player, session_id, self._engine.reel_in)


class PullRodUseCase:
    """Подтяжка удилищем при вываживании."""

    def __init__(self, fight_engine: FightEngineService):
        self._engine = fight_engine

    def execute(self, player, session_id: int) -> FightActionResult:
        """Raises: FishingSession.DoesNotExist, ValueError."""
        return _fight_action(player, session_id, self._engine.pull_rod)


def _fight_action(player, session_id, action_func) -> FightActionResult:
    """Общая логика fight action (reel_in / pull_rod)."""
    session = FishingSession.objects.select_related(
        'rod__rod_type', 'rod__reel', 'rod__line',
        'rod__hook', 'hooked_species',
    ).get(pk=session_id, player=player)

    if session.state != FishingSession.State.FIGHTING:
        raise ValueError('Сессия не в нужном состоянии.')

    try:
        fight = session.fight
    except FightState.DoesNotExist:
        raise ValueError('Нет состояния вываживания.')

    result = action_func(fight)

    if result == 'caught':
        # Сохраняем износ удилища после вываживания
        rod = session.rod
        rod.durability_current = max(0, int(fight.rod_durability))
        rod.save(update_fields=['durability_current'])

        session.state = FishingSession.State.CAUGHT
        session.save()
        species = session.hooked_species
        return FightActionResult(
            result='caught',
            session_id=session.pk,
            fish_name=species.name_ru,
            species_id=species.pk,
            species_image=species.image.url if species.image else None,
            weight=session.hooked_weight,
            length=session.hooked_length,
            rarity=species.rarity,
        )

    if result in ('line_break', 'rod_break'):
        rod = session.rod
        if result == 'rod_break':
            rod.durability_current = 0
        else:
            rod.durability_current = max(0, int(fight.rod_durability))
            # Обрыв лески — теряем леску, крючок и наживку
            rod.line = None
            rod.hook = None
            rod.bait = None
            rod.bait_remaining = 0
            rod.is_assembled = False
        rod.save(update_fields=[
            'durability_current', 'line', 'hook', 'bait',
            'bait_remaining', 'is_assembled',
        ])
        session.delete()
        return FightActionResult(result=result, session_id=session_id)

    return FightActionResult(
        result='fighting',
        session_id=session.pk,
        tension=fight.line_tension,
        distance=fight.distance,
        rod_durability=fight.rod_durability,
    )
