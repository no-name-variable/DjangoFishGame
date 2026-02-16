"""Сериализаторы инвентаря."""

from rest_framework import serializers

from .models import CaughtFish, InventoryItem, PlayerRod


class InventoryItemSerializer(serializers.ModelSerializer):
    item_type = serializers.CharField(source='content_type.model', read_only=True)
    item_name = serializers.SerializerMethodField()
    item_image = serializers.SerializerMethodField()

    class Meta:
        model = InventoryItem
        fields = ['id', 'item_type', 'object_id', 'item_name', 'item_image', 'quantity']

    def get_item_name(self, obj):
        if obj.item:
            return str(obj.item)
        return '???'

    def get_item_image(self, obj):
        """URL изображения предмета."""
        item = obj.item
        if item and hasattr(item, 'image') and item.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(item.image.url)
            return item.image.url
        return None


class PlayerRodSerializer(serializers.ModelSerializer):
    rod_type_name = serializers.CharField(source='rod_type.name', read_only=True)
    display_name = serializers.ReadOnlyField()
    rod_class = serializers.ReadOnlyField()
    reel_name = serializers.CharField(source='reel.name', read_only=True, default=None)
    line_name = serializers.CharField(source='line.name', read_only=True, default=None)
    hook_name = serializers.CharField(source='hook.name', read_only=True, default=None)
    float_name = serializers.CharField(source='float_tackle.name', read_only=True, default=None)
    lure_name = serializers.CharField(source='lure.name', read_only=True, default=None)
    bait_name = serializers.CharField(source='bait.name', read_only=True, default=None)
    is_ready = serializers.ReadOnlyField()

    class Meta:
        model = PlayerRod
        fields = [
            'id', 'rod_type', 'rod_type_name', 'display_name', 'custom_name', 'rod_class',
            'reel', 'reel_name', 'line', 'line_name',
            'hook', 'hook_name', 'float_tackle', 'float_name',
            'lure', 'lure_name', 'bait', 'bait_name',
            'bait_remaining', 'durability_current', 'is_assembled', 'is_ready',
            'depth_setting', 'retrieve_speed',
        ]


class RenameRodSerializer(serializers.Serializer):
    custom_name = serializers.CharField(max_length=64, allow_blank=True)


class AssembleRodSerializer(serializers.Serializer):
    rod_type_id = serializers.IntegerField()
    reel_id = serializers.IntegerField(required=False)
    line_id = serializers.IntegerField(required=False)
    hook_id = serializers.IntegerField(required=False)
    float_tackle_id = serializers.IntegerField(required=False)
    lure_id = serializers.IntegerField(required=False)
    bait_id = serializers.IntegerField(required=False)
    depth_setting = serializers.FloatField(required=False, default=1.5)
    retrieve_speed = serializers.IntegerField(required=False, default=5)


class CaughtFishSerializer(serializers.ModelSerializer):
    species_name = serializers.CharField(source='species.name_ru', read_only=True)
    species_rarity = serializers.CharField(source='species.rarity', read_only=True)
    species_image = serializers.ImageField(source='species.image', read_only=True)
    sell_price = serializers.ReadOnlyField()
    experience_reward = serializers.ReadOnlyField()

    class Meta:
        model = CaughtFish
        fields = [
            'id', 'species', 'species_name', 'species_rarity', 'species_image',
            'weight', 'length', 'location', 'caught_at',
            'is_sold', 'is_released', 'is_record', 'sell_price', 'experience_reward',
        ]
