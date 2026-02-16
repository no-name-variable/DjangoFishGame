"""Тесты API мира — базы и локации."""

import pytest
from decimal import Decimal
from rest_framework import status

from apps.accounts.models import Player
from apps.world.models import Base, Location


# ── Base list ─────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestBaseList:

    def test_returns_list(self, api_client, base):
        """GET /api/bases/ возвращает список баз."""
        resp = api_client.get('/api/bases/')
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.data['results'], list)
        assert len(resp.data['results']) >= 1
        assert resp.data['results'][0]['name'] == base.name


# ── Base locations ────────────────────────────────────────────────────


@pytest.mark.django_db
class TestBaseLocations:

    def test_returns_locations(self, api_client, base, location):
        """GET /api/bases/{id}/locations/ возвращает локации базы."""
        resp = api_client.get(f'/api/bases/{base.pk}/locations/')
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.data['results'], list)
        assert len(resp.data['results']) == 1
        assert resp.data['results'][0]['name'] == location.name


# ── Travel ────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestTravel:

    def test_success(self, api_client, player):
        """Переезд на доступную базу: деньги списываются, current_base меняется."""
        new_base = Base.objects.create(
            name='Новая база', min_rank=1, min_karma=0,
            travel_cost=Decimal('100.00'),
        )
        resp = api_client.post(f'/api/bases/{new_base.pk}/travel/')
        assert resp.status_code == status.HTTP_200_OK
        player.refresh_from_db()
        assert player.current_base == new_base
        assert player.current_location is None
        assert player.money == Decimal('900.00')

    def test_insufficient_rank(self, api_client, player):
        """Недостаточный разряд — 403."""
        hard_base = Base.objects.create(
            name='Элитная база', min_rank=99, min_karma=0,
            travel_cost=Decimal('0'),
        )
        resp = api_client.post(f'/api/bases/{hard_base.pk}/travel/')
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_insufficient_karma(self, api_client, player):
        """Недостаточная карма — 403."""
        karma_base = Base.objects.create(
            name='Карма база', min_rank=1, min_karma=999,
            travel_cost=Decimal('0'),
        )
        resp = api_client.post(f'/api/bases/{karma_base.pk}/travel/')
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_insufficient_money(self, api_client, player):
        """Недостаточно денег — 400."""
        expensive_base = Base.objects.create(
            name='Дорогая база', min_rank=1, min_karma=0,
            travel_cost=Decimal('99999.00'),
        )
        resp = api_client.post(f'/api/bases/{expensive_base.pk}/travel/')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ── Location enter ────────────────────────────────────────────────────


@pytest.mark.django_db
class TestLocationEnter:

    def test_success(self, api_client, player, location):
        """Вход на локацию своей базы."""
        resp = api_client.post(f'/api/locations/{location.pk}/enter/')
        assert resp.status_code == status.HTTP_200_OK
        player.refresh_from_db()
        assert player.current_location == location

    def test_wrong_base(self, api_client, player):
        """Попытка войти на локацию другой базы — 400."""
        other_base = Base.objects.create(
            name='Другая база', min_rank=1, min_karma=0, travel_cost=0,
        )
        other_loc = Location.objects.create(
            base=other_base, name='Чужая локация',
            min_rank=1, depth_map={'avg': 2.0},
        )
        resp = api_client.post(f'/api/locations/{other_loc.pk}/enter/')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_insufficient_rank(self, api_client, player, base):
        """Недостаточный разряд для локации — 403."""
        hard_loc = Location.objects.create(
            base=base, name='Сложная локация',
            min_rank=99, depth_map={'avg': 5.0},
        )
        resp = api_client.post(f'/api/locations/{hard_loc.pk}/enter/')
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ── Location leave ────────────────────────────────────────────────────


@pytest.mark.django_db
class TestLocationLeave:

    def test_success(self, api_client, player, location):
        """Выход с локации обнуляет current_location."""
        player.current_location = location
        player.save(update_fields=['current_location'])

        resp = api_client.post(f'/api/locations/{location.pk}/leave/')
        assert resp.status_code == status.HTTP_200_OK
        player.refresh_from_db()
        assert player.current_location is None
