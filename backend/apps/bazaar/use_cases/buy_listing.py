"""Use case: покупка лота на барахолке."""

from dataclasses import dataclass

from django.db import transaction

from django.utils import timezone

from apps.inventory.models import InventoryItem

from ..models import MarketListing


@dataclass
class BuyListingResult:
    """Результат покупки лота."""

    listing_id: int
    item_name: str
    quantity: int
    price: float
    money_left: float


class BuyListingUseCase:
    """Покупка лота: проверки, атомарная транзакция."""

    def execute(self, buyer, listing_id: int) -> BuyListingResult:
        """Raises: MarketListing.DoesNotExist, ValueError."""
        try:
            listing = MarketListing.objects.select_related('seller').get(pk=listing_id)
        except MarketListing.DoesNotExist:
            raise MarketListing.DoesNotExist('Лот не найден.')

        if not listing.is_active:
            raise ValueError('Лот уже неактивен.')

        if buyer.pk == listing.seller_id:
            raise ValueError('Нельзя купить собственный лот.')

        if buyer.money < listing.price:
            raise ValueError('Недостаточно денег.')

        with transaction.atomic():
            buyer.money -= listing.price
            buyer.save(update_fields=['money'])

            seller = listing.seller
            seller.money += listing.price
            seller.save(update_fields=['money'])

            inv_item, created = InventoryItem.objects.get_or_create(
                player=buyer,
                content_type=listing.content_type,
                object_id=listing.object_id,
                defaults={'quantity': listing.quantity},
            )
            if not created:
                inv_item.quantity += listing.quantity
                inv_item.save(update_fields=['quantity'])

            listing.is_active = False
            listing.buyer = buyer
            listing.sold_at = timezone.now()
            listing.save(update_fields=['is_active', 'buyer', 'sold_at'])

        return BuyListingResult(
            listing_id=listing.pk,
            item_name=str(listing.item),
            quantity=listing.quantity,
            price=float(listing.price),
            money_left=float(buyer.money),
        )
