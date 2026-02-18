"""Use case: покупка товара в магазине."""

from dataclasses import dataclass

from django.contrib.contenttypes.models import ContentType

from apps.inventory.models import InventoryItem
from apps.home.models import MoonshineIngredient
from apps.tackle.models import (
    Bait, FloatTackle, Flavoring, Food, Groundbait, Hook, Line, Reel, RodType,
)

ITEM_TYPE_MAP = {
    'rod': RodType, 'reel': Reel, 'line': Line, 'hook': Hook,
    'float': FloatTackle, 'bait': Bait,
    'groundbait': Groundbait, 'flavoring': Flavoring, 'food': Food,
    'ingredient': MoonshineIngredient,
}


@dataclass
class BuyItemResult:
    """Результат покупки."""

    item_name: str
    quantity: int
    money_left: float


class BuyItemUseCase:
    """Покупка товара с проверкой денег и разряда."""

    def execute(self, player, item_type: str, item_id: int, quantity: int) -> BuyItemResult:
        """Raises: ValueError, PermissionError."""
        model_class = ITEM_TYPE_MAP.get(item_type)
        if not model_class:
            raise ValueError('Неизвестный тип.')

        try:
            item = model_class.objects.get(pk=item_id)
        except model_class.DoesNotExist:
            from django.core.exceptions import ObjectDoesNotExist
            raise ObjectDoesNotExist('Товар не найден.')

        total_cost = item.price * quantity
        if player.money < total_cost:
            raise ValueError('Недостаточно денег.')

        if hasattr(item, 'min_rank') and player.rank < item.min_rank:
            raise PermissionError(f'Требуется разряд {item.min_rank}.')

        player.money -= total_cost
        player.save(update_fields=['money'])

        ct = ContentType.objects.get_for_model(item)
        inv_item, created = InventoryItem.objects.get_or_create(
            player=player, content_type=ct, object_id=item.pk,
            defaults={'quantity': quantity},
        )
        if not created:
            inv_item.quantity += quantity
            inv_item.save(update_fields=['quantity'])

        return BuyItemResult(
            item_name=str(item),
            quantity=quantity,
            money_left=float(player.money),
        )
