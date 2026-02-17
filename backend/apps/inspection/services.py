"""Бизнес-логика рыбнадзора."""

from decimal import Decimal

from django.conf import settings

from apps.inventory.models import CaughtFish
from apps.tackle.models import FishSpecies

from .models import FishInspection


class InspectionService:
    """Сервис рыбнадзора: проверка садков на нарушения."""

    def inspect_player(self, player):
        """
        Провести проверку рыбнадзора для игрока.

        Проверяет садок игрока на нарушения:
        - Превышение лимита садка
        - Размерные нарушения (рыба меньше допустимого размера)
        - Запрещённые виды (легендарная рыба в садке)

        Возвращает запись FishInspection.
        """
        creel = CaughtFish.objects.filter(
            player=player, is_sold=False, is_released=False,
        ).select_related('species')

        creel_list = list(creel)
        creel_count = len(creel_list)

        violation_found = False
        violation_type = ''
        fine_amount = Decimal('0')
        karma_penalty = 0
        details_parts = []

        max_creel = settings.GAME_SETTINGS['MAX_CREEL_SIZE']

        # Проверка 1: превышение лимита садка
        if creel_count > max_creel:
            violation_found = True
            violation_type = FishInspection.ViolationType.CREEL_LIMIT
            fine_amount += Decimal('500')
            karma_penalty -= 20
            details_parts.append(
                f'В садке {creel_count} рыб при лимите {max_creel}.'
            )

        # Проверка 2: размерное нарушение (вес < weight_min * 1.5)
        undersized_fish = [
            fish for fish in creel_list
            if fish.weight < fish.species.weight_min * 1.5
        ]
        if undersized_fish:
            violation_found = True
            violation_type = FishInspection.ViolationType.SIZE_LIMIT
            fine_per_fish = Decimal('200')
            fine_amount += fine_per_fish * len(undersized_fish)
            karma_penalty -= 10
            names = ', '.join(
                f'{f.species.name_ru} ({f.weight}кг)' for f in undersized_fish
            )
            details_parts.append(
                f'Размерное нарушение ({len(undersized_fish)} шт.): {names}.'
            )

        # Проверка 3: запрещённый вид (легендарная рыба)
        forbidden_fish = [
            fish for fish in creel_list
            if fish.species.rarity == FishSpecies.Rarity.LEGENDARY
        ]
        if forbidden_fish:
            violation_found = True
            violation_type = FishInspection.ViolationType.FORBIDDEN_SPECIES
            fine_amount += Decimal('1000')
            karma_penalty -= 50
            names = ', '.join(f.species.name_ru for f in forbidden_fish)
            details_parts.append(
                f'Запрещённый вид в садке: {names}.'
            )

        # Создаём запись проверки
        inspection = FishInspection.objects.create(
            player=player,
            location=player.current_location,
            violation_found=violation_found,
            violation_type=violation_type,
            fine_amount=fine_amount,
            karma_penalty=karma_penalty,
            details=' '.join(details_parts),
        )

        # Если нарушение — списываем деньги и карму
        if violation_found:
            player.money -= fine_amount
            if player.money < 0:
                player.money = Decimal('0')
            player.karma += karma_penalty
            player.save(update_fields=['money', 'karma'])

        return inspection
