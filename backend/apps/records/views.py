"""Views рекордов, достижений и газеты."""

from django.db.models import Count, Max, Sum
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Player
from apps.inventory.models import CaughtFish

from .models import Achievement, FishRecord, PlayerAchievement
from .serializers import AchievementSerializer, FishRecordSerializer, PlayerAchievementSerializer


class FishRecordListView(generics.ListAPIView):
    """Таблица рекордов (все виды)."""

    serializer_class = FishRecordSerializer
    queryset = FishRecord.objects.select_related('species', 'player', 'location').order_by('-weight')


class FishRecordBySpeciesView(generics.ListAPIView):
    """Рекорды по конкретному виду рыбы."""

    serializer_class = FishRecordSerializer

    def get_queryset(self):
        return FishRecord.objects.filter(
            species_id=self.kwargs['species_id'],
        ).select_related('species', 'player', 'location').order_by('-weight')[:10]


class AchievementListView(generics.ListAPIView):
    """Все доступные достижения."""

    serializer_class = AchievementSerializer
    queryset = Achievement.objects.all()


class PlayerAchievementsView(generics.ListAPIView):
    """Достижения текущего игрока."""

    serializer_class = PlayerAchievementSerializer

    def get_queryset(self):
        return PlayerAchievement.objects.filter(
            player=self.request.user.player,
        ).select_related('achievement')


class PlayerJournalView(generics.ListAPIView):
    """Журнал уловов игрока (рекорды)."""

    serializer_class = FishRecordSerializer

    def get_queryset(self):
        return FishRecord.objects.filter(
            player=self.request.user.player,
        ).select_related('species', 'player', 'location')


class NewspaperView(APIView):
    """Газета: рекорды недели, топ рыбаков, статистика."""

    def get(self, request):
        # Рекордсмены недели
        weekly_champions = FishRecord.objects.filter(
            is_weekly_champion=True,
        ).select_related('species', 'player')[:10]

        # Топ-10 рыбаков по опыту
        top_players = Player.objects.order_by('-experience')[:10].values(
            'nickname', 'rank', 'experience', 'karma',
        )

        # Топ-10 рекордов (самые крупные рыбы)
        top_records = FishRecord.objects.select_related('species', 'player').order_by('-weight')[:10]

        # Общая статистика
        stats = CaughtFish.objects.aggregate(
            total_fish=Count('id'),
            total_weight=Sum('weight'),
            unique_species=Count('species', distinct=True),
        )

        return Response({
            'weekly_champions': FishRecordSerializer(weekly_champions, many=True, context={'request': request}).data,
            'top_players': list(top_players),
            'top_records': FishRecordSerializer(top_records, many=True, context={'request': request}).data,
            'stats': {
                'total_fish': stats['total_fish'] or 0,
                'total_weight': round(stats['total_weight'] or 0, 2),
                'unique_species': stats['unique_species'] or 0,
            },
        })
