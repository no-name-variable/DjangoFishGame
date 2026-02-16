"""Тесты API квестов."""

import pytest
from decimal import Decimal

from apps.quests.models import PlayerQuest, Quest


@pytest.fixture
def quest(db):
    return Quest.objects.create(
        name='Поймай карася',
        description='Поймайте 1 рыбу любого вида.',
        quest_type='catch_fish',
        target_count=1,
        reward_money=Decimal('100.00'),
        reward_experience=50,
        min_rank=1,
    )


@pytest.mark.django_db
class TestAvailableQuests:
    """GET /api/quests/ -- доступные квесты."""

    def test_returns_list(self, api_client, quest):
        resp = api_client.get('/api/quests/')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 1
        assert resp.data['results'][0]['name'] == quest.name

    def test_excludes_taken_quests(self, api_client, quest, player):
        PlayerQuest.objects.create(player=player, quest=quest)
        resp = api_client.get('/api/quests/')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 0

    def test_excludes_high_rank_quests(self, api_client, quest):
        quest.min_rank = 99
        quest.save(update_fields=['min_rank'])
        resp = api_client.get('/api/quests/')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 0


@pytest.mark.django_db
class TestPlayerQuests:
    """GET /api/quests/my/ -- квесты игрока."""

    def test_empty_initially(self, api_client):
        resp = api_client.get('/api/quests/my/')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 0

    def test_shows_accepted_quest(self, api_client, quest, player):
        PlayerQuest.objects.create(player=player, quest=quest)
        resp = api_client.get('/api/quests/my/')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 1


@pytest.mark.django_db
class TestAcceptQuest:
    """POST /api/quests/accept/ -- взять квест."""

    def test_success(self, api_client, quest, player):
        resp = api_client.post('/api/quests/accept/', {'quest_id': quest.pk})
        assert resp.status_code == 201
        assert PlayerQuest.objects.filter(player=player, quest=quest, status='active').exists()

    def test_already_accepted(self, api_client, quest, player):
        PlayerQuest.objects.create(player=player, quest=quest)
        resp = api_client.post('/api/quests/accept/', {'quest_id': quest.pk})
        assert resp.status_code == 400

    def test_quest_not_found(self, api_client):
        resp = api_client.post('/api/quests/accept/', {'quest_id': 99999})
        assert resp.status_code == 404

    def test_insufficient_rank(self, api_client, quest):
        quest.min_rank = 99
        quest.save(update_fields=['min_rank'])
        resp = api_client.post('/api/quests/accept/', {'quest_id': quest.pk})
        assert resp.status_code == 400


@pytest.mark.django_db
class TestClaimQuestReward:
    """POST /api/quests/{pk}/claim/ -- получить награду."""

    def test_success(self, api_client, quest, player):
        pq = PlayerQuest.objects.create(player=player, quest=quest, status='completed')
        initial_money = player.money
        resp = api_client.post(f'/api/quests/{pq.pk}/claim/')
        assert resp.status_code == 200
        player.refresh_from_db()
        assert player.money == initial_money + quest.reward_money
        pq.refresh_from_db()
        assert pq.status == 'claimed'

    def test_not_completed_yet(self, api_client, quest, player):
        pq = PlayerQuest.objects.create(player=player, quest=quest, status='active')
        resp = api_client.post(f'/api/quests/{pq.pk}/claim/')
        assert resp.status_code == 400

    def test_quest_not_found(self, api_client):
        resp = api_client.post('/api/quests/99999/claim/')
        assert resp.status_code == 404
