"""Use case: сменить компоненты снасти."""

from django.contrib.contenttypes.models import ContentType
from django.shortcuts import get_object_or_404

from apps.fishing.models import FishingSession
from apps.tackle.models import Bait, FloatTackle, Hook

from ..models import InventoryItem, PlayerRod


COMPONENT_MAP = {
    'hook_id': ('hook', Hook),
    'float_tackle_id': ('float_tackle', FloatTackle),
    'bait_id': ('bait', Bait),
}


class ChangeTackleUseCase:
    """Сменить компоненты снасти (крючок, поплавок, приманка, наживка)."""

    def execute(self, player, rod_id: int, data: dict) -> PlayerRod:
        """Raises: PlayerRod.DoesNotExist, ValueError."""
        try:
            rod = PlayerRod.objects.get(pk=rod_id, player=player)
        except PlayerRod.DoesNotExist:
            raise PlayerRod.DoesNotExist('Снасть не найдена.')

        if FishingSession.objects.filter(rod=rod).exists():
            raise ValueError('Вытащите удочку перед сменой снасти.')

        for key, (field, model) in COMPONENT_MAP.items():
            if key not in data:
                continue
            value = data[key]
            if value is None:
                setattr(rod, field, None)
                if field == 'bait':
                    rod.bait_remaining = 0
            else:
                try:
                    component = model.objects.get(pk=value)
                except model.DoesNotExist:
                    raise model.DoesNotExist(f'{model.__name__} не найден.')
                ct = ContentType.objects.get_for_model(component)
                if not InventoryItem.objects.filter(
                    player=player, content_type=ct,
                    object_id=component.pk, quantity__gte=1,
                ).exists():
                    raise ValueError(f'{component.name} нет в инвентаре.')
                setattr(rod, field, component)
                if field == 'bait':
                    rod.bait_remaining = component.quantity_per_pack

        rod.save()
        return rod
