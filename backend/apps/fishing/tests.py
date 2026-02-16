"""Тесты API рыбалки — мульти-удочки."""

from datetime import timedelta

import pytest
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

from apps.fishing.models import FishingSession, GroundbaitSpot
from apps.inventory.models import InventoryItem


# ─────────────────────────── Cast ───────────────────────────

@pytest.mark.django_db
class TestCast:
    URL = '/api/fishing/cast/'

    def test_cast_success(self, api_client, player, location, player_rod):
        player.current_location = location
        player.save(update_fields=['current_location'])

        resp = api_client.post(self.URL, {
            'rod_id': player_rod.pk,
            'point_x': 10.5,
            'point_y': 20.3,
        })

        assert resp.status_code == 200
        assert resp.data['status'] == 'cast_ok'
        assert 'session_id' in resp.data
        assert 'slot' in resp.data

        session = FishingSession.objects.get(player=player)
        assert session.state == FishingSession.State.WAITING
        assert session.slot == resp.data['slot']

    def test_cast_no_location(self, api_client, player, player_rod):
        player.current_location = None
        player.save(update_fields=['current_location'])

        resp = api_client.post(self.URL, {
            'rod_id': player_rod.pk,
            'point_x': 10.5,
            'point_y': 20.3,
        })

        assert resp.status_code == 400

    def test_cast_rod_not_found(self, api_client, player, location):
        player.current_location = location
        player.save(update_fields=['current_location'])

        resp = api_client.post(self.URL, {
            'rod_id': 99999,
            'point_x': 10.5,
            'point_y': 20.3,
        })

        assert resp.status_code == 404

    def test_cast_rod_not_ready(self, api_client, player, location, rod_type):
        from apps.inventory.models import PlayerRod

        player.current_location = location
        player.save(update_fields=['current_location'])

        incomplete_rod = PlayerRod.objects.create(
            player=player, rod_type=rod_type, is_assembled=True,
        )

        resp = api_client.post(self.URL, {
            'rod_id': incomplete_rod.pk,
            'point_x': 10.5,
            'point_y': 20.3,
        })

        assert resp.status_code == 400

    def test_cast_duplicate_rod(self, api_client, player, location, player_rod):
        """Нельзя забросить ту же удочку дважды."""
        player.current_location = location
        player.save(update_fields=['current_location'])

        resp1 = api_client.post(self.URL, {
            'rod_id': player_rod.pk,
            'point_x': 10.5,
            'point_y': 20.3,
        })
        assert resp1.status_code == 200

        resp2 = api_client.post(self.URL, {
            'rod_id': player_rod.pk,
            'point_x': 30.0,
            'point_y': 40.0,
        })
        assert resp2.status_code == 400


# ─────────────────────────── Status ─────────────────────────

@pytest.mark.django_db
class TestFishingStatus:
    URL = '/api/fishing/status/'

    def test_idle_when_no_session(self, api_client):
        resp = api_client.get(self.URL)
        assert resp.status_code == 200
        assert resp.data['sessions'] == []

    def test_waiting_state(self, api_client, fishing_session_waiting):
        resp = api_client.get(self.URL)
        assert resp.status_code == 200
        assert len(resp.data['sessions']) == 1
        assert resp.data['sessions'][0]['state'] == 'waiting'


# ─────────────────────────── Strike ─────────────────────────

@pytest.mark.django_db
class TestStrike:
    URL = '/api/fishing/strike/'

    def test_strike_success(self, api_client, fishing_session_bite):
        resp = api_client.post(self.URL, {'session_id': fishing_session_bite.pk})

        assert resp.status_code == 200
        assert resp.data['status'] == 'fighting'
        assert 'fish' in resp.data
        assert 'tension' in resp.data
        assert 'distance' in resp.data

        fishing_session_bite.refresh_from_db()
        assert fishing_session_bite.state == FishingSession.State.FIGHTING

    def test_strike_no_bite(self, api_client, player):
        resp = api_client.post(self.URL, {'session_id': 99999})
        assert resp.status_code == 404

    def test_strike_late(self, api_client, fishing_session_bite):
        fishing_session_bite.bite_time = timezone.now() - timedelta(seconds=10)
        fishing_session_bite.save(update_fields=['bite_time'])

        resp = api_client.post(self.URL, {'session_id': fishing_session_bite.pk})

        assert resp.status_code == 400

        fishing_session_bite.refresh_from_db()
        assert fishing_session_bite.state == FishingSession.State.WAITING
        assert fishing_session_bite.hooked_species is None


# ─────────────────────────── Reel-in ────────────────────────

@pytest.mark.django_db
class TestReelIn:
    URL = '/api/fishing/reel-in/'

    def test_reel_in_success(self, api_client, fishing_session_fighting):
        resp = api_client.post(self.URL, {'session_id': fishing_session_fighting.pk})

        assert resp.status_code == 200
        assert 'result' in resp.data
        assert resp.data['result'] in ('fighting', 'caught', 'line_break', 'rod_break')

        if resp.data['result'] == 'fighting':
            assert 'tension' in resp.data
            assert 'distance' in resp.data
        elif resp.data['result'] == 'caught':
            assert 'fish' in resp.data
            assert 'weight' in resp.data

    def test_reel_in_no_fighting(self, api_client, player):
        resp = api_client.post(self.URL, {'session_id': 99999})
        assert resp.status_code == 404


# ─────────────────────────── Pull ───────────────────────────

@pytest.mark.django_db
class TestPull:
    URL = '/api/fishing/pull/'

    def test_pull_success(self, api_client, fishing_session_fighting):
        resp = api_client.post(self.URL, {'session_id': fishing_session_fighting.pk})

        assert resp.status_code == 200
        assert 'result' in resp.data
        assert resp.data['result'] in ('fighting', 'caught', 'line_break', 'rod_break')


# ─────────────────────────── Keep ───────────────────────────

@pytest.mark.django_db
class TestKeep:
    URL = '/api/fishing/keep/'

    def test_keep_success(self, api_client, fishing_session_caught):
        resp = api_client.post(self.URL, {'session_id': fishing_session_caught.pk})

        assert resp.status_code == 201
        assert 'species_name' in resp.data
        assert 'weight' in resp.data

        assert not FishingSession.objects.filter(
            player=fishing_session_caught.player,
        ).exists()

    def test_keep_no_caught_fish(self, api_client, player):
        resp = api_client.post(self.URL, {'session_id': 99999})
        assert resp.status_code == 404


# ─────────────────────────── Release ────────────────────────

@pytest.mark.django_db
class TestRelease:
    URL = '/api/fishing/release/'

    def test_release_success(self, api_client, player, fishing_session_caught):
        karma_before = player.karma

        resp = api_client.post(self.URL, {'session_id': fishing_session_caught.pk})

        assert resp.status_code == 200
        assert resp.data['status'] == 'released'
        assert 'karma_bonus' in resp.data
        assert resp.data['karma_total'] > karma_before

        assert not FishingSession.objects.filter(player=player).exists()

    def test_release_no_caught_fish(self, api_client, player):
        resp = api_client.post(self.URL, {'session_id': 99999})
        assert resp.status_code == 404


# ─────────────────────────── Retrieve ───────────────────────

@pytest.mark.django_db
class TestRetrieve:
    URL = '/api/fishing/retrieve/'

    def test_retrieve_waiting(self, api_client, fishing_session_waiting):
        resp = api_client.post(self.URL, {'session_id': fishing_session_waiting.pk})

        assert resp.status_code == 200
        assert resp.data['status'] == 'retrieved'
        assert not FishingSession.objects.filter(pk=fishing_session_waiting.pk).exists()

    def test_retrieve_fighting_not_allowed(self, api_client, fishing_session_fighting):
        resp = api_client.post(self.URL, {'session_id': fishing_session_fighting.pk})
        assert resp.status_code == 400


# ─────────────────────────── Groundbait ─────────────────────

@pytest.mark.django_db
class TestGroundbait:
    URL = '/api/fishing/groundbait/'

    def test_groundbait_success(self, api_client, player, location, groundbait, game_time):
        player.current_location = location
        player.save(update_fields=['current_location'])

        ct = ContentType.objects.get_for_model(groundbait)
        InventoryItem.objects.create(
            player=player, content_type=ct, object_id=groundbait.pk, quantity=3,
        )

        resp = api_client.post(self.URL, {'groundbait_id': groundbait.pk})

        assert resp.status_code == 200
        assert 'duration_hours' in resp.data

        inv = InventoryItem.objects.get(player=player, content_type=ct, object_id=groundbait.pk)
        assert inv.quantity == 2

        assert GroundbaitSpot.objects.filter(player=player, location=location).exists()

    def test_groundbait_not_in_inventory(self, api_client, player, location, groundbait, game_time):
        player.current_location = location
        player.save(update_fields=['current_location'])

        resp = api_client.post(self.URL, {'groundbait_id': groundbait.pk})

        assert resp.status_code == 400


# ─────────────────────────── Game Time ──────────────────────

@pytest.mark.django_db
class TestGameTime:
    URL = '/api/fishing/time/'

    def test_game_time(self, api_client, game_time):
        resp = api_client.get(self.URL)

        assert resp.status_code == 200
        assert 'hour' in resp.data
        assert 'day' in resp.data
        assert 'time_of_day' in resp.data
        assert resp.data['hour'] == game_time.current_hour
        assert resp.data['day'] == game_time.current_day
