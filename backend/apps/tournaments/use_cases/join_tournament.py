"""Use case: регистрация в турнире."""

from dataclasses import dataclass, field

from django.utils import timezone

from ..models import Tournament, TournamentEntry


@dataclass
class JoinTournamentResult:
    """Результат вступления в турнир."""

    entry: TournamentEntry | None = None
    entries: list = field(default_factory=list)
    team_name: str = ''
    is_team: bool = False


class JoinTournamentUseCase:
    """Регистрация игрока или команды в турнире."""

    def execute(self, player, tournament_id: int) -> JoinTournamentResult:
        """Raises: Tournament.DoesNotExist, ValueError."""
        try:
            tournament = Tournament.objects.get(pk=tournament_id)
        except Tournament.DoesNotExist:
            raise Tournament.DoesNotExist('Турнир не найден.')

        if timezone.now() >= tournament.start_time:
            raise ValueError('Регистрация закрыта -- турнир уже начался.')

        if player.rank < tournament.min_rank:
            raise ValueError(f'Недостаточный разряд. Требуется: {tournament.min_rank}.')

        if tournament.entries.count() >= tournament.max_participants:
            raise ValueError('Турнир заполнен.')

        if TournamentEntry.objects.filter(tournament=tournament, player=player).exists():
            raise ValueError('Вы уже зарегистрированы в этом турнире.')

        if player.money < tournament.entry_fee:
            raise ValueError('Недостаточно денег для вступительного взноса.')

        if tournament.tournament_type == Tournament.TournamentType.TEAM:
            return self._join_team(player, tournament)

        if tournament.entry_fee > 0:
            player.money -= tournament.entry_fee
            player.save(update_fields=['money'])

        entry = TournamentEntry.objects.create(tournament=tournament, player=player)
        return JoinTournamentResult(entry=entry)

    def _join_team(self, player, tournament) -> JoinTournamentResult:
        """Регистрация команды в командном турнире."""
        from apps.teams.models import TeamMembership

        membership = TeamMembership.objects.filter(player=player).select_related('team').first()
        if not membership:
            raise ValueError('Вы не состоите в команде.')

        if membership.role != TeamMembership.Role.LEADER:
            raise ValueError('Только лидер команды может зарегистрировать команду.')

        team = membership.team
        members = TeamMembership.objects.filter(team=team).select_related('player')

        for m in members:
            if m.player.rank < tournament.min_rank:
                raise ValueError(
                    f'{m.player.nickname} не соответствует мин. разряду ({tournament.min_rank}).',
                )

        if TournamentEntry.objects.filter(tournament=tournament, team=team).exists():
            raise ValueError('Ваша команда уже зарегистрирована.')

        if tournament.entry_fee > 0:
            if player.money < tournament.entry_fee:
                raise ValueError('Недостаточно денег для вступительного взноса.')
            player.money -= tournament.entry_fee
            player.save(update_fields=['money'])

        entries = []
        for m in members:
            entry = TournamentEntry.objects.create(
                tournament=tournament, player=m.player, team=team,
            )
            entries.append(entry)

        return JoinTournamentResult(entries=entries, team_name=team.name, is_team=True)
