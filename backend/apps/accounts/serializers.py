"""Сериализаторы аккаунтов."""

from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Player


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=6)
    nickname = serializers.CharField(max_length=50)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists(): # TODO: Хуйня переделывай
            raise serializers.ValidationError('Пользователь с таким именем уже существует.')
        return value

    def validate_nickname(self, value):
        if Player.objects.filter(nickname=value).exists(): # TODO: Хуйня переделывай
            raise serializers.ValidationError('Никнейм уже занят.')
        return value

    def create(self, validated_data):
        from apps.world.models import Base
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
        )
        starting_base = Base.objects.order_by('min_rank', 'pk').first()
        player = Player.objects.create(
            user=user,
            nickname=validated_data['nickname'],
            current_base=starting_base,
        )
        return player


class PlayerSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    rank_title = serializers.ReadOnlyField()
    experience_to_next_rank = serializers.ReadOnlyField()
    current_base_name = serializers.CharField(source='current_base.name', read_only=True, default=None)
    current_location_name = serializers.CharField(source='current_location.name', read_only=True, default=None)

    class Meta:
        model = Player
        fields = [
            'id', 'username', 'nickname', 'rank', 'rank_title', 'experience',
            'experience_to_next_rank', 'karma', 'money', 'gold', 'hunger',
            'current_base', 'current_base_name', 'current_location', 'current_location_name',
        ]
        read_only_fields = ['rank', 'experience', 'karma', 'money', 'gold', 'hunger']
