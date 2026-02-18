"""Use case: приготовление закуски из рыбы."""

from django.db import transaction

from apps.bar.models import BarSnackOrder
from apps.inventory.models import CaughtFish

# Коэффициент сытости на кг по способу приготовления
SATIETY_COEFFICIENTS = {
    'dried': 8,
    'smoked': 10,
    'fried': 12,
}


class PrepareSnackUseCase:
    """Приготовить закуску из пойманной рыбы."""

    def execute(self, player, fish_id: int, preparation: str) -> dict:
        """
        Готовит закуску из рыбы в садке.

        Raises: CaughtFish.DoesNotExist, ValueError.
        """
        if preparation not in SATIETY_COEFFICIENTS:
            raise ValueError('Неизвестный способ приготовления.')

        fish = CaughtFish.objects.select_related('species').get(
            pk=fish_id, player=player, is_sold=False, is_released=False,
        )

        coeff = SATIETY_COEFFICIENTS[preparation]
        satiety = int(fish.weight * coeff)

        with transaction.atomic():
            fish.is_sold = True
            fish.save(update_fields=['is_sold'])

            player.hunger = min(100, player.hunger + satiety)
            player.save(update_fields=['hunger'])

            BarSnackOrder.objects.create(
                player=player,
                fish=fish,
                preparation=preparation,
                satiety_gained=satiety,
            )

        return {
            'fish_name': fish.species.name_ru,
            'weight': fish.weight,
            'preparation': preparation,
            'satiety_gained': satiety,
            'hunger': player.hunger,
        }
