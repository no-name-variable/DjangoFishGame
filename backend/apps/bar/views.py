"""Views бара — напитки и закуски."""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import BarDrink
from .serializers import BarDrinkSerializer, OrderDrinkSerializer, PrepareSnackSerializer
from .use_cases.order_drink import OrderDrinkUseCase
from .use_cases.prepare_snack import PrepareSnackUseCase


def _resolve(use_case_cls):
    """Резолвит use case из DI-контейнера."""
    from config.container import container
    return container.resolve(use_case_cls)


class BarDrinkListView(APIView):
    """Список напитков в баре."""

    def get(self, request):
        drinks = BarDrink.objects.all()
        serializer = BarDrinkSerializer(drinks, many=True, context={'request': request})
        return Response(serializer.data)


class OrderDrinkView(APIView):
    """Заказать напиток."""

    def post(self, request):
        serializer = OrderDrinkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uc = _resolve(OrderDrinkUseCase)
        try:
            result = uc.execute(request.user.player, serializer.validated_data['drink_id'])
        except BarDrink.DoesNotExist:
            return Response({'error': 'Напиток не найден.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(result)


class PrepareSnackView(APIView):
    """Приготовить закуску из рыбы."""

    def post(self, request):
        serializer = PrepareSnackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        uc = _resolve(PrepareSnackUseCase)
        try:
            result = uc.execute(request.user.player, data['fish_id'], data['preparation'])
        except Exception as e:
            if 'DoesNotExist' in type(e).__name__:
                return Response({'error': 'Рыба не найдена в садке.'}, status=status.HTTP_404_NOT_FOUND)
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(result)
