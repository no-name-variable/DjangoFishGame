"""Views магазина."""

from decimal import Decimal

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.tackle.models import (
    Bait, FloatTackle, Food, Groundbait, Hook, Line, Reel, RodType, Flavoring,
)
from apps.tackle.serializers import (
    BaitSerializer, FloatTackleSerializer, FoodSerializer, GroundbaitSerializer,
    HookSerializer, LineSerializer, ReelSerializer, RodTypeSerializer,
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


class RepairRodView(APIView):
    """Ремонт удилища. Стоимость: 5 монет за каждую единицу прочности."""

    # Стоимость ремонта за единицу прочности
    REPAIR_COST_PER_POINT = Decimal('5')

    def post(self, request):
        from apps.inventory.models import PlayerRod

        rod_id = request.data.get('rod_id')
        if not rod_id:
            return Response({'error': 'Укажите rod_id.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            rod = PlayerRod.objects.select_related('rod_type').get(
                pk=rod_id, player=request.user.player,
            )
        except PlayerRod.DoesNotExist:
            return Response({'error': 'Удочка не найдена.'}, status=status.HTTP_404_NOT_FOUND)

        durability_max = rod.rod_type.durability_max
        damage = durability_max - rod.durability_current

        if damage <= 0:
            return Response({'error': 'Удочка не нуждается в ремонте.'},
                            status=status.HTTP_400_BAD_REQUEST)

        cost = self.REPAIR_COST_PER_POINT * damage
        player = request.user.player

        if player.money < cost:
            return Response(
                {'error': f'Недостаточно денег. Нужно {cost:.0f}, есть {player.money:.0f}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        player.money -= cost
        player.save(update_fields=['money'])

        rod.durability_current = durability_max
        rod.save(update_fields=['durability_current'])

        return Response({
            'status': 'ok',
            'rod_id': rod.pk,
            'durability': rod.durability_current,
            'cost': float(cost),
            'money_left': float(player.money),
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
