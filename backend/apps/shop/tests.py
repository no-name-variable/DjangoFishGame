"""Тесты API магазина."""

import pytest
from decimal import Decimal
from rest_framework import status

from apps.accounts.models import Player
from apps.inventory.models import CaughtFish, InventoryItem
from apps.tackle.models import Hook


# ── Shop category list ────────────────────────────────────────────────


@pytest.mark.django_db
class TestShopCategory:

    def test_returns_list(self, api_client, hook):
        """GET /api/shop/hooks/ возвращает список товаров."""
        resp = api_client.get('/api/shop/hooks/')
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.data, list)
        assert len(resp.data) >= 1

    def test_multiple_categories(self, api_client, bait, lure, food):
        """Разные категории возвращают 200."""
        for cat in ('baits', 'lures', 'food'):
            resp = api_client.get(f'/api/shop/{cat}/')
            assert resp.status_code == status.HTTP_200_OK

    def test_invalid_category(self, api_client):
        """Несуществующая категория — 400."""
        resp = api_client.get('/api/shop/nonexistent/')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ── Buy ───────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestShopBuy:

    def test_success(self, api_client, player, hook):
        """Покупка предмета: деньги списываются, InventoryItem создаётся."""
        resp = api_client.post('/api/shop/buy/', {
            'item_type': 'hook',
            'item_id': hook.pk,
            'quantity': 2,
        })
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['status'] == 'ok'
        assert resp.data['quantity'] == 2

        player.refresh_from_db()
        expected_cost = hook.price * 2
        assert player.money == Decimal('1000.00') - expected_cost

        inv = InventoryItem.objects.get(player=player, object_id=hook.pk)
        assert inv.quantity == 2

    def test_increments_existing(self, api_client, player, hook):
        """Повторная покупка увеличивает quantity."""
        api_client.post('/api/shop/buy/', {
            'item_type': 'hook',
            'item_id': hook.pk,
            'quantity': 1,
        })
        api_client.post('/api/shop/buy/', {
            'item_type': 'hook',
            'item_id': hook.pk,
            'quantity': 3,
        })
        inv = InventoryItem.objects.get(player=player, object_id=hook.pk)
        assert inv.quantity == 4

    def test_not_enough_money(self, api_client, player, hook):
        """Недостаточно денег — 400."""
        player.money = Decimal('0.00')
        player.save(update_fields=['money'])
        resp = api_client.post('/api/shop/buy/', {
            'item_type': 'hook',
            'item_id': hook.pk,
            'quantity': 1,
        })
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_item_not_found(self, api_client):
        """Несуществующий item_id — 404."""
        resp = api_client.post('/api/shop/buy/', {
            'item_type': 'hook',
            'item_id': 99999,
            'quantity': 1,
        })
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_invalid_item_type(self, api_client):
        """Невалидный item_type — 400."""
        resp = api_client.post('/api/shop/buy/', {
            'item_type': 'spaceship',
            'item_id': 1,
            'quantity': 1,
        })
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ── Sell fish ─────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestSellFish:

    def test_success(self, api_client, player, location, fish_species):
        """Продажа рыбы: деньги начисляются, is_sold = True."""
        fish = CaughtFish.objects.create(
            player=player, species=fish_species,
            weight=1.0, length=20.0, location=location,
        )
        money_before = player.money

        resp = api_client.post('/api/shop/sell-fish/', {
            'fish_ids': [fish.pk],
        }, format='json')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['fish_sold'] == 1

        fish.refresh_from_db()
        assert fish.is_sold is True

        player.refresh_from_db()
        expected_income = (fish_species.sell_price_per_kg * Decimal('1.0')).quantize(Decimal('0.01'))
        assert player.money == money_before + expected_income

    def test_sell_multiple(self, api_client, player, location, fish_species):
        """Продажа нескольких рыб за раз."""
        f1 = CaughtFish.objects.create(
            player=player, species=fish_species,
            weight=0.5, length=15.0, location=location,
        )
        f2 = CaughtFish.objects.create(
            player=player, species=fish_species,
            weight=1.5, length=30.0, location=location,
        )
        resp = api_client.post('/api/shop/sell-fish/', {
            'fish_ids': [f1.pk, f2.pk],
        }, format='json')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['fish_sold'] == 2

    def test_empty_creel(self, api_client, player):
        """Пустой садок (нет рыбы по указанным id) — 400."""
        resp = api_client.post('/api/shop/sell-fish/', {
            'fish_ids': [99999],
        }, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_already_sold(self, api_client, player, location, fish_species):
        """Повторная продажа уже проданной рыбы — 400."""
        fish = CaughtFish.objects.create(
            player=player, species=fish_species,
            weight=1.0, length=20.0, location=location,
            is_sold=True,
        )
        resp = api_client.post('/api/shop/sell-fish/', {
            'fish_ids': [fish.pk],
        }, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
