"""Use case: продажа рыбы из садка."""

from dataclasses import dataclass

from apps.inventory.models import CaughtFish


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
        )

        if not fish_qs.exists():
            raise ValueError('Рыба не найдена в садке.')

        total_money = sum(f.sell_price for f in fish_qs)
        count = fish_qs.count()

        fish_qs.update(is_sold=True)
        player.money += total_money
        player.save(update_fields=['money'])

        return SellFishResult(
            fish_sold=count,
            money_earned=total_money,
            money_total=float(player.money),
        )
