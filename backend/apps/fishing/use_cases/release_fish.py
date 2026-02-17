"""Use case: отпустить рыбу (+карма)."""

from dataclasses import dataclass

from apps.fishing.models import FishingSession


@dataclass
class ReleaseFishResult:
    karma_bonus: int
    karma_total: int


class ReleaseFishUseCase:
    """Отпустить пойманную рыбу, получить карму и немного опыта."""

    def execute(self, player, session_id: int) -> ReleaseFishResult:
        """Raises: FishingSession.DoesNotExist, ValueError."""
        session = FishingSession.objects.select_related(
            'rod', 'hooked_species',
        ).get(pk=session_id, player=player)

        if session.state != FishingSession.State.CAUGHT:
            raise ValueError('Сессия не в нужном состоянии.')

        karma_bonus = max(1, int(session.hooked_weight))
        player.karma += karma_bonus
        player.save(update_fields=['karma'])

        exp = int(session.hooked_species.experience_per_kg * session.hooked_weight * 0.5)
        player.add_experience(exp)

        # Расходуем наживку
        rod = session.rod
        if rod.bait and rod.bait_remaining > 0:
            rod.bait_remaining -= 1
            rod.save(update_fields=['bait_remaining'])

        session.delete()

        return ReleaseFishResult(
            karma_bonus=karma_bonus,
            karma_total=player.karma,
        )
