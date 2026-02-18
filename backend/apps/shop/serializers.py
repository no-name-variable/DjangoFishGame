"""Сериализаторы магазина."""

from rest_framework import serializers


class BuySerializer(serializers.Serializer):
    item_type = serializers.ChoiceField(choices=[
        'rod', 'reel', 'line', 'hook', 'float', 'bait', 'groundbait', 'flavoring', 'food',
    ])
    item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, default=1)


class SellFishSerializer(serializers.Serializer):
    fish_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1)
