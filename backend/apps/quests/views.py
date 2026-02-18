"""Views квестов."""

from django.db import models
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PlayerQuest, Quest
from .serializers import AcceptQuestSerializer, PlayerQuestSerializer, QuestSerializer
from .use_cases.accept_quest import AcceptQuestUseCase
from .use_cases.claim_reward import ClaimQuestRewardUseCase


def _resolve(use_case_cls):
    """Резолвит use case из DI-контейнера."""
    from config.container import container
    return container.resolve(use_case_cls)


class AvailableQuestsView(generics.ListAPIView):
    """Доступные квесты для игрока (не взятые, с подходящим рангом)."""

    serializer_class = QuestSerializer

    def get_queryset(self):
        player = self.request.user.player
        taken_ids = PlayerQuest.objects.filter(player=player).values_list('quest_id', flat=True)
        # Квесты, prerequisite которых выполнен (или prerequisite=None)
        completed_ids = set(PlayerQuest.objects.filter(
            player=player,
            status__in=[PlayerQuest.Status.COMPLETED, PlayerQuest.Status.CLAIMED],
        ).values_list('quest_id', flat=True))
        qs = Quest.objects.filter(
            min_rank__lte=player.rank,
        ).exclude(pk__in=taken_ids).select_related(
            'target_species', 'target_location', 'reward_apparatus_part',
        )
        # Фильтруем: показываем только если prerequisite=None или prerequisite выполнен
        return qs.filter(
            models.Q(prerequisite_quest__isnull=True) |
            models.Q(prerequisite_quest_id__in=completed_ids)
        )


class PlayerQuestsView(generics.ListAPIView):
    """Квесты игрока (активные и завершённые)."""

    serializer_class = PlayerQuestSerializer

    def get_queryset(self):
        return PlayerQuest.objects.filter(
            player=self.request.user.player,
        ).select_related(
            'quest', 'quest__target_species', 'quest__target_location',
            'quest__reward_apparatus_part',
        ).order_by('status', '-started_at')


class AcceptQuestView(APIView):
    """Взять квест."""

    def post(self, request):
        serializer = AcceptQuestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uc = _resolve(AcceptQuestUseCase)
        try:
            pq = uc.execute(request.user.player, serializer.validated_data['quest_id'])
        except Quest.DoesNotExist:
            return Response({'error': 'Квест не найден.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(PlayerQuestSerializer(pq).data, status=status.HTTP_201_CREATED)


class ClaimQuestRewardView(APIView):
    """Получить награду за выполненный квест."""

    def post(self, request, pk):
        uc = _resolve(ClaimQuestRewardUseCase)
        try:
            result = uc.execute(request.user.player, pk)
        except PlayerQuest.DoesNotExist:
            return Response({'error': 'Квест не найден.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        data = {
            'message': f'Награда за "{result.quest_name}" получена!',
            'reward_money': result.reward_money,
            'reward_experience': result.reward_experience,
            'reward_karma': result.reward_karma,
        }
        if result.reward_apparatus_part:
            data['reward_apparatus_part'] = result.reward_apparatus_part
        return Response(data)
