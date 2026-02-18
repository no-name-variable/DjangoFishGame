"""Сериализаторы квестов."""

from rest_framework import serializers

from .models import PlayerQuest, Quest


class QuestSerializer(serializers.ModelSerializer):
    target_species_name = serializers.CharField(source='target_species.name_ru', read_only=True, default=None)
    target_location_name = serializers.CharField(source='target_location.name', read_only=True, default=None)
    reward_apparatus_part_name = serializers.CharField(
        source='reward_apparatus_part.name', read_only=True, default=None,
    )

    class Meta:
        model = Quest
        fields = [
            'id', 'name', 'description', 'quest_type',
            'target_species', 'target_species_name',
            'target_count', 'target_weight',
            'target_location', 'target_location_name',
            'reward_money', 'reward_experience', 'reward_karma',
            'reward_apparatus_part_name',
            'min_rank', 'order',
        ]


class PlayerQuestSerializer(serializers.ModelSerializer):
    quest = QuestSerializer(read_only=True)

    class Meta:
        model = PlayerQuest
        fields = ['id', 'quest', 'progress', 'progress_weight', 'status', 'started_at', 'completed_at']


class AcceptQuestSerializer(serializers.Serializer):
    quest_id = serializers.IntegerField()
