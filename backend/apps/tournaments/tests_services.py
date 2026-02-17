"""Юнит-тесты для сервисов tournaments (finalize_tournament)."""

import pytest
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from django.contrib.auth.models import User

from apps.tournaments.services import TournamentService
from apps.tournaments.models import Tournament, TournamentEntry
from apps.inventory.models import CaughtFish
from apps.accounts.models import Player
from apps.teams.models import Team, TeamMembership


@pytest.fixture
def tournament_location(base):
    from apps.world.models import Location
    return Location.objects.create(
        base=base, name='Турнирное озеро', description='Тест',
        min_rank=1, depth_map={'avg': 3.0, 'min': 1.0, 'max': 5.0},
    )


@pytest.fixture
def active_tournament(tournament_location):
    """Активный турнир."""
    now = timezone.now()
    return Tournament.objects.create(
        name='Весенний кубок',
        tournament_type='individual',
        scoring='weight',
        start_time=now - timedelta(hours=2),
        end_time=now + timedelta(hours=1),
        entry_fee=Decimal('50.00'),
        min_rank=1,
        max_participants=10,
        target_location=tournament_location,
        prize_money=Decimal('1000.00'),
        prize_experience=500,
        prize_karma=100,
    )


@pytest.fixture
def finished_tournament(tournament_location):
    """Завершённый турнир."""
    now = timezone.now()
    return Tournament.objects.create(
        name='Прошедший турнир',
        tournament_type='individual',
        scoring='weight',
        start_time=now - timedelta(hours=3),
        end_time=now - timedelta(hours=1),
        entry_fee=Decimal('50.00'),
        min_rank=1,
        target_location=tournament_location,
        prize_money=Decimal('500.00'),
        prize_experience=200,
    )


def create_player(username, nickname):
    """Хелпер для создания игрока."""
    from apps.world.models import Base
    base = Base.objects.first() or Base.objects.create(
        name='База', description='Тест',
        min_rank=1, min_karma=0, travel_cost=0,
    )
    user = User.objects.create_user(username=username, password='pass')
    return Player.objects.create(
        user=user, nickname=nickname, money=Decimal('1000.00'),
        current_base=base,
    )


def create_caught_fish(player, species, weight, length, location, caught_at, **kwargs):
    """Хелпер для создания CaughtFish с нужным caught_at (auto_now_add игнорирует параметр)."""
    fish = CaughtFish.objects.create(
        player=player, species=species,
        weight=weight, length=length, location=location,
        **kwargs,
    )
    CaughtFish.objects.filter(pk=fish.pk).update(caught_at=caught_at)
    fish.refresh_from_db()
    return fish


@pytest.mark.django_db
class TestFinalizeIndividualTournament:
    """Тесты подведения итогов индивидуального турнира."""

    def setup_method(self):
        self.svc = TournamentService()

    def test_scoring_by_weight(self, finished_tournament, fish_species, tournament_location):
        """Подсчёт очков по весу рыбы."""
        player1 = create_player('p1', 'Игрок 1')
        player2 = create_player('p2', 'Игрок 2')

        entry1 = TournamentEntry.objects.create(tournament=finished_tournament, player=player1)
        entry2 = TournamentEntry.objects.create(tournament=finished_tournament, player=player2)

        # Игрок 1: 5 кг
        create_caught_fish(
            player=player1, species=fish_species,
            weight=Decimal('3.0'), length=30, location=tournament_location,
            caught_at=finished_tournament.start_time + timedelta(minutes=30),
        )
        create_caught_fish(
            player=player1, species=fish_species,
            weight=Decimal('2.0'), length=25, location=tournament_location,
            caught_at=finished_tournament.start_time + timedelta(minutes=60),
        )

        # Игрок 2: 4 кг
        create_caught_fish(
            player=player2, species=fish_species,
            weight=Decimal('4.0'), length=35, location=tournament_location,
            caught_at=finished_tournament.start_time + timedelta(minutes=45),
        )

        self.svc.finalize_tournament(finished_tournament.pk)

        entry1.refresh_from_db()
        entry2.refresh_from_db()

        assert entry1.score == Decimal('5.0')
        assert entry1.fish_count == 2
        assert entry1.rank_position == 1

        assert entry2.score == Decimal('4.0')
        assert entry2.fish_count == 1
        assert entry2.rank_position == 2

    def test_scoring_by_count(self, finished_tournament, fish_species, tournament_location):
        """Подсчёт очков по количеству рыбы."""
        finished_tournament.scoring = 'count'
        finished_tournament.save()

        player1 = create_player('p1', 'Игрок 1')
        player2 = create_player('p2', 'Игрок 2')

        entry1 = TournamentEntry.objects.create(tournament=finished_tournament, player=player1)
        entry2 = TournamentEntry.objects.create(tournament=finished_tournament, player=player2)

        # Игрок 1: 3 рыбы
        for i in range(3):
            create_caught_fish(
                player=player1, species=fish_species,
                weight=Decimal('1.0'), length=20, location=tournament_location,
                caught_at=finished_tournament.start_time + timedelta(minutes=i * 10),
            )

        # Игрок 2: 2 рыбы
        for i in range(2):
            create_caught_fish(
                player=player2, species=fish_species,
                weight=Decimal('2.0'), length=25, location=tournament_location,
                caught_at=finished_tournament.start_time + timedelta(minutes=i * 10),
            )

        self.svc.finalize_tournament(finished_tournament.pk)

        entry1.refresh_from_db()
        entry2.refresh_from_db()

        assert entry1.score == 3
        assert entry1.rank_position == 1
        assert entry2.score == 2
        assert entry2.rank_position == 2

    def test_fish_outside_time_not_counted(self, finished_tournament, fish_species, tournament_location):
        """Рыба, пойманная вне времени турнира, не засчитывается."""
        player = create_player('p1', 'Игрок 1')
        entry = TournamentEntry.objects.create(tournament=finished_tournament, player=player)

        # До турнира
        create_caught_fish(
            player=player, species=fish_species,
            weight=Decimal('5.0'), length=40, location=tournament_location,
            caught_at=finished_tournament.start_time - timedelta(hours=1),
        )

        # После турнира
        create_caught_fish(
            player=player, species=fish_species,
            weight=Decimal('5.0'), length=40, location=tournament_location,
            caught_at=finished_tournament.end_time + timedelta(hours=1),
        )

        # Во время турнира
        create_caught_fish(
            player=player, species=fish_species,
            weight=Decimal('3.0'), length=30, location=tournament_location,
            caught_at=finished_tournament.start_time + timedelta(minutes=30),
        )

        self.svc.finalize_tournament(finished_tournament.pk)

        entry.refresh_from_db()
        assert entry.score == Decimal('3.0')

    def test_released_fish_not_counted(self, finished_tournament, fish_species, tournament_location):
        """Отпущенная рыба не засчитывается."""
        player = create_player('p1', 'Игрок 1')
        entry = TournamentEntry.objects.create(tournament=finished_tournament, player=player)

        create_caught_fish(
            player=player, species=fish_species,
            weight=Decimal('3.0'), length=30, location=tournament_location,
            caught_at=finished_tournament.start_time + timedelta(minutes=30),
            is_released=True,
        )

        self.svc.finalize_tournament(finished_tournament.pk)

        entry.refresh_from_db()
        assert entry.score == 0

    def test_target_location_filtering(self, finished_tournament, fish_species):
        """Фильтрация по целевой локации."""
        from apps.world.models import Location

        other_location = Location.objects.create(
            base=finished_tournament.target_location.base,
            name='Другая локация', description='Тест',
        )

        player = create_player('p1', 'Игрок 1')
        entry = TournamentEntry.objects.create(tournament=finished_tournament, player=player)

        # В другой локации
        create_caught_fish(
            player=player, species=fish_species,
            weight=Decimal('5.0'), length=40, location=other_location,
            caught_at=finished_tournament.start_time + timedelta(minutes=30),
        )

        # В целевой локации
        create_caught_fish(
            player=player, species=fish_species,
            weight=Decimal('2.0'), length=25, location=finished_tournament.target_location,
            caught_at=finished_tournament.start_time + timedelta(minutes=45),
        )

        self.svc.finalize_tournament(finished_tournament.pk)

        entry.refresh_from_db()
        assert entry.score == Decimal('2.0')

    def test_prizes_awarded_to_top3(self, finished_tournament, fish_species, tournament_location):
        """Призы начисляются топ-3."""
        players = [create_player(f'p{i}', f'Игрок {i}') for i in range(1, 4)]

        for i, player in enumerate(players, 1):
            TournamentEntry.objects.create(tournament=finished_tournament, player=player)
            create_caught_fish(
                player=player, species=fish_species,
                weight=Decimal(str(10 - i)), length=30, location=tournament_location,
                caught_at=finished_tournament.start_time + timedelta(minutes=30),
            )

        self.svc.finalize_tournament(finished_tournament.pk)

        for player in players:
            player.refresh_from_db()

        # 1-е место: 100%
        assert players[0].money == Decimal('1000.00') + Decimal('500.00')
        # 2-е место: 50%
        assert players[1].money == Decimal('1000.00') + Decimal('250.00')
        # 3-е место: 25%
        assert players[2].money == Decimal('1000.00') + Decimal('125.00')

    def test_tournament_marked_as_finished(self, finished_tournament):
        """Турнир помечается как завершённый."""
        player = create_player('p1', 'Игрок 1')
        TournamentEntry.objects.create(tournament=finished_tournament, player=player)

        assert finished_tournament.is_finished is False

        self.svc.finalize_tournament(finished_tournament.pk)

        finished_tournament.refresh_from_db()
        assert finished_tournament.is_finished is True


@pytest.mark.django_db
class TestFinalizeTeamTournament:
    """Тесты подведения итогов командного турнира."""

    def setup_method(self):
        self.svc = TournamentService()

    def test_team_scores_summed(self, finished_tournament, fish_species, tournament_location):
        """Очки команды суммируются."""
        finished_tournament.tournament_type = 'team'
        finished_tournament.save()

        # Команда 1: 2 игрока
        p1 = create_player('p1', 'Игрок 1')
        p2 = create_player('p2', 'Игрок 2')
        team1 = Team.objects.create(name='Команда 1', leader=p1)
        TeamMembership.objects.create(team=team1, player=p1, role='leader')
        TeamMembership.objects.create(team=team1, player=p2, role='member')

        entry1 = TournamentEntry.objects.create(tournament=finished_tournament, player=p1, team=team1)
        entry2 = TournamentEntry.objects.create(tournament=finished_tournament, player=p2, team=team1)

        # Команда 2: 1 игрок
        p3 = create_player('p3', 'Игрок 3')
        team2 = Team.objects.create(name='Команда 2', leader=p3)
        TeamMembership.objects.create(team=team2, player=p3, role='leader')

        entry3 = TournamentEntry.objects.create(tournament=finished_tournament, player=p3, team=team2)

        # Улов команды 1: 3 + 2 = 5 кг
        create_caught_fish(
            player=p1, species=fish_species, weight=Decimal('3.0'),
            length=30, location=tournament_location,
            caught_at=finished_tournament.start_time + timedelta(minutes=30),
        )
        create_caught_fish(
            player=p2, species=fish_species, weight=Decimal('2.0'),
            length=25, location=tournament_location,
            caught_at=finished_tournament.start_time + timedelta(minutes=45),
        )

        # Улов команды 2: 6 кг
        create_caught_fish(
            player=p3, species=fish_species, weight=Decimal('6.0'),
            length=40, location=tournament_location,
            caught_at=finished_tournament.start_time + timedelta(minutes=50),
        )

        self.svc.finalize_tournament(finished_tournament.pk)

        entry1.refresh_from_db()
        entry2.refresh_from_db()
        entry3.refresh_from_db()

        # Команда 2 (6 кг) на 1-м месте
        assert entry3.rank_position == 1

        # Команда 1 (5 кг) на 2-м месте
        assert entry1.rank_position == 2
        assert entry2.rank_position == 2

    def test_team_prizes_divided(self, finished_tournament, fish_species, tournament_location):
        """Призы команды делятся между членами."""
        finished_tournament.tournament_type = 'team'
        finished_tournament.prize_money = Decimal('600.00')
        finished_tournament.save()

        p1 = create_player('p1', 'Игрок 1')
        p2 = create_player('p2', 'Игрок 2')
        team = Team.objects.create(name='Команда', leader=p1)
        TeamMembership.objects.create(team=team, player=p1, role='leader')
        TeamMembership.objects.create(team=team, player=p2, role='member')

        TournamentEntry.objects.create(tournament=finished_tournament, player=p1, team=team)
        TournamentEntry.objects.create(tournament=finished_tournament, player=p2, team=team)

        # Улов
        create_caught_fish(
            player=p1, species=fish_species, weight=Decimal('5.0'),
            length=35, location=tournament_location,
            caught_at=finished_tournament.start_time + timedelta(minutes=30),
        )

        self.svc.finalize_tournament(finished_tournament.pk)

        p1.refresh_from_db()
        p2.refresh_from_db()

        # Приз 600 * 100% / 2 = 300 на игрока
        assert p1.money == Decimal('1000.00') + Decimal('300.00')
        assert p2.money == Decimal('1000.00') + Decimal('300.00')
