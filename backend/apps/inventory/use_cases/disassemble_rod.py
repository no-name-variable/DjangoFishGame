"""Use case: разобрать удочку (возврат компонентов)."""

from django.contrib.contenttypes.models import ContentType

from apps.fishing.models import FishingSession

from ..models import InventoryItem, PlayerRod


class DisassembleRodUseCase:
    """Разобрать удочку — возврат компонентов в инвентарь."""

    def execute(self, player, rod_id: int) -> None:
        """Raises: PlayerRod.DoesNotExist, ValueError."""
        try:
            rod = PlayerRod.objects.get(pk=rod_id, player=player)
        except PlayerRod.DoesNotExist:
            raise PlayerRod.DoesNotExist('Снасть не найдена.')

        if FishingSession.objects.filter(rod=rod).exists():
            raise ValueError('Вытащите удочку перед разборкой.')

        if player.rod_slot_1 == rod or player.rod_slot_2 == rod or player.rod_slot_3 == rod:
            raise ValueError('Снимите удочку из слота перед разборкой.')

        components = [
            rod.rod_type, rod.reel, rod.line,
            rod.hook, rod.float_tackle,
        ]

        for component in components:
            if component:
                ct = ContentType.objects.get_for_model(component)
                inv, created = InventoryItem.objects.get_or_create(
                    player=player, content_type=ct, object_id=component.pk,
                    defaults={'quantity': 0},
                )
                inv.quantity += 1
                inv.save(update_fields=['quantity'])

        rod.delete()
