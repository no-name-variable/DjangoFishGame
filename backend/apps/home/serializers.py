"""Сериализаторы дома рыбака."""

from rest_framework import serializers

from .models import (
    ApparatusPart,
    BrewingSession,
    MoonshineIngredient,
    MoonshineRecipe,
    PlayerApparatusPart,
    PlayerIngredient,
    PlayerMoonshineBuff,
)


class IngredientShopSerializer(serializers.ModelSerializer):
    """Сериализатор ингредиентов для магазина."""

    class Meta:
        model = MoonshineIngredient
        fields = ['id', 'name', 'slug', 'price', 'description']


class ApparatusPartSerializer(serializers.ModelSerializer):
    collected = serializers.SerializerMethodField()

    class Meta:
        model = ApparatusPart
        fields = ['id', 'name', 'slug', 'description', 'order', 'collected']

    def get_collected(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        return PlayerApparatusPart.objects.filter(
            player=request.user.player, part=obj,
        ).exists()


class IngredientSerializer(serializers.ModelSerializer):
    player_quantity = serializers.SerializerMethodField()

    class Meta:
        model = MoonshineIngredient
        fields = ['id', 'name', 'slug', 'price', 'description', 'player_quantity']

    def get_player_quantity(self, obj):
        request = self.context.get('request')
        if not request:
            return 0
        pi = PlayerIngredient.objects.filter(
            player=request.user.player, ingredient=obj,
        ).first()
        return pi.quantity if pi else 0


class RecipeSerializer(serializers.ModelSerializer):
    can_brew = serializers.SerializerMethodField()

    class Meta:
        model = MoonshineRecipe
        fields = [
            'id', 'name', 'description', 'effect_type', 'effect_value',
            'duration_hours', 'crafting_time_hours', 'required_ingredients', 'can_brew',
        ]

    def get_can_brew(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        player = request.user.player
        from django.contrib.contenttypes.models import ContentType
        from apps.inventory.models import InventoryItem
        from .services import MoonshineService
        svc = MoonshineService()
        if not svc.is_apparatus_complete(player):
            return False
        ct = ContentType.objects.get_for_model(MoonshineIngredient)
        for slug, qty in obj.required_ingredients.items():
            ingredient = MoonshineIngredient.objects.filter(slug=slug).first()
            if not ingredient:
                return False
            inv = InventoryItem.objects.filter(
                player=player, content_type=ct, object_id=ingredient.pk,
            ).first()
            if not inv or inv.quantity < qty:
                return False
        return True


class BrewingSessionSerializer(serializers.ModelSerializer):
    recipe_name = serializers.CharField(source='recipe.name', read_only=True)
    effect_type = serializers.CharField(source='recipe.effect_type', read_only=True)

    class Meta:
        model = BrewingSession
        fields = [
            'id', 'recipe_name', 'effect_type', 'status',
            'started_at_hour', 'started_at_day',
            'ready_at_hour', 'ready_at_day',
        ]


class PlayerBuffSerializer(serializers.ModelSerializer):
    recipe_name = serializers.CharField(source='recipe.name', read_only=True)
    effect_type = serializers.CharField(source='recipe.effect_type', read_only=True)
    effect_value = serializers.FloatField(source='recipe.effect_value', read_only=True)
    is_active = serializers.SerializerMethodField()

    class Meta:
        model = PlayerMoonshineBuff
        fields = [
            'id', 'recipe_name', 'effect_type', 'effect_value',
            'activated_at_day', 'activated_at_hour',
            'expires_at_day', 'expires_at_hour', 'is_active',
        ]

    def get_is_active(self, obj):
        return obj.is_active()


class BuyIngredientSerializer(serializers.Serializer):
    ingredient_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, default=1)


class StartBrewingSerializer(serializers.Serializer):
    recipe_id = serializers.IntegerField()


class CollectBrewingSerializer(serializers.Serializer):
    session_id = serializers.IntegerField()
