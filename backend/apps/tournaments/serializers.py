"""Сериализаторы турниров."""

from rest_framework import serializers

from .models import Tournament, TournamentEntry


class TournamentEntrySerializer(serializers.ModelSerializer):
    player_nickname = serializers.CharField(source='player.nickname', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True, default=None)

    class Meta:
        model = TournamentEntry
        fields = [
            'id', 'tournament', 'player', 'player_nickname',
            'team', 'team_name',
            'score', 'fish_count', 'rank_position', 'joined_at',
        ]


class TournamentSerializer(serializers.ModelSerializer):
    target_species_name = serializers.CharField(
        source='target_species.name_ru', read_only=True, default=None,
    )
    target_location_name = serializers.CharField(
        source='target_location.name', read_only=True, default=None,
    )
    participants_count = serializers.IntegerField(source='entries.count', read_only=True)

    class Meta:
        model = Tournament
        fields = [
            'id', 'name', 'description', 'tournament_type', 'scoring',
            'target_species', 'target_species_name',
            'target_location', 'target_location_name',
            'start_time', 'end_time',
            'entry_fee', 'prize_money', 'prize_experience', 'prize_karma',
            'min_rank', 'max_participants', 'participants_count',
            'is_active', 'is_finished',
        ]


class JoinTournamentSerializer(serializers.Serializer):
    tournament_id = serializers.IntegerField()
