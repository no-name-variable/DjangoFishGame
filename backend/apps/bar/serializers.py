"""Сериализаторы бара."""

from rest_framework import serializers

from .models import BarDrink


class BarDrinkSerializer(serializers.ModelSerializer):
    """Сериализатор напитка."""

    class Meta:
        model = BarDrink
        fields = ['id', 'name', 'description', 'price', 'satiety', 'image']


class OrderDrinkSerializer(serializers.Serializer):
    """Валидация заказа напитка."""

    drink_id = serializers.IntegerField()


class PrepareSnackSerializer(serializers.Serializer):
    """Валидация приготовления закуски."""

    fish_id = serializers.IntegerField()
    preparation = serializers.ChoiceField(choices=['dried', 'smoked', 'fried'])
