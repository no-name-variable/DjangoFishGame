"""Сериализаторы снастей."""

from rest_framework import serializers

from .models import Bait, FishSpecies, Flavoring, FloatTackle, Food, Groundbait, Hook, Line, Lure, Reel, RodType


class FishSpeciesSerializer(serializers.ModelSerializer):
    class Meta:
        model = FishSpecies
        fields = [
            'id', 'name_ru', 'name_latin', 'description', 'image',
            'weight_min', 'weight_max', 'length_min', 'length_max',
            'rarity', 'sell_price_per_kg', 'experience_per_kg',
        ]


class RodTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RodType
        fields = '__all__'


class ReelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reel
        fields = '__all__'


class LineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Line
        fields = '__all__'


class HookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hook
        fields = '__all__'


class FloatTackleSerializer(serializers.ModelSerializer):
    class Meta:
        model = FloatTackle
        fields = '__all__'


class LureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lure
        fields = '__all__'


class BaitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bait
        fields = '__all__'


class GroundbaitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Groundbait
        fields = '__all__'


class FlavoringSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flavoring
        fields = '__all__'


class FoodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Food
        fields = '__all__'
