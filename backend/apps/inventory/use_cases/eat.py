"""Use case: покормить рыбака."""

from django.contrib.contenttypes.models import ContentType

from apps.tackle.models import Food

from ..models import InventoryItem


class EatUseCase:
    """Съесть еду — восстановить голод."""

    def execute(self, player, food_id: int) -> int:
        """Возвращает новое значение hunger. Raises: Food.DoesNotExist, ValueError."""
        try:
            food = Food.objects.get(pk=food_id)
        except Food.DoesNotExist:
            raise Food.DoesNotExist('Еда не найдена.')

        ct = ContentType.objects.get_for_model(food)
        inv = InventoryItem.objects.filter(
            player=player, content_type=ct, object_id=food.pk, quantity__gte=1,
        ).first()
        if not inv:
            raise ValueError('Нет такой еды в инвентаре.')

        inv.quantity -= 1
        if inv.quantity <= 0:
            inv.delete()
        else:
            inv.save(update_fields=['quantity'])

        player.hunger = min(100, player.hunger + food.satiety)
        player.save(update_fields=['hunger'])

        return player.hunger
