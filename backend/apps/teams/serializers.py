"""Сериализаторы команд."""

from rest_framework import serializers

from .models import Team, TeamMembership


class TeamMemberSerializer(serializers.ModelSerializer):
    nickname = serializers.CharField(source='player.nickname', read_only=True)
    rank = serializers.IntegerField(source='player.rank', read_only=True)

    class Meta:
        model = TeamMembership
        fields = ['id', 'nickname', 'rank', 'role', 'joined_at']


class TeamSerializer(serializers.ModelSerializer):
    leader_nickname = serializers.CharField(source='leader.nickname', read_only=True)
    member_count = serializers.ReadOnlyField()

    class Meta:
        model = Team
        fields = ['id', 'name', 'description', 'leader', 'leader_nickname', 'member_count', 'max_members', 'created_at']
        read_only_fields = ['leader', 'created_at']


class TeamDetailSerializer(TeamSerializer):
    members = TeamMemberSerializer(source='memberships', many=True, read_only=True)

    class Meta(TeamSerializer.Meta):
        fields = TeamSerializer.Meta.fields + ['members']


class CreateTeamSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, default='')
