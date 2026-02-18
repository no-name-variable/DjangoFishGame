"""Views кафе — заказы рыбы на локациях."""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CafeOrder
from .serializers import CafeOrderSerializer, DeliverFishSerializer
from .use_cases.deliver_fish import DeliverFishUseCase
from .use_cases.get_orders import GetCafeOrdersUseCase


def _resolve(use_case_cls):
    """Резолвит use case из DI-контейнера."""
    from config.container import container
    return container.resolve(use_case_cls)


class CafeOrderListView(APIView):
    """Список активных заказов кафе для текущей базы."""

    def get(self, request):
        """Возвращает активные заказы с прогрессом игрока."""
        uc = _resolve(GetCafeOrdersUseCase)
        orders = uc.execute(request.user.player)
        serializer = CafeOrderSerializer(
            orders, many=True, context={'request': request},
        )
        return Response(serializer.data)


class CafeDeliverView(APIView):
    """Сдача рыбы в заказ кафе."""

    def post(self, request):
        """Сдать рыбу из садка в заказ."""
        serializer = DeliverFishSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        uc = _resolve(DeliverFishUseCase)
        try:
            result = uc.execute(
                request.user.player,
                order_id=data['order_id'],
                fish_ids=data['fish_ids'],
            )
        except CafeOrder.DoesNotExist:
            return Response(
                {'error': 'Заказ не найден.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            'status': 'ok',
            'order_id': result.order_id,
            'fish_delivered': result.fish_delivered,
            'money_earned': result.money_earned,
            'money_total': result.money_total,
            'quantity_delivered': result.quantity_delivered,
            'quantity_required': result.quantity_required,
        })
