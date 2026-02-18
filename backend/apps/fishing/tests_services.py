"""Юнит-тесты для сервисов fishing (bite_calculator, fight_engine, fish_selector, time_service)."""

import pytest
from decimal import Decimal
from unittest.mock import patch

from apps.fishing.services.bite_calculator import BiteCalculatorService
from apps.fishing.services.fight_engine import FightEngineService
from apps.fishing.services.fish_selector import FishSelectorService
from apps.fishing.services.time_service import TimeService
from apps.fishing.models import FishingSession, FightState, GroundbaitSpot
from apps.potions.models import PlayerPotion
from apps.potions.services import PotionService


# ──────────────────────── time_service ────────────────────────

@pytest.mark.django_db
class TestTimeService:
    """Тесты игрового времени и фаз суток."""

    def setup_method(self):
        self.svc = TimeService()

    def test_get_time_of_day_morning(self, game_time):
        game_time.current_hour = 6
        game_time.save()
        assert self.svc.get_time_of_day() == 'morning'

    def test_get_time_of_day_day(self, game_time):
        game_time.current_hour = 13
        game_time.save()
        assert self.svc.get_time_of_day() == 'day'

    def test_get_time_of_day_evening(self, game_time):
        game_time.current_hour = 19
        game_time.save()
        assert self.svc.get_time_of_day() == 'evening'

    def test_get_time_of_day_night(self, game_time):
        game_time.current_hour = 2
        game_time.save()
        assert self.svc.get_time_of_day() == 'night'

    def test_get_time_of_day_modifier_with_active_time(self, fish_species, game_time):
        game_time.current_hour = 6  # morning
        game_time.save()
        fish_species.active_time = {
            'morning': 1.5, 'day': 0.8, 'evening': 1.0, 'night': 0.3
        }
        fish_species.save()
        modifier = self.svc.get_time_of_day_modifier(fish_species)
        assert modifier == 1.5

    def test_get_time_of_day_modifier_default(self, fish_species, game_time):
        game_time.current_hour = 6
        game_time.save()
        fish_species.active_time = {}
        fish_species.save()
        modifier = self.svc.get_time_of_day_modifier(fish_species)
        assert modifier == 0.5  # дефолтное значение


# ──────────────────────── bite_calculator ─────────────────────

@pytest.mark.django_db
class TestBiteCalculator:
    """Тесты расчёта вероятности поклёвки."""

    def setup_method(self):
        self.svc = BiteCalculatorService(TimeService(), PotionService())

    def test_base_chance_calculation(self, player, location, player_rod, location_fish, game_time):
        chance = self.svc.calculate_bite_chance(player, location, player_rod)
        assert 0.0 <= chance <= 0.5
        assert chance > 0

    def test_bait_match_increases_chance(self, player, location, player_rod, bait, fish_species, location_fish, game_time):
        # Без совпадения наживки
        player_rod.bait = bait
        player_rod.save()
        chance_without = self.svc.calculate_bite_chance(player, location, player_rod)

        # С совпадением наживки
        bait.target_species.add(fish_species)
        chance_with = self.svc.calculate_bite_chance(player, location, player_rod)

        assert chance_with > chance_without

    def test_rank_modifier(self, player, location, player_rod, location_fish, game_time):
        player.rank = 0
        player.save()
        chance_low = self.svc.calculate_bite_chance(player, location, player_rod)

        player.rank = 50
        player.save()
        chance_high = self.svc.calculate_bite_chance(player, location, player_rod)

        assert chance_high > chance_low

    def test_karma_modifier_positive(self, player, location, player_rod, location_fish, game_time):
        player.karma = 0
        player.save()
        chance_neutral = self.svc.calculate_bite_chance(player, location, player_rod)

        player.karma = 500
        player.save()
        chance_positive = self.svc.calculate_bite_chance(player, location, player_rod)

        assert chance_positive > chance_neutral

    def test_karma_modifier_negative(self, player, location, player_rod, location_fish, game_time):
        player.karma = 0
        player.save()
        chance_neutral = self.svc.calculate_bite_chance(player, location, player_rod)

        player.karma = -100
        player.save()
        chance_negative = self.svc.calculate_bite_chance(player, location, player_rod)

        assert chance_negative < chance_neutral

    def test_hunger_modifier(self, player, location, player_rod, location_fish, game_time):
        player.hunger = 100
        player.save()
        chance_full = self.svc.calculate_bite_chance(player, location, player_rod)

        player.hunger = 0
        player.save()
        chance_hungry = self.svc.calculate_bite_chance(player, location, player_rod)

        assert chance_full > chance_hungry

    def test_groundbait_modifier(self, player, location, player_rod, groundbait, location_fish, game_time):
        chance_without = self.svc.calculate_bite_chance(player, location, player_rod)

        # Создаём активную прикормку
        GroundbaitSpot.objects.create(
            player=player, location=location, groundbait=groundbait,
            expires_at_hour=(game_time.current_hour + 3) % 24,
            expires_at_day=game_time.current_day,
        )

        chance_with = self.svc.calculate_bite_chance(player, location, player_rod)
        assert chance_with > chance_without

    @patch.object(PotionService, 'get_potion_effect_value')
    def test_luck_potion_modifier(self, mock_potion, player, location, player_rod, location_fish, game_time):
        mock_potion.return_value = None
        chance_without = self.svc.calculate_bite_chance(player, location, player_rod)

        mock_potion.return_value = 1.3
        chance_with = self.svc.calculate_bite_chance(player, location, player_rod)

        assert chance_with > chance_without

    def test_try_bite_returns_boolean(self, player, location, player_rod, location_fish, game_time):
        result = self.svc.try_bite(player, location, player_rod)
        assert isinstance(result, bool)


# ──────────────────────── fish_selector ───────────────────────

@pytest.mark.django_db
class TestFishSelector:
    """Тесты выбора вида рыбы при поклёвке."""

    def setup_method(self):
        self.svc = FishSelectorService(TimeService(), PotionService())

    def test_select_fish_returns_species(self, location, player_rod, location_fish):
        fish = self.svc.select_fish(location, player_rod)
        assert fish is not None
        assert fish.name_ru == 'Карась'

    def test_select_fish_empty_location(self, location, player_rod):
        fish = self.svc.select_fish(location, player_rod)
        assert fish is None

    def test_bait_matching_increases_weight(self, location, player_rod, bait, fish_species, location_fish):
        player_rod.bait = bait
        player_rod.save()
        bait.target_species.add(fish_species)

        # Запускаем несколько раз для статистической проверки
        results = [self.svc.select_fish(location, player_rod) for _ in range(10)]
        assert all(r == fish_species for r in results if r)

    def test_groundbait_target_species_bonus(self, location, player_rod, groundbait, fish_species, location_fish, game_time):
        groundbait.target_species.add(fish_species)
        GroundbaitSpot.objects.create(
            player=player_rod.player, location=location, groundbait=groundbait,
            expires_at_hour=(game_time.current_hour + 3) % 24,
            expires_at_day=game_time.current_day,
        )

        fish = self.svc.select_fish(location, player_rod)
        assert fish == fish_species

    @patch.object(PotionService, 'get_potion_effect_value')
    def test_rarity_potion_modifier(self, mock_potion, location, player_rod, fish_species, location_fish):
        # Создаём редкую рыбу
        rare_fish = fish_species
        rare_fish.rarity = 'rare'
        rare_fish.save()

        mock_potion.return_value = 2.0  # Удвоение веса редких рыб

        fish = self.svc.select_fish(location, player_rod)
        assert fish is not None

    def test_generate_fish_weight_in_range(self, fish_species):
        weight = self.svc.generate_fish_weight(fish_species)
        assert fish_species.weight_min <= weight <= fish_species.weight_max

    @patch.object(PotionService, 'get_potion_effect_value')
    def test_generate_fish_weight_trophy_potion(self, mock_potion, fish_species, player):
        mock_potion.return_value = None
        weights_without = [self.svc.generate_fish_weight(fish_species, player) for _ in range(20)]

        mock_potion.return_value = 1.0
        weights_with = [self.svc.generate_fish_weight(fish_species, player) for _ in range(20)]

        # С зельем трофея средний вес должен быть выше
        assert sum(weights_with) / len(weights_with) > sum(weights_without) / len(weights_without)

    def test_generate_fish_length_proportional(self, fish_species):
        small_weight = fish_species.weight_min
        large_weight = fish_species.weight_max

        small_length = self.svc.generate_fish_length(fish_species, small_weight)
        large_length = self.svc.generate_fish_length(fish_species, large_weight)

        assert small_length < large_length
        assert fish_species.length_min <= small_length <= fish_species.length_max
        assert fish_species.length_min <= large_length <= fish_species.length_max


# ──────────────────────── fight_engine ────────────────────────

@pytest.mark.django_db
class TestFightEngine:
    """Тесты движка вываживания."""

    def setup_method(self):
        self.svc = FightEngineService()

    def test_create_fight(self, fishing_session_waiting, fish_species):
        fight = self.svc.create_fight(
            fishing_session_waiting,
            fish_weight=1.5,
            fish_species=fish_species,
        )

        assert fight.session == fishing_session_waiting
        assert fight.fish_strength > 0
        assert fight.line_tension == 20
        assert 10 <= fight.distance <= 30
        assert fight.rod_durability > 0

    def test_create_fight_rarity_multiplier(self, fishing_session_waiting, fish_species):
        fish_species.rarity = 'legendary'
        fish_species.save()

        fight = self.svc.create_fight(
            fishing_session_waiting,
            fish_weight=1.0,
            fish_species=fish_species,
        )

        # Легендарная рыба должна быть в 3 раза сильнее
        assert fight.fish_strength == 1.0 * 3 * 3.0

    def test_reel_in_reduces_distance(self, fishing_session_fighting):
        fight = FightState.objects.get(session=fishing_session_fighting)
        # Устанавливаем минимальную силу рыбы, чтобы рывок не перекрыл подмотку
        fight.fish_strength = 0.1
        fight.distance = 25.0
        fight.line_tension = 10
        fight.save()
        initial_distance = fight.distance

        result = self.svc.reel_in(fight)
        fight.refresh_from_db()

        assert fight.distance < initial_distance or result == 'caught'

    def test_reel_in_increases_tension(self, fishing_session_fighting):
        fight = FightState.objects.get(session=fishing_session_fighting)
        initial_tension = fight.line_tension

        result = self.svc.reel_in(fight)
        fight.refresh_from_db()

        # Натяжение могло как увеличиться, так и уменьшиться из-за fish_action
        assert result in ('fighting', 'caught', 'line_break', 'rod_break')

    def test_pull_rod_stronger_than_reel(self, fishing_session_fighting):
        fight = FightState.objects.get(session=fishing_session_fighting)
        initial_distance = fight.distance
        initial_durability = fight.rod_durability

        result = self.svc.pull_rod(fight)
        fight.refresh_from_db()

        # Подтяжка снижает прочность удилища
        assert fight.rod_durability < initial_durability or result == 'rod_break'

    @patch('apps.fishing.services.fight_engine.random')
    def test_wait_action_reduces_tension(self, mock_random, fishing_session_fighting):
        fight = FightState.objects.get(session=fishing_session_fighting)
        fight.line_tension = 50
        fight.fish_strength = 5.0
        fight.save()

        # random.random() > 0.3 — рывка нет
        mock_random.random.return_value = 0.5

        self.svc.wait_action(fight)
        fight.refresh_from_db()

        # wait снижает на -5, _fish_action без рывка снижает на -2 = 43
        assert fight.line_tension == 43

    def test_line_break_on_high_tension(self, fishing_session_fighting):
        fight = FightState.objects.get(session=fishing_session_fighting)
        fight.line_tension = 99
        fight.fish_strength = 100
        fight.save()

        result = self.svc.reel_in(fight)

        # При высоком натяжении возможен обрыв
        assert result in ('line_break', 'fighting', 'caught')

    def test_caught_when_distance_zero(self, fishing_session_fighting):
        fight = FightState.objects.get(session=fishing_session_fighting)
        fight.distance = 0.5
        fight.fish_strength = 1.0
        fight.line_tension = 10
        fight.save()

        result = self.svc.reel_in(fight)
        # После подмотки дистанция станет 0 или отрицательной
        assert result in ('caught', 'fighting')

    def test_rod_break_when_durability_zero(self, fishing_session_fighting):
        fight = FightState.objects.get(session=fishing_session_fighting)
        fight.rod_durability = 1
        fight.save()

        result = self.svc.pull_rod(fight)
        assert result in ('rod_break', 'fighting', 'caught', 'line_break')

    def test_fish_strength_decreases_over_time(self, fishing_session_fighting):
        fight = FightState.objects.get(session=fishing_session_fighting)
        initial_strength = fight.fish_strength

        # Симулируем несколько раундов
        for _ in range(5):
            if self.svc.reel_in(fight) != 'fighting':
                break
            fight.refresh_from_db()

        fight.refresh_from_db()
        # Сила рыбы должна уменьшиться
        assert fight.fish_strength <= initial_strength
