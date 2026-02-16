"""Тесты API барахолки."""
import pytest
from decimal import Decimal

from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import Player
from apps.bazaar.models import MarketListing
from apps.inventory.models import InventoryItem
from apps.tackle.models import Bait


@pytest.fixture
def bait_item(db):
    return Bait.objects.create(
        name='Мотыль',
        quantity_per_pack=30, price=Decimal('10.00'),
    )


@pytest.fixture
def inv_bait(player, bait_item):
    ct = ContentType.objects.get_for_model(bait_item)
    return InventoryItem.objects.create(
        player=player, content_type=ct, object_id=bait_item.pk, quantity=10,
    )


@pytest.fixture
def buyer(base):
    user2 = User.objects.create_user(username='buyer', password='testpass123')
    return Player.objects.create(
        user=user2, nickname='Покупатель', money=Decimal('500.00'),
        current_base=base,
    )


@pytest.fixture
def buyer_client(buyer):
    client = APIClient()
    token = AccessToken.for_user(buyer.user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


@pytest.fixture
def listing(player, bait_item):
    ct = ContentType.objects.get_for_model(bait_item)
    return MarketListing.objects.create(
        seller=player, content_type=ct, object_id=bait_item.pk,
        quantity=5, price=Decimal('50.00'),
    )


@pytest.mark.django_db
class TestMarketList:
    def test_empty_market(self, api_client):
        resp = api_client.get('/api/bazaar/')
        assert resp.status_code == 200
        assert resp.data['results'] == []

    def test_has_listings(self, api_client, listing):
        resp = api_client.get('/api/bazaar/')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 1

    def test_filter_by_type(self, api_client, listing):
        resp = api_client.get('/api/bazaar/?item_type=bait')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 1

        resp = api_client.get('/api/bazaar/?item_type=lure')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 0


@pytest.mark.django_db
class TestMyListings:
    def test_empty(self, api_client):
        resp = api_client.get('/api/bazaar/my/')
        assert resp.status_code == 200
        assert resp.data['results'] == []

    def test_has_listings(self, api_client, listing):
        resp = api_client.get('/api/bazaar/my/')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 1


@pytest.mark.django_db
class TestCreateListing:
    def test_success(self, api_client, inv_bait, bait_item):
        resp = api_client.post('/api/bazaar/create/', {
            'item_type': 'bait', 'item_id': bait_item.pk,
            'quantity': 3, 'price': '30.00',
        })
        assert resp.status_code == 201
        inv_bait.refresh_from_db()
        assert inv_bait.quantity == 7  # 10 - 3

    def test_not_in_inventory(self, api_client, bait_item):
        resp = api_client.post('/api/bazaar/create/', {
            'item_type': 'bait', 'item_id': bait_item.pk,
            'quantity': 1, 'price': '10.00',
        })
        assert resp.status_code == 404

    def test_not_enough_quantity(self, api_client, inv_bait, bait_item):
        resp = api_client.post('/api/bazaar/create/', {
            'item_type': 'bait', 'item_id': bait_item.pk,
            'quantity': 100, 'price': '10.00',
        })
        assert resp.status_code == 400


@pytest.mark.django_db
class TestBuyListing:
    def test_success(self, buyer_client, listing, buyer, player):
        old_seller_money = player.money
        resp = buyer_client.post(f'/api/bazaar/{listing.pk}/buy/')
        assert resp.status_code == 200
        assert resp.data['status'] == 'ok'
        buyer.refresh_from_db()
        assert buyer.money == Decimal('450.00')  # 500 - 50
        player.refresh_from_db()
        assert player.money == old_seller_money + Decimal('50.00')
        listing.refresh_from_db()
        assert not listing.is_active

    def test_buy_own_listing(self, api_client, listing):
        resp = api_client.post(f'/api/bazaar/{listing.pk}/buy/')
        assert resp.status_code == 400
        assert 'собственный' in resp.data['error'].lower()

    def test_not_enough_money(self, buyer_client, listing, buyer):
        buyer.money = Decimal('10.00')
        buyer.save(update_fields=['money'])
        resp = buyer_client.post(f'/api/bazaar/{listing.pk}/buy/')
        assert resp.status_code == 400

    def test_not_found(self, buyer_client):
        resp = buyer_client.post('/api/bazaar/9999/buy/')
        assert resp.status_code == 404


@pytest.mark.django_db
class TestCancelListing:
    def test_success(self, api_client, listing, player, bait_item):
        resp = api_client.post(f'/api/bazaar/{listing.pk}/cancel/')
        assert resp.status_code == 200
        assert resp.data['returned'] is True
        listing.refresh_from_db()
        assert not listing.is_active
        inv = InventoryItem.objects.get(
            player=player,
            content_type=listing.content_type,
            object_id=bait_item.pk,
        )
        assert inv.quantity == 5

    def test_not_owner(self, buyer_client, listing):
        resp = buyer_client.post(f'/api/bazaar/{listing.pk}/cancel/')
        assert resp.status_code == 403

    def test_already_inactive(self, api_client, listing):
        listing.is_active = False
        listing.save(update_fields=['is_active'])
        resp = api_client.post(f'/api/bazaar/{listing.pk}/cancel/')
        assert resp.status_code == 400
