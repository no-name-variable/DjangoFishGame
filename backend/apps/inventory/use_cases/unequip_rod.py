"""Use case: снять удочку из слота."""

from apps.fishing.models import FishingSession

from ..models import PlayerRod


class UnequipRodUseCase:
    """Снять удочку из слота."""

    def execute(self, player, rod_id: int) -> None:
        """Raises: PlayerRod.DoesNotExist, ValueError."""
        try:
            rod = PlayerRod.objects.get(pk=rod_id, player=player)
        except PlayerRod.DoesNotExist:
            raise PlayerRod.DoesNotExist('Снасть не найдена.')

        if FishingSession.objects.filter(rod=rod).exists():
            raise ValueError('Вытащите удочку перед снятием из слота.')

        unequipped = False
        if player.rod_slot_1 == rod:
            player.rod_slot_1 = None
            unequipped = True
        if player.rod_slot_2 == rod:
            player.rod_slot_2 = None
            unequipped = True
        if player.rod_slot_3 == rod:
            player.rod_slot_3 = None
            unequipped = True

        if not unequipped:
            raise ValueError('Удочка не экипирована.')

        player.save(update_fields=['rod_slot_1', 'rod_slot_2', 'rod_slot_3'])
