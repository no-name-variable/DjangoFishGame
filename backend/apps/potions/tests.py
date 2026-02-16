"""Тесты API зелий."""
import pytest
from decimal import Decimal

from apps.potions.models import MarineStar, PlayerStar, Potion, PlayerPotion
from apps.fishing.models import GameTime


@pytest.fixture
def marine_star_red(db):
    return MarineStar.objects.create(color='red', name='Красная звезда', drop_chance=0.05)


@pytest.fixture
def marine_star_blue(db):
    return MarineStar.objects.create(color='blue', name='Синяя звезда', drop_chance=0.03)


@pytest.fixture
def potion_luck(marine_star_red):
    return Potion.objects.create(
        name='Зелье удачи', effect_type='luck', effect_value=1.3,
        karma_cost=50, duration_hours=6,
        required_stars={'red': 2},
    )


@pytest.fixture
def potion_rank(marine_star_red, marine_star_blue):
    return Potion.objects.create(
        name='Зелье разряда', effect_type='rank_boost', effect_value=1,
        karma_cost=100, duration_hours=0,
        required_stars={'red': 1, 'blue': 1},
        is_one_time=True,
    )


@pytest.fixture
def player_with_stars(player, marine_star_red, marine_star_blue):
    player.karma = 200
    player.save(update_fields=['karma'])
    PlayerStar.objects.create(player=player, star=marine_star_red, quantity=5)
    PlayerStar.objects.create(player=player, star=marine_star_blue, quantity=3)
    return player


@pytest.mark.django_db
class TestPotionList:
    def test_list_potions(self, api_client, potion_luck):
        resp = api_client.get('/api/potions/')
        assert resp.status_code == 200
        assert len(resp.data) >= 1
        assert resp.data[0]['name'] == 'Зелье удачи'

    def test_list_empty(self, api_client):
        resp = api_client.get('/api/potions/')
        assert resp.status_code == 200
        assert resp.data == []


@pytest.mark.django_db
class TestMyStars:
    def test_no_stars(self, api_client):
        resp = api_client.get('/api/potions/stars/')
        assert resp.status_code == 200
        assert resp.data == []

    def test_has_stars(self, api_client, player_with_stars):
        resp = api_client.get('/api/potions/stars/')
        assert resp.status_code == 200
        assert len(resp.data) == 2


@pytest.mark.django_db
class TestActivePotions:
    def test_no_active(self, api_client):
        resp = api_client.get('/api/potions/active/')
        assert resp.status_code == 200
        assert resp.data == []

    def test_has_active(self, api_client, player, potion_luck, game_time):
        PlayerPotion.objects.create(
            player=player, potion=potion_luck,
            activated_at_hour=10, activated_at_day=1,
            expires_at_hour=16, expires_at_day=1,
        )
        resp = api_client.get('/api/potions/active/')
        assert resp.status_code == 200
        assert len(resp.data) == 1


@pytest.mark.django_db
class TestCraftPotion:
    def test_craft_duration_potion(self, api_client, player_with_stars, potion_luck, game_time):
        resp = api_client.post('/api/potions/craft/', {'potion_id': potion_luck.pk})
        assert resp.status_code == 200
        assert 'активировано' in resp.data['message']
        player_with_stars.refresh_from_db()
        assert player_with_stars.karma == 150  # 200 - 50
        red_star = PlayerStar.objects.get(player=player_with_stars, star__color='red')
        assert red_star.quantity == 3  # 5 - 2

    def test_craft_instant_potion(self, api_client, player_with_stars, potion_rank, game_time):
        old_rank = player_with_stars.rank
        resp = api_client.post('/api/potions/craft/', {'potion_id': potion_rank.pk})
        assert resp.status_code == 200
        assert 'new_rank' in resp.data
        player_with_stars.refresh_from_db()
        assert player_with_stars.rank == old_rank + 1

    def test_craft_not_enough_karma(self, api_client, player, potion_luck, marine_star_red):
        player.karma = 10
        player.save(update_fields=['karma'])
        PlayerStar.objects.create(player=player, star=marine_star_red, quantity=5)
        resp = api_client.post('/api/potions/craft/', {'potion_id': potion_luck.pk})
        assert resp.status_code == 400
        assert 'карм' in resp.data['error'].lower()

    def test_craft_not_enough_stars(self, api_client, player, potion_luck, marine_star_red):
        player.karma = 200
        player.save(update_fields=['karma'])
        PlayerStar.objects.create(player=player, star=marine_star_red, quantity=1)
        resp = api_client.post('/api/potions/craft/', {'potion_id': potion_luck.pk})
        assert resp.status_code == 400
        assert 'звёзд' in resp.data['error'].lower()

    def test_craft_not_found(self, api_client):
        resp = api_client.post('/api/potions/craft/', {'potion_id': 9999})
        assert resp.status_code == 404
