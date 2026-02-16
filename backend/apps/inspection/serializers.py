"""Сериализаторы рыбнадзора."""

from rest_framework import serializers

from .models import FishInspection


class FishInspectionSerializer(serializers.ModelSerializer):
    """Сериализатор проверки рыбнадзора."""

    location_name = serializers.CharField(source='location.name', read_only=True)

    class Meta:
        model = FishInspection
        fields = [
            'id', 'player', 'location', 'location_name',
            'checked_at', 'violation_found', 'violation_type',
            'fine_amount', 'karma_penalty', 'details',
        ]
