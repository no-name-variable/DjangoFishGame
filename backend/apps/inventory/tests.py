"""Тесты API инвентаря."""

import pytest
from django.contrib.contenttypes.models import ContentType

from apps.inventory.models import CaughtFish, InventoryItem, PlayerRod


# ─────────────────────────── Inventory ──────────────────────

@pytest.mark.django_db
class TestInventory:
    URL = '/api/player/inventory/'

    def test_empty_inventory(self, api_client):
        resp = api_client.get(self.URL)
        assert resp.status_code == 200
        assert resp.data['results'] == []

    def test_has_items(self, api_client, player, rod_type):
        ct = ContentType.objects.get_for_model(rod_type)
        InventoryItem.objects.create(
            player=player, content_type=ct, object_id=rod_type.pk, quantity=2,
        )

        resp = api_client.get(self.URL)

        assert resp.status_code == 200
        assert len(resp.data['results']) == 1
        item = resp.data['results'][0]
        assert item['item_type'] == 'rodtype'
        assert item['quantity'] == 2


# ─────────────────────────── Player Rods ────────────────────

@pytest.mark.django_db
class TestPlayerRods:
    URL = '/api/player/rods/'

    def test_empty_rods(self, api_client):
        resp = api_client.get(self.URL)
        assert resp.status_code == 200
        assert resp.data['results'] == []

    def test_has_rod(self, api_client, player_rod):
        resp = api_client.get(self.URL)

        assert resp.status_code == 200
        assert len(resp.data['results']) == 1
        rod = resp.data['results'][0]
        assert rod['id'] == player_rod.pk
        assert rod['is_ready'] is True


# ─────────────────────────── Creel ──────────────────────────

@pytest.mark.django_db
class TestCreel:
    URL = '/api/player/creel/'

    def test_empty_creel(self, api_client):
        resp = api_client.get(self.URL)
        assert resp.status_code == 200
        assert resp.data['results'] == []

    def test_has_fish(self, api_client, player, fish_species, location):
        CaughtFish.objects.create(
            player=player, species=fish_species,
            weight=1.2, length=20.0, location=location,
        )

        resp = api_client.get(self.URL)

        assert resp.status_code == 200
        assert len(resp.data['results']) == 1
        fish = resp.data['results'][0]
        assert fish['species_name'] == fish_species.name_ru
        assert float(fish['weight']) == 1.2


# ─────────────────────────── Assemble Rod ───────────────────

@pytest.mark.django_db
class TestAssembleRod:
    URL = '/api/fishing/assemble-rod/'

    def test_assemble_success(self, api_client, player, inv_rod, rod_type, line, hook, float_tackle, bait):
        resp = api_client.post(self.URL, {
            'rod_type_id': rod_type.pk,
            'line_id': line.pk,
            'hook_id': hook.pk,
            'float_tackle_id': float_tackle.pk,
            'bait_id': bait.pk,
        })

        assert resp.status_code == 201
        assert resp.data['rod_type'] == rod_type.pk
        assert resp.data['is_assembled'] is True

        # Удочка создана в БД
        assert PlayerRod.objects.filter(player=player, rod_type=rod_type).exists()

    def test_assemble_rod_not_in_inventory(self, api_client, player, rod_type):
        """Удилища нет в инвентаре -- 400."""
        resp = api_client.post(self.URL, {'rod_type_id': rod_type.pk})
        assert resp.status_code == 400


# ─────────────────────────── Disassemble Rod ────────────────

@pytest.mark.django_db
class TestDisassembleRod:
    ASSEMBLE_URL = '/api/fishing/assemble-rod/'
    DISASSEMBLE_URL = '/api/player/rods/{id}/disassemble/'

    def test_disassemble_returns_x1_not_x2(self, api_client, player, inv_rod, rod_type, line, hook):
        """После сборки и разборки удочки компоненты должны вернуться x1, а не x2."""
        from django.contrib.contenttypes.models import ContentType

        # Кладём компоненты в инвентарь
        ct_line = ContentType.objects.get_for_model(line)
        ct_hook = ContentType.objects.get_for_model(hook)
        InventoryItem.objects.create(player=player, content_type=ct_line, object_id=line.pk, quantity=1)
        InventoryItem.objects.create(player=player, content_type=ct_hook, object_id=hook.pk, quantity=1)

        # Собираем удочку — компоненты должны уйти из инвентаря
        resp = api_client.post(self.ASSEMBLE_URL, {
            'rod_type_id': rod_type.pk,
            'line_id': line.pk,
            'hook_id': hook.pk,
        })
        assert resp.status_code == 201
        rod_id = resp.data['id']

        # После сборки инвентарь пуст
        ct_rod = ContentType.objects.get_for_model(rod_type)
        assert not InventoryItem.objects.filter(player=player, content_type=ct_rod, object_id=rod_type.pk).exists()
        assert not InventoryItem.objects.filter(player=player, content_type=ct_line, object_id=line.pk).exists()
        assert not InventoryItem.objects.filter(player=player, content_type=ct_hook, object_id=hook.pk).exists()

        # Разбираем удочку
        resp = api_client.post(self.DISASSEMBLE_URL.format(id=rod_id))
        assert resp.status_code == 200

        # Каждый компонент должен быть ровно x1
        rod_inv = InventoryItem.objects.get(player=player, content_type=ct_rod, object_id=rod_type.pk)
        line_inv = InventoryItem.objects.get(player=player, content_type=ct_line, object_id=line.pk)
        hook_inv = InventoryItem.objects.get(player=player, content_type=ct_hook, object_id=hook.pk)

        assert rod_inv.quantity == 1, f'Ожидалось 1 удилище, получено {rod_inv.quantity}'
        assert line_inv.quantity == 1, f'Ожидалось 1 леску, получено {line_inv.quantity}'
        assert hook_inv.quantity == 1, f'Ожидалось 1 крючок, получено {hook_inv.quantity}'

    def test_disassemble_without_prior_inventory(self, api_client, player, player_rod, rod_type, line, hook):
        """Разборка удочки созданной напрямую (без сборки через API) — компоненты добавляются x1."""
        from django.contrib.contenttypes.models import ContentType

        ct_rod = ContentType.objects.get_for_model(rod_type)
        ct_line = ContentType.objects.get_for_model(line)
        ct_hook = ContentType.objects.get_for_model(hook)

        resp = api_client.post(f'/api/player/rods/{player_rod.id}/disassemble/')
        assert resp.status_code == 200

        rod_inv = InventoryItem.objects.get(player=player, content_type=ct_rod, object_id=rod_type.pk)
        line_inv = InventoryItem.objects.get(player=player, content_type=ct_line, object_id=line.pk)
        hook_inv = InventoryItem.objects.get(player=player, content_type=ct_hook, object_id=hook.pk)

        assert rod_inv.quantity == 1
        assert line_inv.quantity == 1
        assert hook_inv.quantity == 1


# ─────────────────────────── Eat ────────────────────────────

@pytest.mark.django_db
class TestEat:
    URL = '/api/player/eat/'

    def test_eat_success(self, api_client, player, food):
        ct = ContentType.objects.get_for_model(food)
        InventoryItem.objects.create(
            player=player, content_type=ct, object_id=food.pk, quantity=2,
        )

        player.hunger = 50
        player.save(update_fields=['hunger'])

        resp = api_client.post(self.URL, {'food_id': food.pk})

        assert resp.status_code == 200
        assert resp.data['hunger'] == 50 + food.satiety

        # Количество еды уменьшилось
        inv = InventoryItem.objects.get(player=player, content_type=ct, object_id=food.pk)
        assert inv.quantity == 1

    def test_eat_not_in_inventory(self, api_client, player, food):
        """Еды нет в инвентаре -- 400."""
        resp = api_client.post(self.URL, {'food_id': food.pk})
        assert resp.status_code == 400
