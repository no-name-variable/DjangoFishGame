"""Views турнирной системы."""

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Tournament, TournamentEntry
from .serializers import (
    CreateTournamentSerializer,
    JoinTournamentSerializer,
    TournamentEntrySerializer,
    TournamentSerializer,
)
from .use_cases.create_tournament import CreateTournamentUseCase
from .use_cases.join_tournament import JoinTournamentUseCase


def _resolve(use_case_cls):
    """Резолвит use case из DI-контейнера."""
    from config.container import container
    return container.resolve(use_case_cls)


class TournamentListView(generics.ListAPIView):
    """Список активных (незавершённых) турниров."""

    serializer_class = TournamentSerializer
    queryset = Tournament.objects.filter(
        is_finished=False,
    ).select_related('target_species', 'target_location').prefetch_related('entries')


class CreateTournamentView(APIView):
    """Создание турнира игроком."""

    def post(self, request):
        serializer = CreateTournamentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uc = _resolve(CreateTournamentUseCase)
        try:
            tournament = uc.execute(request.user.player, serializer.validated_data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(TournamentSerializer(tournament).data, status=status.HTTP_201_CREATED)


class TournamentDetailView(generics.RetrieveAPIView):
    """Детальная информация о турнире с записями участников."""

    serializer_class = TournamentSerializer
    queryset = Tournament.objects.select_related(
        'target_species', 'target_location',
    ).prefetch_related('entries')


class JoinTournamentView(APIView):
    """Регистрация в турнире."""

    def post(self, request):
        serializer = JoinTournamentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uc = _resolve(JoinTournamentUseCase)
        try:
            result = uc.execute(request.user.player, serializer.validated_data['tournament_id'])
        except Tournament.DoesNotExist:
            return Response({'error': 'Турнир не найден.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if result.is_team:
            return Response(
                {'message': f'Команда "{result.team_name}" зарегистрирована ({len(result.entries)} участников).'},
                status=status.HTTP_201_CREATED,
            )

        return Response(TournamentEntrySerializer(result.entry).data, status=status.HTTP_201_CREATED)


class TournamentResultsView(generics.ListAPIView):
    """Результаты турнира (по местам)."""

    serializer_class = TournamentEntrySerializer

    def get_queryset(self):
        return TournamentEntry.objects.filter(
            tournament_id=self.kwargs['pk'],
        ).select_related('player').order_by('rank_position')
