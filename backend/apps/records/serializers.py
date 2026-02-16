"""Сериализаторы рекордов и достижений."""

from rest_framework import serializers

from .models import Achievement, FishRecord, PlayerAchievement


class FishRecordSerializer(serializers.ModelSerializer):
    species_name = serializers.CharField(source='species.name_ru', read_only=True)
    species_image = serializers.ImageField(source='species.image', read_only=True)
    player_nickname = serializers.CharField(source='player.nickname', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True, default=None)

    class Meta:
        model = FishRecord
        fields = [
            'id', 'species', 'species_name', 'species_image',
            'player', 'player_nickname',
            'weight', 'length', 'location', 'location_name',
            'caught_at', 'is_weekly_champion',
        ]


class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = ['id', 'name', 'description', 'category', 'icon', 'condition_type', 'condition_value']


class PlayerAchievementSerializer(serializers.ModelSerializer):
    achievement = AchievementSerializer(read_only=True)

    class Meta:
        model = PlayerAchievement
        fields = ['id', 'achievement', 'unlocked_at']
