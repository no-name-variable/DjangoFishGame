"""Тесты API рекордов, достижений и газеты."""

import pytest

from apps.records.models import Achievement, FishRecord, PlayerAchievement


@pytest.mark.django_db
class TestFishRecordList:
    """GET /api/records/ -- таблица рекордов."""

    def test_returns_list(self, api_client, player, fish_species, location):
        FishRecord.objects.create(
            species=fish_species, player=player,
            weight=1.5, length=25.0, location=location,
        )
        resp = api_client.get('/api/records/')
        assert resp.status_code == 200
        assert len(resp.data['results']) >= 1

    def test_empty(self, api_client):
        resp = api_client.get('/api/records/')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 0


@pytest.mark.django_db
class TestFishRecordBySpecies:
    """GET /api/records/species/{species_id}/ -- рекорды по виду."""

    def test_returns_records(self, api_client, player, fish_species, location):
        FishRecord.objects.create(
            species=fish_species, player=player,
            weight=1.5, length=25.0, location=location,
        )
        resp = api_client.get(f'/api/records/species/{fish_species.pk}/')
        assert resp.status_code == 200
        assert len(resp.data['results']) >= 1

    def test_empty_for_species(self, api_client, fish_species):
        resp = api_client.get(f'/api/records/species/{fish_species.pk}/')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 0


@pytest.mark.django_db
class TestAchievementList:
    """GET /api/achievements/ -- все достижения."""

    def test_returns_list(self, api_client):
        Achievement.objects.create(
            name='Первый улов',
            description='Поймайте первую рыбу.',
            category='catch',
            condition_type='fish_count',
            condition_value=1,
        )
        resp = api_client.get('/api/achievements/')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 1
        assert resp.data['results'][0]['name'] == 'Первый улов'


@pytest.mark.django_db
class TestPlayerAchievements:
    """GET /api/player/achievements/ -- достижения игрока."""

    def test_empty(self, api_client):
        resp = api_client.get('/api/player/achievements/')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 0

    def test_has_achievement(self, api_client, player):
        ach = Achievement.objects.create(
            name='Первый улов',
            description='Поймайте первую рыбу.',
            category='catch',
            condition_type='fish_count',
            condition_value=1,
        )
        PlayerAchievement.objects.create(player=player, achievement=ach)
        resp = api_client.get('/api/player/achievements/')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 1


@pytest.mark.django_db
class TestPlayerJournal:
    """GET /api/player/journal/ -- журнал уловов."""

    def test_returns_records(self, api_client, player, fish_species, location):
        FishRecord.objects.create(
            species=fish_species, player=player,
            weight=1.5, length=25.0, location=location,
        )
        resp = api_client.get('/api/player/journal/')
        assert resp.status_code == 200
        assert len(resp.data['results']) >= 1

    def test_empty(self, api_client):
        resp = api_client.get('/api/player/journal/')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 0


@pytest.mark.django_db
class TestNewspaper:
    """GET /api/newspaper/ -- газета."""

    def test_returns_200(self, api_client):
        resp = api_client.get('/api/newspaper/')
        assert resp.status_code == 200
        assert 'weekly_champions' in resp.data
        assert 'top_players' in resp.data
        assert 'top_records' in resp.data
        assert 'stats' in resp.data
