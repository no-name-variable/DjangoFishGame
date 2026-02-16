"""Тесты API турнирной системы."""

import pytest
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.utils import timezone

from apps.accounts.models import Player
from apps.tournaments.models import Tournament, TournamentEntry
from apps.world.models import Base, Location


@pytest.fixture
def tournament_location(base):
    return Location.objects.create(
        base=base, name='Турнирное озеро', description='Тест',
        min_rank=1, depth_map={'avg': 3.0, 'min': 1.0, 'max': 5.0},
    )


@pytest.fixture
def tournament(db, tournament_location):
    now = timezone.now()
    return Tournament.objects.create(
        name='Весенний кубок',
        tournament_type='individual',
        scoring='weight',
        start_time=now + timedelta(hours=1),
        end_time=now + timedelta(hours=2),
        entry_fee=Decimal('50.00'),
        min_rank=1,
        max_participants=10,
        target_location=tournament_location,
    )


@pytest.fixture
def second_player(db):
    base = Base.objects.first() or Base.objects.create(
        name='База 2', description='Тест',
        min_rank=1, min_karma=0, travel_cost=0,
    )
    user2 = User.objects.create_user(username='fisher2', password='testpass123')
    return Player.objects.create(
        user=user2, nickname='Рыбак2', money=Decimal('1000.00'),
        current_base=base,
    )


@pytest.mark.django_db
class TestTournamentList:
    """GET /api/tournaments/ -- список активных турниров."""

    def test_returns_list(self, api_client, tournament):
        resp = api_client.get('/api/tournaments/')
        assert resp.status_code == 200
        assert len(resp.data['results']) >= 1

    def test_excludes_finished(self, api_client, tournament):
        tournament.is_finished = True
        tournament.save(update_fields=['is_finished'])
        resp = api_client.get('/api/tournaments/')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 0


@pytest.mark.django_db
class TestTournamentDetail:
    """GET /api/tournaments/{pk}/ -- детали турнира."""

    def test_success(self, api_client, tournament):
        resp = api_client.get(f'/api/tournaments/{tournament.pk}/')
        assert resp.status_code == 200
        assert resp.data['name'] == 'Весенний кубок'


@pytest.mark.django_db
class TestJoinTournament:
    """POST /api/tournaments/join/ -- регистрация в турнире."""

    def test_success(self, api_client, tournament, player):
        resp = api_client.post('/api/tournaments/join/', {'tournament_id': tournament.pk})
        assert resp.status_code == 201
        assert TournamentEntry.objects.filter(tournament=tournament, player=player).exists()
        player.refresh_from_db()
        assert player.money == Decimal('950.00')

    def test_already_registered(self, api_client, tournament, player):
        TournamentEntry.objects.create(tournament=tournament, player=player)
        resp = api_client.post('/api/tournaments/join/', {'tournament_id': tournament.pk})
        assert resp.status_code == 400

    def test_insufficient_rank(self, api_client, tournament, player):
        tournament.min_rank = 99
        tournament.save(update_fields=['min_rank'])
        resp = api_client.post('/api/tournaments/join/', {'tournament_id': tournament.pk})
        assert resp.status_code == 400

    def test_insufficient_money(self, api_client, tournament, player):
        player.money = Decimal('10.00')
        player.save(update_fields=['money'])
        resp = api_client.post('/api/tournaments/join/', {'tournament_id': tournament.pk})
        assert resp.status_code == 400

    def test_registration_closed(self, api_client, tournament, player):
        tournament.start_time = timezone.now() - timedelta(hours=1)
        tournament.save(update_fields=['start_time'])
        resp = api_client.post('/api/tournaments/join/', {'tournament_id': tournament.pk})
        assert resp.status_code == 400

    def test_tournament_not_found(self, api_client):
        resp = api_client.post('/api/tournaments/join/', {'tournament_id': 99999})
        assert resp.status_code == 404


@pytest.mark.django_db
class TestTournamentResults:
    """GET /api/tournaments/{pk}/results/ -- результаты турнира."""

    def test_returns_data(self, api_client, tournament, player):
        TournamentEntry.objects.create(
            tournament=tournament, player=player,
            score=5.0, fish_count=3, rank_position=1,
        )
        resp = api_client.get(f'/api/tournaments/{tournament.pk}/results/')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 1

    def test_empty_results(self, api_client, tournament):
        resp = api_client.get(f'/api/tournaments/{tournament.pk}/results/')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 0
