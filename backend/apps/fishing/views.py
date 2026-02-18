"""Views рыбалки — core gameplay с поддержкой мульти-удочек."""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.inventory.models import PlayerRod
from apps.tackle.models import Bait, Flavoring, Groundbait

from .models import FishingSession, GameTime
from .serializers import (
    CastSerializer, ChangeBaitSerializer, FishingMultiStatusSerializer,
    SessionActionSerializer,
)
from .use_cases.cast import CastUseCase
from .use_cases.change_bait import ChangeBaitUseCase
from .use_cases.fight import PullRodUseCase as PullRodUC, ReelInUseCase as ReelInUC
from .use_cases.groundbait import ApplyGroundbaitUseCase
from .use_cases.keep_fish import KeepFishUseCase
from .use_cases.release_fish import ReleaseFishUseCase
from .use_cases.retrieve import RetrieveRodUseCase
from .use_cases.status import FishingStatusUseCase
from .use_cases.strike import StrikeUseCase


def _resolve(use_case_cls):
    """Резолвит use case из DI-контейнера."""
    from config.container import container
    return container.resolve(use_case_cls)


class CastView(APIView):
    """Заброс снасти — до MAX_ACTIVE_RODS одновременно."""

    def post(self, request):
        serializer = CastSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        uc = _resolve(CastUseCase)
        try:
            result = uc.execute(
                request.user.player, data['rod_id'], data['point_x'], data['point_y'],
            )
        except PlayerRod.DoesNotExist:
            return Response({'error': 'Снасть не найдена.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'status': 'cast_ok', 'session_id': result.session_id, 'slot': result.slot})


class FishingStatusView(APIView):
    """Получить статус всех сессий. Для каждой WAITING — try_bite()."""

    def get(self, request):
        uc = _resolve(FishingStatusUseCase)
        result = uc.execute(request.user.player)

        if not result.sessions:
            gt = result.game_time
            return Response({
                'sessions': [],
                'fights': {},
                'game_time': {
                    'hour': gt.current_hour,
                    'day': gt.current_day,
                    'time_of_day': gt.time_of_day,
                },
            })

        return Response(FishingMultiStatusSerializer({
            'sessions': result.sessions,
            'fights': result.fights,
            'game_time': result.game_time,
        }).data)


class StrikeView(APIView):
    """Подсечка при поклёвке — принимает session_id."""

    def post(self, request):
        ser = SessionActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        uc = _resolve(StrikeUseCase)
        try:
            result = uc.execute(request.user.player, ser.validated_data['session_id'])
        except FishingSession.DoesNotExist:
            return Response({'error': 'Сессия не найдена.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'status': 'fighting',
            'session_id': result.session_id,
            'fish': result.fish_name,
            'species_id': result.species_id,
            'species_image': result.species_image,
            'tension': result.tension,
            'distance': result.distance,
        })


class ReelInView(APIView):
    """Подмотка (вываживание) — принимает session_id."""

    def post(self, request):
        return self._fight_action(request, ReelInUC)

    def _fight_action(self, request, uc_cls):
        ser = SessionActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        uc = _resolve(uc_cls)
        try:
            result = uc.execute(request.user.player, ser.validated_data['session_id'])
        except FishingSession.DoesNotExist:
            return Response({'error': 'Сессия не найдена.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if result.result == 'caught':
            return Response({
                'result': 'caught',
                'session_id': result.session_id,
                'fish': result.fish_name,
                'species_id': result.species_id,
                'species_image': result.species_image,
                'weight': result.weight,
                'length': result.length,
                'rarity': result.rarity,
            })
        elif result.result in ('line_break', 'rod_break'):
            return Response({'result': result.result})

        return Response({
            'result': 'fighting',
            'session_id': result.session_id,
            'tension': result.tension,
            'distance': result.distance,
            'rod_durability': result.rod_durability,
        })


class PullRodView(ReelInView):
    """Подтяжка удилищем."""

    def post(self, request):
        return self._fight_action(request, PullRodUC)


class KeepFishView(APIView):
    """Положить рыбу в садок."""

    def post(self, request):
        ser = SessionActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        uc = _resolve(KeepFishUseCase)
        try:
            result = uc.execute(request.user.player, ser.validated_data['session_id'])
        except FishingSession.DoesNotExist:
            return Response({'error': 'Сессия не найдена.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(result.caught_fish_data, status=status.HTTP_201_CREATED)


class ReleaseFishView(APIView):
    """Отпустить рыбу (+карма)."""

    def post(self, request):
        ser = SessionActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        uc = _resolve(ReleaseFishUseCase)
        try:
            result = uc.execute(request.user.player, ser.validated_data['session_id'])
        except FishingSession.DoesNotExist:
            return Response({'error': 'Сессия не найдена.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'status': 'released',
            'karma_bonus': result.karma_bonus,
            'karma_total': result.karma_total,
        })


class RetrieveRodView(APIView):
    """Вытащить удочку (удалить сессию WAITING/IDLE)."""

    def post(self, request):
        ser = SessionActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        uc = _resolve(RetrieveRodUseCase)
        try:
            uc.execute(request.user.player, ser.validated_data['session_id'])
        except FishingSession.DoesNotExist:
            return Response({'error': 'Сессия не найдена.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'status': 'retrieved'})



class GroundbaitView(APIView):
    """Бросить прикормку в точку ловли."""

    def post(self, request):
        player = request.user.player
        groundbait_id = request.data.get('groundbait_id')
        flavoring_id = request.data.get('flavoring_id')

        if not groundbait_id:
            return Response({'error': 'Укажите groundbait_id.'}, status=status.HTTP_400_BAD_REQUEST)

        uc = _resolve(ApplyGroundbaitUseCase)
        try:
            result = uc.execute(player, groundbait_id, flavoring_id)
        except Groundbait.DoesNotExist:
            return Response({'error': 'Прикормка не найдена.'}, status=status.HTTP_404_NOT_FOUND)
        except Flavoring.DoesNotExist:
            return Response({'error': 'Ароматизатор не найден.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'message': result.message,
            'duration_hours': result.duration_hours,
            'flavoring': result.flavoring_name,
        })


class ChangeBaitView(APIView):
    """Сменить наживку на удочке во время рыбалки (только для WAITING сессий)."""

    def post(self, request):
        serializer = ChangeBaitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        uc = _resolve(ChangeBaitUseCase)
        try:
            result = uc.execute(request.user.player, data['session_id'], data['bait_id'])
        except FishingSession.DoesNotExist:
            return Response({'error': 'Сессия не найдена.'}, status=status.HTTP_404_NOT_FOUND)
        except Bait.DoesNotExist:
            return Response({'error': 'Наживка не найдена.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'status': 'bait_changed',
            'session_id': result.session_id,
            'new_bait': result.new_bait_name,
            'bait_remaining': result.bait_remaining,
        })


class GameTimeView(APIView):
    """Получить текущее игровое время."""

    def get(self, request):
        gt = GameTime.get_instance()
        return Response({
            'hour': gt.current_hour,
            'day': gt.current_day,
            'time_of_day': gt.time_of_day,
        })
