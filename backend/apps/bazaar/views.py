"""Views барахолки (торговля между игроками)."""

from django.contrib.contenttypes.models import ContentType
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import MarketListing
from .serializers import CreateListingSerializer, MarketListingSerializer
from .use_cases.buy_listing import BuyListingUseCase
from .use_cases.cancel_listing import CancelListingUseCase
from .use_cases.create_listing import CreateListingUseCase


def _resolve(use_case_cls):
    """Резолвит use case из DI-контейнера."""
    from config.container import container
    return container.resolve(use_case_cls)


class MarketListView(ListAPIView):
    """Список всех активных лотов на барахолке."""

    serializer_class = MarketListingSerializer

    def get_queryset(self):
        """Возвращает активные лоты с возможностью фильтрации по типу предмета."""
        qs = MarketListing.objects.filter(is_active=True).select_related(
            'seller', 'content_type',
        )
        item_type = self.request.query_params.get('item_type')
        if item_type:
            try:
                ct = ContentType.objects.get(app_label='tackle', model=item_type)
                qs = qs.filter(content_type=ct)
            except ContentType.DoesNotExist:
                return MarketListing.objects.none()
        return qs


class MyListingsView(ListAPIView):
    """Список лотов текущего игрока."""

    serializer_class = MarketListingSerializer

    def get_queryset(self):
        """Возвращает все лоты текущего игрока."""
        return MarketListing.objects.filter(
            seller=self.request.user.player,
        ).select_related('seller', 'content_type')


class CreateListingView(APIView):
    """Создание нового лота на барахолке."""

    def post(self, request):
        """Выставить предмет из инвентаря на продажу."""
        serializer = CreateListingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        uc = _resolve(CreateListingUseCase)
        try:
            listing = uc.execute(
                request.user.player,
                item_type=data['item_type'],
                item_id=data['item_id'],
                quantity=data['quantity'],
                price=data['price'],
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            if 'не найден' in str(e):
                return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
            raise

        return Response(MarketListingSerializer(listing).data, status=status.HTTP_201_CREATED)


class BuyListingView(APIView):
    """Покупка лота на барахолке."""

    def post(self, request, pk):
        """Купить лот по его ID."""
        uc = _resolve(BuyListingUseCase)
        try:
            result = uc.execute(request.user.player, pk)
        except MarketListing.DoesNotExist:
            return Response({'error': 'Лот не найден.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'status': 'ok',
            'listing_id': result.listing_id,
            'item': result.item_name,
            'quantity': result.quantity,
            'price': result.price,
            'money_left': result.money_left,
        })


class CancelListingView(APIView):
    """Отмена лота на барахолке."""

    def post(self, request, pk):
        """Отменить свой лот и вернуть предмет в инвентарь."""
        uc = _resolve(CancelListingUseCase)
        try:
            result = uc.execute(request.user.player, pk)
        except MarketListing.DoesNotExist:
            return Response({'error': 'Лот не найден.'}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'status': 'ok',
            'listing_id': result.listing_id,
            'item': result.item_name,
            'quantity': result.quantity,
            'returned': True,
        })
