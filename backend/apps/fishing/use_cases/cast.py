"""Use case: заброс снасти."""

from dataclasses import dataclass

from django.conf import settings
from django.utils import timezone

from apps.fishing.models import FishingSession
from apps.inventory.models import PlayerRod

MAX_RODS = settings.GAME_SETTINGS.get('MAX_ACTIVE_RODS', 3)


@dataclass
class CastResult:
    session_id: int
    slot: int


class CastUseCase:
    """Заброс снасти — до MAX_ACTIVE_RODS одновременно."""

    def execute(
        self, player, rod_id: int, point_x: float, point_y: float,
    ) -> CastResult:
        """Raises: PlayerRod.DoesNotExist, ValueError, PermissionError."""
        if not player.current_location:
            raise ValueError('Вы не на локации.')

        try:
            rod = PlayerRod.objects.select_related(
                'rod_type', 'reel', 'line', 'hook', 'float_tackle', 'lure', 'bait',
            ).get(pk=rod_id, player=player)
        except PlayerRod.DoesNotExist:
            raise PlayerRod.DoesNotExist('Снасть не найдена.')

        if not rod.is_ready:
            raise ValueError('Снасть не полностью собрана.')

        if rod.durability_current <= 0:
            raise ValueError('Удилище сломано. Отремонтируйте его в магазине.')

        # Проверяем, что удочка экипирована в один из слотов
        if rod not in [player.rod_slot_1, player.rod_slot_2, player.rod_slot_3]:
            raise ValueError('Удочка должна быть экипирована в слот для использования.')

        # Проверяем, что эта удочка ещё не заброшена
        if FishingSession.objects.filter(player=player, rod=rod).exists():
            raise ValueError('Эта удочка уже заброшена.')

        # Проверяем лимит удочек (все активные состояния)
        active_sessions = FishingSession.objects.filter(
            player=player,
            state__in=[
                FishingSession.State.WAITING,
                FishingSession.State.NIBBLE,
                FishingSession.State.BITE,
                FishingSession.State.FIGHTING,
                FishingSession.State.CAUGHT,
            ],
        )
        if active_sessions.count() >= MAX_RODS:
            raise ValueError(f'Максимум {MAX_RODS} удочки одновременно.')

        # Назначаем свободный слот
        all_used_slots = set(
            FishingSession.objects.filter(player=player).values_list('slot', flat=True)
        )
        free_slot = next((s for s in range(1, MAX_RODS + 1) if s not in all_used_slots), None)
        if free_slot is None:
            raise ValueError('Нет свободных слотов. Завершите текущие сессии.')

        session = FishingSession.objects.create(
            player=player,
            location=player.current_location,
            rod=rod,
            slot=free_slot,
            state=FishingSession.State.WAITING,
            cast_x=point_x,
            cast_y=point_y,
            cast_time=timezone.now(),
        )

        return CastResult(session_id=session.id, slot=free_slot)
