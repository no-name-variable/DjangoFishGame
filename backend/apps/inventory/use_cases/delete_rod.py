"""Use case: удалить удочку."""

from apps.fishing.models import FishingSession

from ..models import PlayerRod


class DeleteRodUseCase:
    """Удалить удочку без возврата компонентов."""

    def execute(self, player, rod_id: int) -> None:
        """Raises: PlayerRod.DoesNotExist, ValueError."""
        try:
            rod = PlayerRod.objects.get(pk=rod_id, player=player)
        except PlayerRod.DoesNotExist:
            raise PlayerRod.DoesNotExist('Снасть не найдена.')

        if FishingSession.objects.filter(rod=rod).exists():
            raise ValueError('Вытащите удочку перед удалением.')

        # Удаляем из слота если там
        if player.rod_slot_1 == rod:
            player.rod_slot_1 = None
        if player.rod_slot_2 == rod:
            player.rod_slot_2 = None
        if player.rod_slot_3 == rod:
            player.rod_slot_3 = None
        player.save(update_fields=['rod_slot_1', 'rod_slot_2', 'rod_slot_3'])

        rod.delete()
