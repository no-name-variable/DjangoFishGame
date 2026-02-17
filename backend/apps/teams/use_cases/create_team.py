"""Use case: создать команду."""

from ..models import Team, TeamMembership


class CreateTeamUseCase:
    """Создание команды с проверкой дублей."""

    def execute(self, player, name: str, description: str = '') -> Team:
        """Raises: ValueError."""
        if TeamMembership.objects.filter(player=player).exists():
            raise ValueError('Вы уже состоите в команде.')

        if Team.objects.filter(name=name).exists():
            raise ValueError('Команда с таким именем уже существует.')

        team = Team.objects.create(name=name, description=description, leader=player)
        TeamMembership.objects.create(team=team, player=player, role=TeamMembership.Role.LEADER)
        return team
