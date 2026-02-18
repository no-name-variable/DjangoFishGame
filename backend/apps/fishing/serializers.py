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



class ChangeBaitSerializer(serializers.Serializer):
    """Смена наживки на удочке во время рыбалки."""
    session_id = serializers.IntegerField()
    bait_id = serializers.IntegerField()


class FishingSessionSerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source='location.name', read_only=True)
    rod_name = serializers.CharField(source='rod.display_name', read_only=True)
    rod_id = serializers.IntegerField(source='rod.pk', read_only=True)
    rod_class = serializers.CharField(source='rod.rod_class', read_only=True)
    hooked_species_name = serializers.CharField(source='hooked_species.name_ru', read_only=True, default=None)
    hooked_rarity = serializers.CharField(source='hooked_species.rarity', read_only=True, default=None)
    hooked_species_image = serializers.SerializerMethodField()

    def get_hooked_species_image(self, obj):
        if obj.hooked_species and obj.hooked_species.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.hooked_species.image.url)
            return obj.hooked_species.image.url
        return None

    class Meta:
        model = FishingSession
        fields = [
            'id', 'state', 'slot', 'location', 'location_name',
            'rod_id', 'rod_name', 'rod_class',
            'cast_x', 'cast_y', 'cast_time', 'bite_time',
            'hooked_species_name', 'hooked_weight', 'hooked_length',
            'hooked_rarity', 'hooked_species_image',
        ]


class FightStateSerializer(serializers.ModelSerializer):
    session_id = serializers.IntegerField(source='session.pk', read_only=True)

    class Meta:
        model = FightState
        fields = ['session_id', 'line_tension', 'distance', 'rod_durability', 'fish_strength']


class FishingMultiStatusSerializer(serializers.Serializer):
    """Возвращает все сессии игрока + все fights + игровое время."""
    sessions = FishingSessionSerializer(many=True)
    fights = serializers.SerializerMethodField()
    game_time = serializers.SerializerMethodField()

    def get_fights(self, obj):
        fights = obj.get('fights', {})
        return {
            str(sid): FightStateSerializer(fight).data
            for sid, fight in fights.items()
        }

    def get_game_time(self, obj):
        gt = obj.get('game_time')
        if gt:
            return {
                'hour': gt.current_hour,
                'day': gt.current_day,
                'time_of_day': gt.time_of_day,
            }
        return None
