"""Use case: заказ напитка в баре."""

from django.db import transaction
from django.utils import timezone

from apps.bar.models import BarDrink, BarDrinkOrder
from apps.bar.services import send_bar_notification


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

        with transaction.atomic():
            player.money -= drink.price
            player.hunger = min(100, player.hunger + drink.satiety)
            player.save(update_fields=['money', 'hunger'])
            BarDrinkOrder.objects.create(player=player, drink=drink)

        # Считаем выпитое за сегодня и шлём уведомление
        today = timezone.now().date()
        drink_count = BarDrinkOrder.objects.filter(
            player=player, created_at__date=today,
        ).count()
        send_bar_notification(player, drink_count)

        return {
            'drink_name': drink.name,
            'price': float(drink.price),
            'satiety_gained': drink.satiety,
            'money': float(player.money),
            'hunger': player.hunger,
        }
