"""Use case: отмена лота на барахолке."""

from dataclasses import dataclass

from apps.inventory.models import InventoryItem

from ..models import MarketListing


@dataclass
class CancelListingResult:
    """Результат отмены лота."""

    listing_id: int
    item_name: str
    quantity: int


class CancelListingUseCase:
    """Отмена лота: проверка владельца, возврат в инвентарь."""

    def execute(self, player, listing_id: int) -> CancelListingResult:
        """Raises: MarketListing.DoesNotExist, ValueError, PermissionError."""
        try:
            listing = MarketListing.objects.get(pk=listing_id)
        except MarketListing.DoesNotExist:
            raise MarketListing.DoesNotExist('Лот не найден.')

        if listing.seller_id != player.pk:
            raise PermissionError('Только продавец может отменить лот.')

        if not listing.is_active:
            raise ValueError('Лот уже неактивен.')

        inv_item, created = InventoryItem.objects.get_or_create(
            player=player,
            content_type=listing.content_type,
            object_id=listing.object_id,
            defaults={'quantity': listing.quantity},
        )
        if not created:
            inv_item.quantity += listing.quantity
            inv_item.save(update_fields=['quantity'])

        listing.is_active = False
        listing.save(update_fields=['is_active'])

        return CancelListingResult(
            listing_id=listing.pk,
            item_name=str(listing.item),
            quantity=listing.quantity,
        )
