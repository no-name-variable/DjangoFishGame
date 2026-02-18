"""Сериализаторы кафе."""

from rest_framework import serializers

from .models import CafeOrder


class CafeOrderSerializer(serializers.ModelSerializer):
    """Сериализатор заказа кафе с прогрессом игрока."""

    species_name = serializers.CharField(source='species.name_ru', read_only=True)
    species_image = serializers.SerializerMethodField()
    location_name = serializers.CharField(source='location.name', read_only=True)
    quantity_delivered = serializers.IntegerField(read_only=True, default=0)
    reward_total = serializers.SerializerMethodField()

    class Meta:
        model = CafeOrder
        fields = [
            'id', 'location', 'location_name', 'species', 'species_name',
            'species_image', 'quantity_required', 'min_weight_grams',
            'reward_per_fish', 'reward_total', 'is_active', 'expires_at',
            'quantity_delivered',
        ]

    def get_reward_total(self, obj):
        """Общая награда за весь заказ."""
        return str((obj.reward_per_fish * obj.quantity_required).quantize(
            obj.reward_per_fish,
        ))

    def get_species_image(self, obj):
        """URL изображения рыбы."""
        if obj.species.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.species.image.url)
            return obj.species.image.url
        return None


class DeliverFishSerializer(serializers.Serializer):
    """Сериализатор для сдачи рыбы в заказ."""

    order_id = serializers.IntegerField()
    fish_ids = serializers.ListField(
        child=serializers.IntegerField(), min_length=1,
    )
