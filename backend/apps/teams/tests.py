"""Тесты API команд."""

import pytest
from decimal import Decimal

from django.contrib.auth.models import User

from apps.accounts.models import Player
from apps.teams.models import Team, TeamMembership
from apps.world.models import Base


@pytest.fixture
def second_player(db):
    """Второй игрок для тестов, где нужен ещё один участник."""
    base = Base.objects.first() or Base.objects.create(
        name='База 2', description='Тест',
        min_rank=1, min_karma=0, travel_cost=0,
    )
    user2 = User.objects.create_user(username='fisher2', password='testpass123')
    return Player.objects.create(
        user=user2, nickname='Рыбак2', money=Decimal('1000.00'),
        current_base=base,
    )


@pytest.fixture
def second_api_client(second_player):
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import AccessToken
    client = APIClient()
    token = AccessToken.for_user(second_player.user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


@pytest.mark.django_db
class TestTeamList:
    """GET /api/teams/ -- список команд."""

    def test_returns_list(self, api_client, player):
        team = Team.objects.create(name='Рыбаки', leader=player)
        TeamMembership.objects.create(team=team, player=player, role='leader')
        resp = api_client.get('/api/teams/')
        assert resp.status_code == 200
        assert len(resp.data) >= 1


@pytest.mark.django_db
class TestCreateTeam:
    """POST /api/teams/create/ -- создать команду."""

    def test_success(self, api_client, player):
        resp = api_client.post('/api/teams/create/', {'name': 'Новая команда'})
        assert resp.status_code == 201
        assert Team.objects.filter(name='Новая команда', leader=player).exists()
        assert TeamMembership.objects.filter(player=player, role='leader').exists()

    def test_already_in_team(self, api_client, player):
        team = Team.objects.create(name='Рыбаки', leader=player)
        TeamMembership.objects.create(team=team, player=player, role='leader')
        resp = api_client.post('/api/teams/create/', {'name': 'Другая команда'})
        assert resp.status_code == 400


@pytest.mark.django_db
class TestMyTeam:
    """GET /api/teams/my/ -- моя команда."""

    def test_has_team(self, api_client, player):
        team = Team.objects.create(name='Рыбаки', leader=player)
        TeamMembership.objects.create(team=team, player=player, role='leader')
        resp = api_client.get('/api/teams/my/')
        assert resp.status_code == 200
        assert resp.data['name'] == 'Рыбаки'

    def test_no_team(self, api_client):
        resp = api_client.get('/api/teams/my/')
        assert resp.status_code == 200
        assert resp.data['team'] is None


@pytest.mark.django_db
class TestTeamDetail:
    """GET /api/teams/{pk}/ -- детали команды."""

    def test_success(self, api_client, player):
        team = Team.objects.create(name='Рыбаки', leader=player)
        TeamMembership.objects.create(team=team, player=player, role='leader')
        resp = api_client.get(f'/api/teams/{team.pk}/')
        assert resp.status_code == 200
        assert resp.data['name'] == 'Рыбаки'


@pytest.mark.django_db
class TestJoinTeam:
    """POST /api/teams/{pk}/join/ -- вступить в команду."""

    def test_success(self, second_api_client, player, second_player):
        team = Team.objects.create(name='Рыбаки', leader=player)
        TeamMembership.objects.create(team=team, player=player, role='leader')
        resp = second_api_client.post(f'/api/teams/{team.pk}/join/')
        assert resp.status_code == 200
        assert TeamMembership.objects.filter(team=team, player=second_player).exists()

    def test_already_member(self, api_client, player):
        team = Team.objects.create(name='Рыбаки', leader=player)
        TeamMembership.objects.create(team=team, player=player, role='leader')
        resp = api_client.post(f'/api/teams/{team.pk}/join/')
        assert resp.status_code == 400


@pytest.mark.django_db
class TestLeaveTeam:
    """POST /api/teams/leave/ -- покинуть команду."""

    def test_success(self, second_api_client, player, second_player):
        team = Team.objects.create(name='Рыбаки', leader=player)
        TeamMembership.objects.create(team=team, player=player, role='leader')
        TeamMembership.objects.create(team=team, player=second_player, role='member')
        resp = second_api_client.post('/api/teams/leave/')
        assert resp.status_code == 200
        assert not TeamMembership.objects.filter(player=second_player).exists()

    def test_not_in_team(self, api_client):
        resp = api_client.post('/api/teams/leave/')
        assert resp.status_code == 400
