"""Сериализаторы барахолки."""

from rest_framework import serializers

from .models import MarketListing


class MarketListingSerializer(serializers.ModelSerializer):
    """Сериализатор лота для отображения."""

    seller_nickname = serializers.CharField(source='seller.nickname', read_only=True)
    item_name = serializers.SerializerMethodField()
    item_type = serializers.SerializerMethodField()
    item_image = serializers.SerializerMethodField()

    class Meta:
        model = MarketListing
        fields = [
            'id', 'seller_nickname', 'item_name', 'item_type', 'item_image',
            'object_id', 'quantity', 'price', 'created_at', 'is_active',
        ]

    def get_item_name(self, obj):
        """Название предмета."""
        return str(obj.item)

    def get_item_type(self, obj):
        """Тип предмета (название модели)."""
        return obj.content_type.model

    def get_item_image(self, obj):
        """URL изображения товара."""
        item = obj.item
        if item and hasattr(item, 'image') and item.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(item.image.url)
            return item.image.url
        return None


class CreateListingSerializer(serializers.Serializer):
    """Сериализатор для создания лота."""

    item_type = serializers.CharField(help_text='Название модели: bait, lure, groundbait и т.д.')
    item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)
