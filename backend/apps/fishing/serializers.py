"""Сериализаторы рыбалки."""

from rest_framework import serializers

from .models import FightState, FishingSession


class CastSerializer(serializers.Serializer):
    rod_id = serializers.IntegerField()
    point_x = serializers.FloatField()
    point_y = serializers.FloatField()


class SessionActionSerializer(serializers.Serializer):
    """Приём session_id для action-эндпоинтов."""
    session_id = serializers.IntegerField()


class FishingSessionSerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source='location.name', read_only=True)
    rod_name = serializers.CharField(source='rod.display_name', read_only=True)
    rod_id = serializers.IntegerField(source='rod.pk', read_only=True)
    hooked_species_name = serializers.CharField(source='hooked_species.name_ru', read_only=True, default=None)

    class Meta:
        model = FishingSession
        fields = [
            'id', 'state', 'slot', 'location', 'location_name',
            'rod_id', 'rod_name',
            'cast_x', 'cast_y', 'cast_time', 'bite_time',
            'hooked_species_name', 'hooked_weight', 'hooked_length',
        ]


class FightStateSerializer(serializers.ModelSerializer):
    session_id = serializers.IntegerField(source='session.pk', read_only=True)

    class Meta:
        model = FightState
        fields = ['session_id', 'line_tension', 'distance', 'rod_durability', 'fish_strength']


class FishingMultiStatusSerializer(serializers.Serializer):
    """Возвращает все сессии игрока + все fights."""
    sessions = FishingSessionSerializer(many=True)
    fights = serializers.SerializerMethodField()

    def get_fights(self, obj):
        fights = obj.get('fights', {})
        return {
            str(sid): FightStateSerializer(fight).data
            for sid, fight in fights.items()
        }
