"""Тесты API рыбнадзора."""
import pytest

from apps.inspection.models import FishInspection


@pytest.mark.django_db
class TestInspectionHistory:
    def test_empty_history(self, api_client):
        resp = api_client.get('/api/inspections/')
        assert resp.status_code == 200
        assert resp.data['results'] == []

    def test_has_inspections(self, api_client, player, location):
        FishInspection.objects.create(
            player=player, location=location,
            violation_found=True,
            violation_type='creel_limit',
            fine_amount=500, karma_penalty=20,
            details='Превышение лимита садка',
        )
        FishInspection.objects.create(
            player=player, location=location,
            violation_found=False,
        )
        resp = api_client.get('/api/inspections/')
        assert resp.status_code == 200
        assert len(resp.data['results']) == 2

    def test_unauthorized(self, db):
        from rest_framework.test import APIClient
        client = APIClient()
        resp = client.get('/api/inspections/')
        assert resp.status_code == 401
