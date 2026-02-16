"""Сериализаторы зелий."""

from rest_framework import serializers

from .models import MarineStar, PlayerPotion, PlayerStar, Potion


class MarineStarSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarineStar
        fields = ['id', 'color', 'name', 'description']


class PlayerStarSerializer(serializers.ModelSerializer):
    color = serializers.CharField(source='star.color', read_only=True)
    name = serializers.CharField(source='star.name', read_only=True)

    class Meta:
        model = PlayerStar
        fields = ['color', 'name', 'quantity']


class PotionSerializer(serializers.ModelSerializer):
    can_craft = serializers.SerializerMethodField()

    class Meta:
        model = Potion
        fields = [
            'id', 'name', 'description', 'effect_type', 'effect_value',
            'karma_cost', 'duration_hours', 'required_stars', 'is_one_time', 'can_craft',
        ]

    def get_can_craft(self, obj):
        """Проверяет, может ли текущий игрок скрафтить зелье."""
        request = self.context.get('request')
        if not request:
            return False
        player = request.user.player
        if player.karma < obj.karma_cost:
            return False
        for color, qty in obj.required_stars.items():
            ps = PlayerStar.objects.filter(player=player, star__color=color).first()
            if not ps or ps.quantity < qty:
                return False
        return True


class PlayerPotionSerializer(serializers.ModelSerializer):
    potion_name = serializers.CharField(source='potion.name', read_only=True)
    effect_type = serializers.CharField(source='potion.effect_type', read_only=True)
    effect_value = serializers.FloatField(source='potion.effect_value', read_only=True)
    is_active = serializers.SerializerMethodField()

    class Meta:
        model = PlayerPotion
        fields = [
            'id', 'potion_name', 'effect_type', 'effect_value',
            'activated_at_day', 'activated_at_hour',
            'expires_at_day', 'expires_at_hour', 'is_active',
        ]

    def get_is_active(self, obj):
        return obj.is_active()


class CraftPotionSerializer(serializers.Serializer):
    potion_id = serializers.IntegerField()
