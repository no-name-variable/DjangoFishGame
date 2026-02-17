"""Юнит-тесты для сервисов inspection (inspect_player)."""

import pytest
from decimal import Decimal
from unittest.mock import patch

from apps.inspection.services import InspectionService
from apps.inspection.models import FishInspection
from apps.inventory.models import CaughtFish
from apps.tackle.models import FishSpecies


@pytest.mark.django_db
class TestInspectPlayer:
    """Тесты проверки рыбнадзора."""

    def setup_method(self):
        self.svc = InspectionService()

    def test_no_violations_clean_creel(self, player, fish_species, location):
        """Проверка без нарушений."""
        player.current_location = location
        player.save()

        CaughtFish.objects.create(
            player=player, species=fish_species,
            weight=1.5, length=25, location=location,
        )

        inspection = self.svc.inspect_player(player)

        assert inspection.violation_found is False
        assert inspection.fine_amount == Decimal('0')
        assert inspection.karma_penalty == 0

    @patch('apps.inspection.services.settings.GAME_SETTINGS', {'MAX_CREEL_SIZE': 5})
    def test_creel_limit_violation(self, player, fish_species, location):
        """Нарушение: превышение лимита садка."""
        player.current_location = location
        player.save()

        # Создаём 6 рыб (лимит 5)
        for _ in range(6):
            CaughtFish.objects.create(
                player=player, species=fish_species,
                weight=1.5, length=25, location=location,
            )

        inspection = self.svc.inspect_player(player)

        assert inspection.violation_found is True
        assert inspection.violation_type == 'creel_limit'
        assert inspection.fine_amount == Decimal('500')
        assert inspection.karma_penalty == -20

    def test_size_limit_violation(self, player, fish_species, location):
        """Нарушение: размерное (вес < weight_min * 1.5)."""
        player.current_location = location
        player.save()

        # weight_min = 0.1, значит нарушение при весе < 0.15
        CaughtFish.objects.create(
            player=player, species=fish_species,
            weight=0.1, length=8, location=location,
        )

        inspection = self.svc.inspect_player(player)

        assert inspection.violation_found is True
        assert inspection.violation_type == 'size_limit'
        assert inspection.fine_amount == Decimal('200')
        assert inspection.karma_penalty == -10

    def test_multiple_undersized_fish(self, player, fish_species, location):
        """Несколько мелких рыб — штраф за каждую."""
        player.current_location = location
        player.save()

        for _ in range(3):
            CaughtFish.objects.create(
                player=player, species=fish_species,
                weight=0.1, length=8, location=location,
            )

        inspection = self.svc.inspect_player(player)

        assert inspection.violation_found is True
        assert inspection.fine_amount == Decimal('600')  # 200 * 3

    def test_forbidden_species_violation(self, player, location):
        """Нарушение: легендарная рыба в садке."""
        player.current_location = location
        player.save()

        legendary_fish = FishSpecies.objects.create(
            name_ru='Древний осётр', rarity='legendary',
            weight_min=10.0, weight_max=100.0,
            length_min=100, length_max=300,
            sell_price_per_kg=Decimal('1000.00'),
        )

        CaughtFish.objects.create(
            player=player, species=legendary_fish,
            weight=50.0, length=200, location=location,
        )

        inspection = self.svc.inspect_player(player)

        assert inspection.violation_found is True
        assert inspection.violation_type == 'forbidden_species'
        assert inspection.fine_amount == Decimal('1000')
        assert inspection.karma_penalty == -50

    def test_multiple_violation_types(self, player, location):
        """Несколько типов нарушений одновременно."""
        player.current_location = location
        player.money = Decimal('5000.00')
        player.karma = 100
        player.save()

        # Мелкая рыба
        small_species = FishSpecies.objects.create(
            name_ru='Уклейка', rarity='common',
            weight_min=0.05, weight_max=0.1,
            length_min=5, length_max=12,
            sell_price_per_kg=Decimal('5.00'),
        )
        CaughtFish.objects.create(
            player=player, species=small_species,
            weight=0.05, length=6, location=location,
        )

        # Легендарная рыба
        legendary = FishSpecies.objects.create(
            name_ru='Легендарная щука', rarity='legendary',
            weight_min=20.0, weight_max=50.0,
            length_min=150, length_max=200,
            sell_price_per_kg=Decimal('2000.00'),
        )
        CaughtFish.objects.create(
            player=player, species=legendary,
            weight=30.0, length=180, location=location,
        )

        inspection = self.svc.inspect_player(player)

        # Размерное + запрещённый вид
        assert inspection.violation_found is True
        assert inspection.fine_amount >= Decimal('1200')  # 200 + 1000
        assert inspection.karma_penalty <= -60  # -10 + -50

    def test_fine_deducted_from_player(self, player, fish_species, location):
        """Штраф списывается с игрока."""
        player.current_location = location
        player.money = Decimal('1000.00')
        player.karma = 50
        player.save()

        # Размерное нарушение
        CaughtFish.objects.create(
            player=player, species=fish_species,
            weight=0.1, length=8, location=location,
        )

        self.svc.inspect_player(player)

        player.refresh_from_db()
        assert player.money == Decimal('800.00')  # 1000 - 200
        assert player.karma == 40  # 50 - 10

    def test_money_not_negative(self, player, fish_species, location):
        """Деньги не могут уйти в минус."""
        player.current_location = location
        player.money = Decimal('50.00')
        player.save()

        # Размерное нарушение: штраф 200
        CaughtFish.objects.create(
            player=player, species=fish_species,
            weight=0.1, length=8, location=location,
        )

        self.svc.inspect_player(player)

        player.refresh_from_db()
        assert player.money == Decimal('0.00')

    def test_sold_fish_ignored(self, player, fish_species, location):
        """Проданная рыба не проверяется."""
        player.current_location = location
        player.save()

        CaughtFish.objects.create(
            player=player, species=fish_species,
            weight=0.1, length=8, location=location,
            is_sold=True,
        )

        inspection = self.svc.inspect_player(player)

        assert inspection.violation_found is False

    def test_released_fish_ignored(self, player, fish_species, location):
        """Отпущенная рыба не проверяется."""
        player.current_location = location
        player.save()

        CaughtFish.objects.create(
            player=player, species=fish_species,
            weight=0.1, length=8, location=location,
            is_released=True,
        )

        inspection = self.svc.inspect_player(player)

        assert inspection.violation_found is False

    def test_inspection_record_created(self, player, fish_species, location):
        """Запись проверки создаётся в базе."""
        player.current_location = location
        player.save()

        CaughtFish.objects.create(
            player=player, species=fish_species,
            weight=1.5, length=25, location=location,
        )

        inspection = self.svc.inspect_player(player)

        assert FishInspection.objects.filter(player=player).exists()
        assert inspection.location == location

    def test_violation_details_field(self, player, fish_species, location):
        """Поле details содержит описание нарушений."""
        player.current_location = location
        player.save()

        # Размерное нарушение
        CaughtFish.objects.create(
            player=player, species=fish_species,
            weight=0.1, length=8, location=location,
        )

        inspection = self.svc.inspect_player(player)

        assert inspection.details != ''
        assert 'Размерное' in inspection.details
        assert fish_species.name_ru in inspection.details

    def test_normal_sized_fish_not_violation(self, player, fish_species, location):
        """Рыба нормального размера не является нарушением."""
        player.current_location = location
        player.save()

        # weight_min = 0.1, weight_min * 1.5 = 0.15
        # Рыба весом 0.5 — нормальная
        CaughtFish.objects.create(
            player=player, species=fish_species,
            weight=0.5, length=15, location=location,
        )

        inspection = self.svc.inspect_player(player)

        assert inspection.violation_found is False

    def test_common_rarity_not_forbidden(self, player, fish_species, location):
        """Обычная рыба не является запрещённой."""
        player.current_location = location
        player.save()

        fish_species.rarity = 'common'
        fish_species.save()

        CaughtFish.objects.create(
            player=player, species=fish_species,
            weight=1.5, length=25, location=location,
        )

        inspection = self.svc.inspect_player(player)

        assert inspection.violation_found is False
        assert 'forbidden' not in inspection.violation_type

    @patch('apps.inspection.services.settings.GAME_SETTINGS', {'MAX_CREEL_SIZE': 3})
    def test_exact_creel_limit_no_violation(self, player, fish_species, location):
        """Точное совпадение с лимитом — не нарушение."""
        player.current_location = location
        player.save()

        for _ in range(3):
            CaughtFish.objects.create(
                player=player, species=fish_species,
                weight=1.5, length=25, location=location,
            )

        inspection = self.svc.inspect_player(player)

        assert inspection.violation_found is False
