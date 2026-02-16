"""Views квестов."""

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PlayerQuest, Quest
from .serializers import AcceptQuestSerializer, PlayerQuestSerializer, QuestSerializer


class AvailableQuestsView(generics.ListAPIView):
    """Доступные квесты для игрока (не взятые, с подходящим рангом)."""

    serializer_class = QuestSerializer

    def get_queryset(self):
        player = self.request.user.player
        taken_ids = PlayerQuest.objects.filter(player=player).values_list('quest_id', flat=True)
        return Quest.objects.filter(
            min_rank__lte=player.rank,
        ).exclude(pk__in=taken_ids).select_related('target_species', 'target_location')


class PlayerQuestsView(generics.ListAPIView):
    """Квесты игрока (активные и завершённые)."""

    serializer_class = PlayerQuestSerializer

    def get_queryset(self):
        return PlayerQuest.objects.filter(
            player=self.request.user.player,
        ).select_related(
            'quest', 'quest__target_species', 'quest__target_location',
        ).order_by('status', '-started_at')


class AcceptQuestView(APIView):
    """Взять квест."""

    def post(self, request):
        serializer = AcceptQuestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        player = request.user.player
        quest_id = serializer.validated_data['quest_id']

        try:
            quest = Quest.objects.get(pk=quest_id)
        except Quest.DoesNotExist:
            return Response({'error': 'Квест не найден.'}, status=status.HTTP_404_NOT_FOUND)

        if quest.min_rank > player.rank:
            return Response({'error': 'Недостаточный разряд.'}, status=status.HTTP_400_BAD_REQUEST)

        if quest.prerequisite_quest_id:
            has_prereq = PlayerQuest.objects.filter(
                player=player, quest=quest.prerequisite_quest,
                status__in=[PlayerQuest.Status.COMPLETED, PlayerQuest.Status.CLAIMED],
            ).exists()
            if not has_prereq:
                return Response(
                    {'error': 'Сначала выполните предварительный квест.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if PlayerQuest.objects.filter(player=player, quest=quest).exists():
            return Response({'error': 'Квест уже взят.'}, status=status.HTTP_400_BAD_REQUEST)

        pq = PlayerQuest.objects.create(player=player, quest=quest)
        return Response(PlayerQuestSerializer(pq).data, status=status.HTTP_201_CREATED)


class ClaimQuestRewardView(APIView):
    """Получить награду за выполненный квест."""

    def post(self, request, pk):
        try:
            pq = PlayerQuest.objects.select_related('quest').get(
                pk=pk, player=request.user.player,
            )
        except PlayerQuest.DoesNotExist:
            return Response({'error': 'Квест не найден.'}, status=status.HTTP_404_NOT_FOUND)

        if pq.status != PlayerQuest.Status.COMPLETED:
            return Response({'error': 'Квест ещё не завершён.'}, status=status.HTTP_400_BAD_REQUEST)

        player = request.user.player
        quest = pq.quest

        player.money += quest.reward_money
        player.karma += quest.reward_karma
        player.add_experience(quest.reward_experience)
        player.save(update_fields=['money', 'karma', 'rank', 'experience'])

        pq.status = PlayerQuest.Status.CLAIMED
        pq.save(update_fields=['status'])

        return Response({
            'message': f'Награда за "{quest.name}" получена!',
            'reward_money': quest.reward_money,
            'reward_experience': quest.reward_experience,
            'reward_karma': quest.reward_karma,
        })
