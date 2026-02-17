"""Use case: покинуть команду."""

from dataclasses import dataclass

from ..models import TeamMembership


@dataclass
class LeaveTeamResult:
    """Результат выхода из команды."""

    message: str
    team_disbanded: bool = False


class LeaveTeamUseCase:
    """Покинуть команду. Если лидер — передать лидерство или распустить."""

    def execute(self, player) -> LeaveTeamResult:
        """Raises: ValueError."""
        membership = TeamMembership.objects.filter(player=player).first()
        if not membership:
            raise ValueError('Вы не состоите в команде.')

        if membership.role == TeamMembership.Role.LEADER:
            team = membership.team
            next_leader = TeamMembership.objects.filter(
                team=team,
            ).exclude(player=player).order_by('joined_at').first()
            if next_leader:
                next_leader.role = TeamMembership.Role.LEADER
                next_leader.save(update_fields=['role'])
                team.leader = next_leader.player
                team.save(update_fields=['leader'])
            else:
                team.delete()
                return LeaveTeamResult(message='Команда распущена.', team_disbanded=True)

        membership.delete()
        return LeaveTeamResult(message='Вы покинули команду.')
