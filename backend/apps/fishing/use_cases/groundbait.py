"""Use case: применить прикормку."""

from dataclasses import dataclass

from django.contrib.contenttypes.models import ContentType

from apps.fishing.models import GameTime, GroundbaitSpot
from apps.inventory.models import InventoryItem
from apps.tackle.models import Flavoring, Groundbait


@dataclass
class ApplyGroundbaitResult:
    message: str
    duration_hours: int
    flavoring_name: str | None


class ApplyGroundbaitUseCase:
    """Бросить прикормку в точку ловли."""

    def execute(
        self, player, groundbait_id: int, flavoring_id: int | None = None,
    ) -> ApplyGroundbaitResult:
        """Raises: ValueError, Groundbait.DoesNotExist, Flavoring.DoesNotExist."""
        if not player.current_location:
            raise ValueError('Вы не на локации.')

        try:
            groundbait = Groundbait.objects.get(pk=groundbait_id)
        except Groundbait.DoesNotExist:
            raise Groundbait.DoesNotExist('Прикормка не найдена.')

        ct = ContentType.objects.get_for_model(groundbait)
        inv = InventoryItem.objects.filter(
            player=player, content_type=ct, object_id=groundbait.pk, quantity__gte=1,
        ).first()
        if not inv:
            raise ValueError('Нет прикормки в инвентаре.')

        flavoring = None
        if flavoring_id:
            try:
                flavoring = Flavoring.objects.get(pk=flavoring_id)
            except Flavoring.DoesNotExist:
                raise Flavoring.DoesNotExist('Ароматизатор не найден.')
            ct_f = ContentType.objects.get_for_model(flavoring)
            inv_f = InventoryItem.objects.filter(
                player=player, content_type=ct_f, object_id=flavoring.pk, quantity__gte=1,
            ).first()
            if not inv_f:
                raise ValueError('Нет ароматизатора в инвентаре.')
            inv_f.quantity -= 1
            if inv_f.quantity <= 0:
                inv_f.delete()
            else:
                inv_f.save(update_fields=['quantity'])

        inv.quantity -= 1
        if inv.quantity <= 0:
            inv.delete()
        else:
            inv.save(update_fields=['quantity'])

        gt = GameTime.get_instance()
        expire_hour = gt.current_hour + groundbait.duration_hours
        expire_day = gt.current_day + expire_hour // 24
        expire_hour = expire_hour % 24

        GroundbaitSpot.objects.create(
            player=player,
            location=player.current_location,
            groundbait=groundbait,
            flavoring=flavoring,
            expires_at_hour=expire_hour,
            expires_at_day=expire_day,
        )

        return ApplyGroundbaitResult(
            message=f'Прикормка "{groundbait.name}" брошена!',
            duration_hours=groundbait.duration_hours,
            flavoring_name=flavoring.name if flavoring else None,
        )
