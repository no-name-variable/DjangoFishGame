"""Тесты API аккаунтов."""

import pytest
from django.contrib.auth.models import User
from rest_framework import status

from apps.accounts.models import Player
from apps.world.models import Base


REGISTER_URL = '/api/auth/register/'
LOGIN_URL = '/api/auth/login/'
REFRESH_URL = '/api/auth/refresh/'
PROFILE_URL = '/api/auth/profile/'


# ── Register ──────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestRegister:

    def test_success(self, client):
        """Успешная регистрация создаёт User + Player с начальной базой."""
        Base.objects.create(name='Старт', min_rank=1, min_karma=0, travel_cost=0)
        resp = client.post(REGISTER_URL, {
            'username': 'newuser',
            'password': 'strongpass',
            'nickname': 'НовыйРыбак',
        })
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['nickname'] == 'НовыйРыбак'
        assert User.objects.filter(username='newuser').exists()
        player = Player.objects.get(user__username='newuser')
        assert player.current_base is not None

    def test_duplicate_username(self, client):
        """Повтор username — 400."""
        Base.objects.create(name='Старт', min_rank=1, min_karma=0, travel_cost=0)
        User.objects.create_user(username='taken', password='pass1234')
        resp = client.post(REGISTER_URL, {
            'username': 'taken',
            'password': 'strongpass',
            'nickname': 'Уникальный',
        })
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_duplicate_nickname(self, client, player):
        """Повтор nickname — 400."""
        resp = client.post(REGISTER_URL, {
            'username': 'another',
            'password': 'strongpass',
            'nickname': player.nickname,
        })
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_short_password(self, client):
        """Короткий пароль (< 6) — 400."""
        resp = client.post(REGISTER_URL, {
            'username': 'shortpw',
            'password': '123',
            'nickname': 'Коротыш',
        })
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ── Login (JWT obtain) ────────────────────────────────────────────────


@pytest.mark.django_db
class TestLogin:

    def test_success(self, user):
        """Корректные credentials → access + refresh."""
        from rest_framework.test import APIClient
        client = APIClient()
        resp = client.post(LOGIN_URL, {
            'username': 'fisher',
            'password': 'testpass123',
        })
        assert resp.status_code == status.HTTP_200_OK
        assert 'access' in resp.data
        assert 'refresh' in resp.data

    def test_wrong_password(self, user):
        """Неверный пароль — 401."""
        from rest_framework.test import APIClient
        client = APIClient()
        resp = client.post(LOGIN_URL, {
            'username': 'fisher',
            'password': 'wrongwrong',
        })
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ── Refresh ───────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestRefresh:

    def _get_refresh_token(self, user):
        from rest_framework.test import APIClient
        client = APIClient()
        resp = client.post(LOGIN_URL, {
            'username': 'fisher',
            'password': 'testpass123',
        })
        return resp.data['refresh']

    def test_success(self, user):
        """Валидный refresh → новый access."""
        from rest_framework.test import APIClient
        client = APIClient()
        refresh = self._get_refresh_token(user)
        resp = client.post(REFRESH_URL, {'refresh': refresh})
        assert resp.status_code == status.HTTP_200_OK
        assert 'access' in resp.data

    def test_invalid_token(self, db):
        """Невалидный refresh → 401."""
        from rest_framework.test import APIClient
        client = APIClient()
        resp = client.post(REFRESH_URL, {'refresh': 'invalid-token'})
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ── Profile ───────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestProfile:

    def test_success(self, api_client, player):
        """Авторизованный запрос возвращает данные PlayerSerializer."""
        resp = api_client.get(PROFILE_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['nickname'] == player.nickname
        assert 'rank' in resp.data
        assert 'money' in resp.data

    def test_unauthorized(self, client):
        """Без токена — 401."""
        resp = client.get(PROFILE_URL)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
