"""Views барахолки (торговля между игроками)."""

from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.inventory.models import InventoryItem

from .models import MarketListing
from .serializers import CreateListingSerializer, MarketListingSerializer

# Допустимые типы предметов для продажи на барахолке
ALLOWED_ITEM_TYPES = {
    'bait', 'lure', 'groundbait', 'flavoring', 'food',
    'hook', 'floattackle', 'line', 'reel', 'rodtype',
}


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

        item_type = data['item_type']
        if item_type not in ALLOWED_ITEM_TYPES:
            return Response(
                {'error': f'Недопустимый тип предмета: {item_type}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            ct = ContentType.objects.get(app_label='tackle', model=item_type)
        except ContentType.DoesNotExist:
            return Response(
                {'error': f'Тип предмета не найден: {item_type}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        player = request.user.player

        # Проверяем наличие предмета в инвентаре
        try:
            inv_item = InventoryItem.objects.get(
                player=player, content_type=ct, object_id=data['item_id'],
            )
        except InventoryItem.DoesNotExist:
            return Response(
                {'error': 'Предмет не найден в инвентаре.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if inv_item.quantity < data['quantity']:
            return Response(
                {'error': f'Недостаточно предметов. В наличии: {inv_item.quantity}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Списываем из инвентаря
        inv_item.quantity -= data['quantity']
        if inv_item.quantity <= 0:
            inv_item.delete()
        else:
            inv_item.save(update_fields=['quantity'])

        # Создаём лот
        listing = MarketListing.objects.create(
            seller=player,
            content_type=ct,
            object_id=data['item_id'],
            quantity=data['quantity'],
            price=data['price'],
        )

        return Response(
            MarketListingSerializer(listing).data,
            status=status.HTTP_201_CREATED,
        )


class BuyListingView(APIView):
    """Покупка лота на барахолке."""

    def post(self, request, pk):
        """Купить лот по его ID."""
        try:
            listing = MarketListing.objects.select_related('seller').get(pk=pk)
        except MarketListing.DoesNotExist:
            return Response(
                {'error': 'Лот не найден.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not listing.is_active:
            return Response(
                {'error': 'Лот уже неактивен.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        buyer = request.user.player

        if buyer.pk == listing.seller_id:
            return Response(
                {'error': 'Нельзя купить собственный лот.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if buyer.money < listing.price:
            return Response(
                {'error': 'Недостаточно денег.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Списываем деньги у покупателя, начисляем продавцу
            buyer.money -= listing.price
            buyer.save(update_fields=['money'])

            seller = listing.seller
            seller.money += listing.price
            seller.save(update_fields=['money'])

            # Передаём предмет покупателю
            inv_item, created = InventoryItem.objects.get_or_create(
                player=buyer,
                content_type=listing.content_type,
                object_id=listing.object_id,
                defaults={'quantity': listing.quantity},
            )
            if not created:
                inv_item.quantity += listing.quantity
                inv_item.save(update_fields=['quantity'])

            # Помечаем лот как проданный
            listing.is_active = False
            listing.buyer = buyer
            listing.sold_at = timezone.now()
            listing.save(update_fields=['is_active', 'buyer', 'sold_at'])

        return Response({
            'status': 'ok',
            'listing_id': listing.pk,
            'item': str(listing.item),
            'quantity': listing.quantity,
            'price': float(listing.price),
            'money_left': float(buyer.money),
        })


class CancelListingView(APIView):
    """Отмена лота на барахолке."""

    def post(self, request, pk):
        """Отменить свой лот и вернуть предмет в инвентарь."""
        try:
            listing = MarketListing.objects.get(pk=pk)
        except MarketListing.DoesNotExist:
            return Response(
                {'error': 'Лот не найден.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        player = request.user.player

        if listing.seller_id != player.pk:
            return Response(
                {'error': 'Только продавец может отменить лот.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not listing.is_active:
            return Response(
                {'error': 'Лот уже неактивен.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Возвращаем предмет в инвентарь
        inv_item, created = InventoryItem.objects.get_or_create(
            player=player,
            content_type=listing.content_type,
            object_id=listing.object_id,
            defaults={'quantity': listing.quantity},
        )
        if not created:
            inv_item.quantity += listing.quantity
            inv_item.save(update_fields=['quantity'])

        # Деактивируем лот
        listing.is_active = False
        listing.save(update_fields=['is_active'])

        return Response({
            'status': 'ok',
            'listing_id': listing.pk,
            'item': str(listing.item),
            'quantity': listing.quantity,
            'returned': True,
        })
