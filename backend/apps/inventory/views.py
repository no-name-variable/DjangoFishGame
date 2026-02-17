"""Views инвентаря."""

from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.fishing.models import FishingSession
from apps.tackle.models import Food, RodType

from .models import CaughtFish, InventoryItem, PlayerRod
from .serializers import (
    AssembleRodSerializer, CaughtFishSerializer, InventoryItemSerializer,
    PlayerRodSerializer, RenameRodSerializer,
)
from .use_cases.assemble_rod import AssembleRodUseCase
from .use_cases.change_tackle import ChangeTackleUseCase
from .use_cases.delete_rod import DeleteRodUseCase
from .use_cases.disassemble_rod import DisassembleRodUseCase
from .use_cases.eat import EatUseCase
from .use_cases.equip_rod import EquipRodUseCase
from .use_cases.unequip_rod import UnequipRodUseCase


def _resolve(use_case_cls):
    """Резолвит use case из DI-контейнера."""
    from config.container import container
    return container.resolve(use_case_cls)


class InventoryView(generics.ListAPIView):
    """Инвентарь игрока."""

    serializer_class = InventoryItemSerializer

    def get_queryset(self):
        return InventoryItem.objects.filter(player=self.request.user.player)


class PlayerRodsView(generics.ListAPIView):
    """Снасти игрока."""

    serializer_class = PlayerRodSerializer

    def get_queryset(self):
        return PlayerRod.objects.filter(
            player=self.request.user.player,
        ).select_related('rod_type', 'reel', 'line', 'hook', 'float_tackle', 'lure', 'bait')


class CreelView(generics.ListAPIView):
    """Садок (пойманная рыба)."""

    serializer_class = CaughtFishSerializer

    def get_queryset(self):
        return CaughtFish.objects.filter(
            player=self.request.user.player, is_sold=False, is_released=False,
        ).select_related('species')


class AssembleRodView(APIView):
    """Собрать удочку из компонентов инвентаря."""

    def post(self, request):
        serializer = AssembleRodSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uc = _resolve(AssembleRodUseCase)
        try:
            rod = uc.execute(request.user.player, serializer.validated_data)
        except RodType.DoesNotExist:
            return Response({'error': 'Удилище не найдено.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            if 'не найден' in str(e):
                return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
            raise

        return Response(PlayerRodSerializer(rod).data, status=status.HTTP_201_CREATED)


class RenameRodView(APIView):
    """Переименовать сборку."""

    def patch(self, request, rod_id):
        serializer = RenameRodSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            rod = PlayerRod.objects.get(pk=rod_id, player=request.user.player)
        except PlayerRod.DoesNotExist:
            return Response({'error': 'Снасть не найдена.'}, status=status.HTTP_404_NOT_FOUND)

        rod.custom_name = serializer.validated_data['custom_name'].strip()
        rod.save(update_fields=['custom_name'])

        return Response(PlayerRodSerializer(rod).data)


class EatView(APIView):
    """Покормить рыбака."""

    def post(self, request):
        food_id = request.data.get('food_id')
        if not food_id:
            return Response({'error': 'Укажите food_id.'}, status=status.HTTP_400_BAD_REQUEST)

        uc = _resolve(EatUseCase)
        try:
            hunger = uc.execute(request.user.player, food_id)
        except Food.DoesNotExist:
            return Response({'error': 'Еда не найдена.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'hunger': hunger})


class RodSettingsView(APIView):
    """Изменить глубину и скорость проводки удочки."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, rod_id):
        rod = get_object_or_404(PlayerRod, pk=rod_id, player=request.user.player)

        session = FishingSession.objects.filter(rod=rod).first()
        if session and session.state in ('bite', 'fighting', 'caught'):
            return Response(
                {'error': 'Нельзя менять настройки во время вываживания.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if 'depth_setting' in request.data:
            rod.depth_setting = max(0.1, min(10.0, float(request.data['depth_setting'])))
        if 'retrieve_speed' in request.data:
            rod.retrieve_speed = max(1, min(10, int(request.data['retrieve_speed'])))
        rod.save(update_fields=['depth_setting', 'retrieve_speed'])
        return Response(PlayerRodSerializer(rod).data)


class ChangeTackleView(APIView):
    """Сменить компоненты снасти (наживка, приманка, крючок, поплавок)."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, rod_id):
        uc = _resolve(ChangeTackleUseCase)
        try:
            rod = uc.execute(request.user.player, rod_id, request.data)
        except PlayerRod.DoesNotExist:
            return Response({'error': 'Снасть не найдена.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            if 'не найден' in str(e):
                return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
            raise

        return Response(PlayerRodSerializer(rod).data)


class DisassembleRodView(APIView):
    """Разобрать удочку (возврат компонентов в инвентарь)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, rod_id):
        uc = _resolve(DisassembleRodUseCase)
        try:
            uc.execute(request.user.player, rod_id)
        except PlayerRod.DoesNotExist:
            return Response({'error': 'Снасть не найдена.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'status': 'disassembled'}, status=status.HTTP_200_OK)


class DeleteRodView(APIView):
    """Удалить удочку без возврата компонентов."""

    permission_classes = [IsAuthenticated]

    def delete(self, request, rod_id):
        uc = _resolve(DeleteRodUseCase)
        try:
            uc.execute(request.user.player, rod_id)
        except PlayerRod.DoesNotExist:
            return Response({'error': 'Снасть не найдена.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'status': 'deleted'}, status=status.HTTP_200_OK)


class EquipRodView(APIView):
    """Экипировать удочку в слот (1, 2 или 3)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, rod_id):
        slot = request.data.get('slot')
        if slot not in [1, 2, 3]:
            return Response(
                {'error': 'Укажите слот 1, 2 или 3.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        uc = _resolve(EquipRodUseCase)
        try:
            rod = uc.execute(request.user.player, rod_id, slot)
        except PlayerRod.DoesNotExist:
            return Response({'error': 'Снасть не найдена.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'status': 'equipped',
            'slot': slot,
            'rod': PlayerRodSerializer(rod).data,
        })


class UnequipRodView(APIView):
    """Снять удочку из слота."""

    permission_classes = [IsAuthenticated]

    def post(self, request, rod_id):
        uc = _resolve(UnequipRodUseCase)
        try:
            uc.execute(request.user.player, rod_id)
        except PlayerRod.DoesNotExist:
            return Response({'error': 'Снасть не найдена.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'status': 'unequipped'})
