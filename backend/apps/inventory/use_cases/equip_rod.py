"""Use case: экипировать/снять удочку."""

from apps.fishing.models import FishingSession

from ..models import PlayerRod


class EquipRodUseCase:
    """Экипировать удочку в слот (1, 2 или 3)."""

    def execute(self, player, rod_id: int, slot: int) -> PlayerRod:
        """Raises: PlayerRod.DoesNotExist, ValueError."""
        try:
            rod = PlayerRod.objects.get(pk=rod_id, player=player)
        except PlayerRod.DoesNotExist:
            raise PlayerRod.DoesNotExist('Снасть не найдена.')

        if slot not in [1, 2, 3]:
            raise ValueError('Укажите слот 1, 2 или 3.')

        if not rod.is_ready:
            raise ValueError('Снасть не собрана или некомплектна.')

        if player.rod_slot_1 == rod or player.rod_slot_2 == rod or player.rod_slot_3 == rod:
            raise ValueError('Удочка уже экипирована в другой слот.')

        slot_field = f'rod_slot_{slot}'
        setattr(player, slot_field, rod)
        player.save(update_fields=[slot_field])

        return rod
