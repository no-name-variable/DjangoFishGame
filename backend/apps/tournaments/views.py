"""Views турнирной системы."""

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Tournament, TournamentEntry
from .serializers import JoinTournamentSerializer, TournamentEntrySerializer, TournamentSerializer


class TournamentListView(generics.ListAPIView):
    """Список активных (незавершённых) турниров."""

    serializer_class = TournamentSerializer
    queryset = Tournament.objects.filter(
        is_finished=False,
    ).select_related('target_species', 'target_location').prefetch_related('entries')


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
        player = request.user.player
        tournament_id = serializer.validated_data['tournament_id']

        try:
            tournament = Tournament.objects.get(pk=tournament_id)
        except Tournament.DoesNotExist:
            return Response({'error': 'Турнир не найден.'}, status=status.HTTP_404_NOT_FOUND)

        # Проверка: турнир ещё не начался
        if timezone.now() >= tournament.start_time:
            return Response(
                {'error': 'Регистрация закрыта — турнир уже начался.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Проверка: достаточный разряд
        if player.rank < tournament.min_rank:
            return Response(
                {'error': f'Недостаточный разряд. Требуется: {tournament.min_rank}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Проверка: лимит участников
        if tournament.entries.count() >= tournament.max_participants:
            return Response(
                {'error': 'Турнир заполнен.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Проверка: не зарегистрирован ли уже
        if TournamentEntry.objects.filter(tournament=tournament, player=player).exists():
            return Response(
                {'error': 'Вы уже зарегистрированы в этом турнире.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Проверка: достаточно денег для вступительного взноса
        if player.money < tournament.entry_fee:
            return Response(
                {'error': 'Недостаточно денег для вступительного взноса.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Командный турнир — регистрируется вся команда
        if tournament.tournament_type == Tournament.TournamentType.TEAM:
            return self._join_team_tournament(player, tournament)

        # Списание вступительного взноса
        if tournament.entry_fee > 0:
            player.money -= tournament.entry_fee
            player.save(update_fields=['money'])

        entry = TournamentEntry.objects.create(tournament=tournament, player=player)
        return Response(TournamentEntrySerializer(entry).data, status=status.HTTP_201_CREATED)

    def _join_team_tournament(self, player, tournament):
        """Регистрация команды в командном турнире."""
        from apps.teams.models import Team, TeamMembership

        membership = TeamMembership.objects.filter(player=player).select_related('team').first()
        if not membership:
            return Response(
                {'error': 'Вы не состоите в команде.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if membership.role != TeamMembership.Role.LEADER:
            return Response(
                {'error': 'Только лидер команды может зарегистрировать команду.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        team = membership.team
        members = TeamMembership.objects.filter(team=team).select_related('player')

        # Проверка: все участники соответствуют мин. разряду
        for m in members:
            if m.player.rank < tournament.min_rank:
                return Response(
                    {'error': f'{m.player.nickname} не соответствует мин. разряду ({tournament.min_rank}).'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Проверка: команда ещё не зарегистрирована
        if TournamentEntry.objects.filter(tournament=tournament, team=team).exists():
            return Response(
                {'error': 'Ваша команда уже зарегистрирована.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Списание взноса с лидера
        if tournament.entry_fee > 0:
            if player.money < tournament.entry_fee:
                return Response(
                    {'error': 'Недостаточно денег для вступительного взноса.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            player.money -= tournament.entry_fee
            player.save(update_fields=['money'])

        # Регистрация всех членов команды
        entries = []
        for m in members:
            entry = TournamentEntry.objects.create(
                tournament=tournament, player=m.player, team=team,
            )
            entries.append(entry)

        return Response(
            {'message': f'Команда "{team.name}" зарегистрирована ({len(entries)} участников).'},
            status=status.HTTP_201_CREATED,
        )


class TournamentResultsView(generics.ListAPIView):
    """Результаты турнира (по местам)."""

    serializer_class = TournamentEntrySerializer

    def get_queryset(self):
        return TournamentEntry.objects.filter(
            tournament_id=self.kwargs['pk'],
        ).select_related('player').order_by('rank_position')
