"""Views магазина."""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.tackle.models import (
    Bait, FloatTackle, Food, Groundbait, Hook, Line, Lure, Reel, RodType, Flavoring,
)
from apps.tackle.serializers import (
    BaitSerializer, FloatTackleSerializer, FoodSerializer, GroundbaitSerializer,
    HookSerializer, LineSerializer, LureSerializer, ReelSerializer, RodTypeSerializer,
    FlavoringSerializer,
)

from .serializers import BuySerializer, SellFishSerializer
from .use_cases.buy_item import BuyItemUseCase
from .use_cases.sell_fish import SellFishUseCase

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


def _resolve(use_case_cls):
    """Резолвит use case из DI-контейнера."""
    from config.container import container
    return container.resolve(use_case_cls)


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

        uc = _resolve(BuyItemUseCase)
        try:
            result = uc.execute(
                request.user.player,
                item_type=data['item_type'],
                item_id=data['item_id'],
                quantity=data['quantity'],
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except PermissionError as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            if 'не найден' in str(e):
                return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
            raise

        return Response({
            'status': 'ok',
            'item': result.item_name,
            'quantity': result.quantity,
            'money_left': result.money_left,
        })


class SellFishView(APIView):
    """Продажа рыбы из садка."""

    def post(self, request):
        serializer = SellFishSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uc = _resolve(SellFishUseCase)
        try:
            result = uc.execute(request.user.player, serializer.validated_data['fish_ids'])
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'status': 'ok',
            'fish_sold': result.fish_sold,
            'money_earned': result.money_earned,
            'money_total': result.money_total,
        })
