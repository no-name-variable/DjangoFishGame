"""Views магазина."""

from django.contrib.contenttypes.models import ContentType
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.inventory.models import CaughtFish, InventoryItem
from apps.tackle.models import Bait, FloatTackle, Food, Groundbait, Hook, Line, Lure, Reel, RodType, Flavoring
from apps.tackle.serializers import (
    BaitSerializer, FloatTackleSerializer, FoodSerializer, GroundbaitSerializer,
    HookSerializer, LineSerializer, LureSerializer, ReelSerializer, RodTypeSerializer,
    FlavoringSerializer,
)

from .serializers import BuySerializer, SellFishSerializer

# Маппинг категорий на модели и сериализаторы
SHOP_CATEGORIES = {
    'rods': (RodType, RodTypeSerializer),
    'reels': (Reel, ReelSerializer),
    'lines': (Line, LineSerializer),
    'hooks': (Hook, HookSerializer),
    'floats': (FloatTackle, FloatTackleSerializer),
    'lures': (Lure, LureSerializer),
    'baits': (Bait, BaitSerializer),
    'groundbaits': (Groundbait, GroundbaitSerializer),
    'flavorings': (Flavoring, FlavoringSerializer),
    'food': (Food, FoodSerializer),
}

# Маппинг item_type на модели
ITEM_TYPE_MAP = {
    'rod': RodType, 'reel': Reel, 'line': Line, 'hook': Hook,
    'float': FloatTackle, 'lure': Lure, 'bait': Bait,
    'groundbait': Groundbait, 'flavoring': Flavoring, 'food': Food,
}


class ShopCategoryView(APIView):
    """Список товаров по категории."""

    def get(self, request, category):
        if category not in SHOP_CATEGORIES:
            return Response(
                {'error': f'Неизвестная категория: {category}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        model_class, serializer_class = SHOP_CATEGORIES[category]
        items = model_class.objects.all()
        return Response(serializer_class(items, many=True, context={'request': request}).data)


class ShopBuyView(APIView):
    """Покупка товара."""

    def post(self, request):
        serializer = BuySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        player = request.user.player
        model_class = ITEM_TYPE_MAP.get(data['item_type'])
        if not model_class:
            return Response({'error': 'Неизвестный тип.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            item = model_class.objects.get(pk=data['item_id'])
        except model_class.DoesNotExist:
            return Response({'error': 'Товар не найден.'}, status=status.HTTP_404_NOT_FOUND)

        total_cost = item.price * data['quantity']
        if player.money < total_cost:
            return Response({'error': 'Недостаточно денег.'}, status=status.HTTP_400_BAD_REQUEST)

        # Проверка разряда для удилищ
        if hasattr(item, 'min_rank') and player.rank < item.min_rank:
            return Response(
                {'error': f'Требуется разряд {item.min_rank}.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        player.money -= total_cost
        player.save(update_fields=['money'])

        ct = ContentType.objects.get_for_model(item)
        inv_item, created = InventoryItem.objects.get_or_create(
            player=player, content_type=ct, object_id=item.pk,
            defaults={'quantity': data['quantity']},
        )
        if not created:
            inv_item.quantity += data['quantity']
            inv_item.save(update_fields=['quantity'])

        return Response({
            'status': 'ok',
            'item': str(item),
            'quantity': data['quantity'],
            'money_left': float(player.money),
        })


class SellFishView(APIView):
    """Продажа рыбы из садка."""

    def post(self, request):
        serializer = SellFishSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        player = request.user.player
        fish_qs = CaughtFish.objects.filter(
            player=player, pk__in=serializer.validated_data['fish_ids'],
            is_sold=False, is_released=False,
        )

        if not fish_qs.exists():
            return Response({'error': 'Рыба не найдена в садке.'}, status=status.HTTP_400_BAD_REQUEST)

        total_money = sum(f.sell_price for f in fish_qs)
        count = fish_qs.count()

        fish_qs.update(is_sold=True)
        player.money += total_money
        player.save(update_fields=['money'])

        return Response({
            'status': 'ok',
            'fish_sold': count,
            'money_earned': total_money,
            'money_total': float(player.money),
        })
