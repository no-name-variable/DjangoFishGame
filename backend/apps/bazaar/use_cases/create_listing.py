"""Use case: создание лота на барахолке."""

from django.contrib.contenttypes.models import ContentType

from apps.inventory.models import InventoryItem

from ..models import MarketListing

ALLOWED_ITEM_TYPES = {
    'bait', 'groundbait', 'flavoring', 'food',
    'hook', 'floattackle', 'line', 'reel', 'rodtype',
}


class CreateListingUseCase:
    """Создание лота: проверка инвентаря, списание, создание."""

    def execute(
        self, player, item_type: str, item_id: int, quantity: int, price,
    ) -> MarketListing:
        """Raises: ValueError."""
        if item_type not in ALLOWED_ITEM_TYPES:
            raise ValueError(f'Недопустимый тип предмета: {item_type}')

        try:
            ct = ContentType.objects.get(app_label='tackle', model=item_type)
        except ContentType.DoesNotExist:
            raise ValueError(f'Тип предмета не найден: {item_type}')

        try:
            inv_item = InventoryItem.objects.get(
                player=player, content_type=ct, object_id=item_id,
            )
        except InventoryItem.DoesNotExist:
            raise InventoryItem.DoesNotExist('Предмет не найден в инвентаре.')

        if inv_item.quantity < quantity:
            raise ValueError(f'Недостаточно предметов. В наличии: {inv_item.quantity}.')

        inv_item.quantity -= quantity
        if inv_item.quantity <= 0:
            inv_item.delete()
        else:
            inv_item.save(update_fields=['quantity'])

        return MarketListing.objects.create(
            seller=player,
            content_type=ct,
            object_id=item_id,
            quantity=quantity,
            price=price,
        )
