"""Use case: вступить в команду."""

from ..models import Team, TeamMembership


class JoinTeamUseCase:
    """Вступление в команду с проверками."""

    def execute(self, player, team_id: int) -> TeamMembership:
        """Raises: Team.DoesNotExist, ValueError."""
        if TeamMembership.objects.filter(player=player).exists():
            raise ValueError('Вы уже состоите в команде.')

        try:
            team = Team.objects.get(pk=team_id)
        except Team.DoesNotExist:
            raise Team.DoesNotExist('Команда не найдена.')

        if team.member_count >= team.max_members:
            raise ValueError('Команда полная.')

        return TeamMembership.objects.create(team=team, player=player)
