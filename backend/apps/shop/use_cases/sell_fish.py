"""Use case: продажа рыбы из садка с динамическим ценообразованием."""

from dataclasses import dataclass
from decimal import Decimal

from apps.inventory.models import CaughtFish
from apps.tackle.models import FishPriceDynamic


@dataclass
class SellFishResult:
    """Результат продажи."""

    fish_sold: int
    money_earned: float
    money_total: float


class SellFishUseCase:
    """Продажа рыбы из садка."""

    def execute(self, player, fish_ids: list[int]) -> SellFishResult:
        """Raises: ValueError."""
        fish_qs = CaughtFish.objects.filter(
            player=player, pk__in=fish_ids,
            is_sold=False, is_released=False,
        ).select_related('species', 'location')

        if not fish_qs.exists():
            raise ValueError('Рыба не найдена в садке.')

        fish_list = list(fish_qs)
        total_money = Decimal('0')

        for fish in fish_list:
            # Динамический модификатор цены по локации
            modifier = Decimal(str(FishPriceDynamic.get_modifier(fish.species, fish.location)))
            price = (fish.species.sell_price_per_kg * Decimal(str(fish.weight)) * modifier).quantize(
                Decimal('0.01')
            )
            total_money += price
            # Регистрируем продажу для обновления динамики
            FishPriceDynamic.record_sale(fish.species, fish.location, fish.weight)

        fish_qs.update(is_sold=True)
        player.money += total_money
        player.save(update_fields=['money'])

        return SellFishResult(
            fish_sold=len(fish_list),
            money_earned=float(total_money),
            money_total=float(player.money),
        )
