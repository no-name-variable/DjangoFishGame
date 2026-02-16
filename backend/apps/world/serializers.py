"""Сериализаторы мира."""

from rest_framework import serializers

from .models import Base, Location, LocationFish


class LocationFishSerializer(serializers.ModelSerializer):
    fish_name = serializers.CharField(source='fish.name_ru', read_only=True)
    fish_rarity = serializers.CharField(source='fish.rarity', read_only=True)

    class Meta:
        model = LocationFish
        fields = ['fish', 'fish_name', 'fish_rarity', 'spawn_weight', 'depth_preference']


class LocationSerializer(serializers.ModelSerializer):
    base_name = serializers.CharField(source='base.name', read_only=True)

    class Meta:
        model = Location
        fields = [
            'id', 'base', 'base_name', 'name', 'description',
            'image_morning', 'image_day', 'image_evening', 'image_night',
            'depth_map', 'min_rank', 'requires_ticket',
        ]


class LocationDetailSerializer(LocationSerializer):
    fish_species = LocationFishSerializer(source='location_fish', many=True, read_only=True)

    class Meta(LocationSerializer.Meta):
        fields = LocationSerializer.Meta.fields + ['fish_species']


class BaseSerializer(serializers.ModelSerializer):
    locations_count = serializers.IntegerField(source='locations.count', read_only=True)

    class Meta:
        model = Base
        fields = [
            'id', 'name', 'description', 'image', 'world_map_x', 'world_map_y',
            'min_rank', 'min_karma', 'travel_cost', 'requires_vehicle', 'locations_count',
        ]
