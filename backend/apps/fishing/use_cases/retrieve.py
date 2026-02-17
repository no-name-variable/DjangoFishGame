"""Use case: вытащить удочку."""

from apps.fishing.models import FishingSession


class RetrieveRodUseCase:
    """Вытащить удочку (удалить сессию WAITING/IDLE)."""

    def execute(self, player, session_id: int) -> None:
        """Raises: FishingSession.DoesNotExist, ValueError."""
        session = FishingSession.objects.select_related('rod').get(
            pk=session_id, player=player,
        )
        allowed = [FishingSession.State.IDLE, FishingSession.State.WAITING]
        if session.state not in allowed:
            raise ValueError('Сессия не в нужном состоянии.')
        session.delete()
