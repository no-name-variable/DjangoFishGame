"""Use case: заказ напитка в баре."""

from django.db import transaction

from apps.bar.models import BarDrink, BarDrinkOrder
from apps.bar.services import send_bar_notification
from apps.fishing.models import GameTime


class OrderDrinkUseCase:
    """Заказать напиток — списать деньги, восстановить сытость."""

    def execute(self, player, drink_id: int) -> dict:
        """
        Покупает напиток для игрока.

        Raises: BarDrink.DoesNotExist, ValueError.
        """
        drink = BarDrink.objects.get(pk=drink_id)

        if player.money < drink.price:
            raise ValueError('Недостаточно денег.')

        game_time = GameTime.get_instance()

        with transaction.atomic():
            player.money -= drink.price
            player.hunger = min(100, player.hunger + drink.satiety)
            player.save(update_fields=['money', 'hunger'])
            BarDrinkOrder.objects.create(
                player=player, drink=drink, game_day=game_time.current_day,
            )

        # Считаем выпитое за текущий игровой день
        drink_count = BarDrinkOrder.objects.filter(
            player=player, game_day=game_time.current_day,
        ).count()
        send_bar_notification(player, drink_count)

        return {
            'drink_name': drink.name,
            'price': float(drink.price),
            'satiety_gained': drink.satiety,
            'money': float(player.money),
            'hunger': player.hunger,
        }
