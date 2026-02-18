"""Use case: купить ингредиент для самогона."""

from dataclasses import dataclass

from ..models import MoonshineIngredient, PlayerIngredient


@dataclass
class BuyIngredientResult:
    """Результат покупки ингредиента."""
    ingredient_name: str
    quantity: int
    total_cost: float
    player_money: float


class BuyIngredientUseCase:
    """Купить ингредиент в магазине."""

    def execute(self, player, ingredient_id: int, quantity: int = 1) -> BuyIngredientResult:
        """Raises: MoonshineIngredient.DoesNotExist, ValueError."""
        try:
            ingredient = MoonshineIngredient.objects.get(pk=ingredient_id)
        except MoonshineIngredient.DoesNotExist:
            raise MoonshineIngredient.DoesNotExist('Ингредиент не найден.')

        total_cost = ingredient.price * quantity
        if player.money < total_cost:
            raise ValueError(
                f'Недостаточно денег. Нужно: {total_cost}, есть: {player.money}.',
            )

        player.money -= total_cost
        player.save(update_fields=['money'])

        pi, _ = PlayerIngredient.objects.get_or_create(
            player=player, ingredient=ingredient,
        )
        pi.quantity += quantity
        pi.save(update_fields=['quantity'])

        return BuyIngredientResult(
            ingredient_name=ingredient.name,
            quantity=quantity,
            total_cost=float(total_cost),
            player_money=float(player.money),
        )
