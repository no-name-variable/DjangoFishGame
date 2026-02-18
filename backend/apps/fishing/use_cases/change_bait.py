"""Use case: сменить наживку на удочке."""

from dataclasses import dataclass

from django.contrib.contenttypes.models import ContentType

from apps.fishing.models import FishingSession
from apps.inventory.models import InventoryItem
from apps.tackle.models import Bait


@dataclass
class ChangeBaitResult:
    session_id: int
    new_bait_name: str
    bait_remaining: int


class ChangeBaitUseCase:
    """Сменить наживку на удочке во время рыбалки (только WAITING)."""

    def execute(
        self, player, session_id: int, bait_id: int,
    ) -> ChangeBaitResult:
        """Raises: FishingSession.DoesNotExist, Bait.DoesNotExist, ValueError."""
        session = FishingSession.objects.select_related('rod__bait').get(
            pk=session_id, player=player,
        )
        if session.state != FishingSession.State.WAITING:
            raise ValueError('Сессия не в нужном состоянии.')

        try:
            bait = Bait.objects.get(pk=bait_id)
        except Bait.DoesNotExist:
            raise Bait.DoesNotExist('Наживка не найдена.')

        ct = ContentType.objects.get_for_model(bait)
        if not InventoryItem.objects.filter(
            player=player, content_type=ct, object_id=bait.pk, quantity__gte=1,
        ).exists():
            raise ValueError('Нет наживки в инвентаре.')

        # Обновляем удочку (наживка не списывается из инвентаря)
        rod = session.rod
        rod.bait = bait
        rod.bait_remaining = bait.quantity_per_pack
        rod.save(update_fields=['bait', 'bait_remaining'])

        return ChangeBaitResult(
            session_id=session.pk,
            new_bait_name=bait.name,
            bait_remaining=rod.bait_remaining,
        )
