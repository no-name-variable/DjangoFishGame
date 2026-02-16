"""Юнит-тесты для сервисов potions (дроп звёзд, проверка эффектов)."""

import pytest
from unittest.mock import patch

from apps.potions.services import drop_marine_star, has_active_potion, get_potion_effect_value
from apps.potions.models import MarineStar, PlayerStar, Potion, PlayerPotion


@pytest.fixture
def marine_star_red(db):
    return MarineStar.objects.create(color='red', name='Красная звезда', drop_chance=0.05)


@pytest.fixture
def marine_star_blue(db):
    return MarineStar.objects.create(color='blue', name='Синяя звезда', drop_chance=0.03)


@pytest.fixture
def potion_luck(db):
    return Potion.objects.create(
        name='Зелье удачи', effect_type='luck', effect_value=1.3,
        karma_cost=50, duration_hours=6, required_stars={'red': 2},
    )


@pytest.fixture
def potion_rank(db):
    return Potion.objects.create(
        name='Зелье разряда', effect_type='rank_boost', effect_value=1,
        karma_cost=100, duration_hours=0, required_stars={'red': 1},
        is_one_time=True,
    )


@pytest.mark.django_db
class TestDropMarineStar:
    """Тесты дропа морских звёзд."""

    def test_no_stars_in_database(self, player):
        """Без звёзд в базе ничего не дропается."""
        result = drop_marine_star(player)
        assert result is None

    @patch('random.random')
    def test_star_drops_successfully(self, mock_random, player, marine_star_red):
        """Звезда дропается при успешной проверке вероятности."""
        mock_random.return_value = 0.01  # меньше чем drop_chance

        result = drop_marine_star(player)

        assert result is not None
        assert result['star_color'] == 'red'
        assert result['star_name'] == 'Красная звезда'

        # Проверяем что звезда добавлена в инвентарь
        ps = PlayerStar.objects.get(player=player, star=marine_star_red)
        assert ps.quantity == 1

    @patch('random.random')
    def test_star_does_not_drop(self, mock_random, player, marine_star_red):
        """Звезда не дропается при неудачной проверке."""
        mock_random.return_value = 0.99  # больше чем drop_chance

        result = drop_marine_star(player)

        assert result is None
        assert not PlayerStar.objects.filter(player=player).exists()

    @patch('random.random')
    def test_star_quantity_increases(self, mock_random, player, marine_star_red):
        """При повторном дропе количество звёзд увеличивается."""
        PlayerStar.objects.create(player=player, star=marine_star_red, quantity=5)
        mock_random.return_value = 0.01

        drop_marine_star(player)

        ps = PlayerStar.objects.get(player=player, star=marine_star_red)
        assert ps.quantity == 6

    @patch('random.random')
    def test_first_star_drops(self, mock_random, player, marine_star_red, marine_star_blue):
        """Дропается только первая подходящая звезда."""
        # Первая звезда дропнется, вторая не проверится
        mock_random.side_effect = [0.01, 0.99]

        result = drop_marine_star(player)

        assert result is not None
        # Проверяем что только красная звезда дропнулась
        assert PlayerStar.objects.filter(player=player, star=marine_star_red).exists()
        assert not PlayerStar.objects.filter(player=player, star=marine_star_blue).exists()

    def test_multiple_stars_different_chances(self, player):
        """Звёзды с разными шансами дропа."""
        common_star = MarineStar.objects.create(
            color='white', name='Белая звезда', drop_chance=0.1,
        )
        rare_star = MarineStar.objects.create(
            color='gold', name='Золотая звезда', drop_chance=0.01,
        )

        # Запускаем много раз для статистики
        drops = {'white': 0, 'gold': 0, 'none': 0}
        for _ in range(1000):
            result = drop_marine_star(player)
            if result:
                drops[result['star_color']] += 1
            else:
                drops['none'] += 1

        # Белая должна дропаться чаще золотой
        assert drops['white'] > drops['gold']
        assert drops['white'] > 50  # примерно 100 дропов из 1000


@pytest.mark.django_db
class TestHasActivePotion:
    """Тесты проверки активных зелий."""

    def test_no_potions(self, player):
        """Без зелий возвращается None."""
        result = has_active_potion(player, 'luck')
        assert result is None

    def test_active_potion_exists(self, player, potion_luck, game_time):
        """Активное зелье возвращается."""
        PlayerPotion.objects.create(
            player=player,
            potion=potion_luck,
            activated_at_hour=game_time.current_hour,
            activated_at_day=game_time.current_day,
            expires_at_hour=(game_time.current_hour + 6) % 24,
            expires_at_day=game_time.current_day,
        )

        result = has_active_potion(player, 'luck')
        assert result is not None
        assert result == potion_luck

    def test_expired_potion_not_returned(self, player, potion_luck, game_time):
        """Истёкшее зелье не возвращается."""
        # Зелье истекло 1 час назад
        PlayerPotion.objects.create(
            player=player,
            potion=potion_luck,
            activated_at_hour=(game_time.current_hour - 7) % 24,
            activated_at_day=game_time.current_day - 1,
            expires_at_hour=(game_time.current_hour - 1) % 24,
            expires_at_day=game_time.current_day - 1,
        )

        result = has_active_potion(player, 'luck')
        assert result is None

    def test_wrong_effect_type(self, player, potion_luck, game_time):
        """Зелье с другим типом эффекта не возвращается."""
        PlayerPotion.objects.create(
            player=player,
            potion=potion_luck,
            activated_at_hour=game_time.current_hour,
            activated_at_day=game_time.current_day,
            expires_at_hour=(game_time.current_hour + 6) % 24,
            expires_at_day=game_time.current_day,
        )

        result = has_active_potion(player, 'invisibility')
        assert result is None

    def test_multiple_active_potions_same_type(self, player, game_time):
        """Если несколько активных зелий одного типа, возвращается первое."""
        potion1 = Potion.objects.create(
            name='Зелье удачи I', effect_type='luck', effect_value=1.3,
            karma_cost=50, duration_hours=6,
        )
        potion2 = Potion.objects.create(
            name='Зелье удачи II', effect_type='luck', effect_value=1.5,
            karma_cost=100, duration_hours=6,
        )

        PlayerPotion.objects.create(
            player=player, potion=potion1,
            activated_at_hour=game_time.current_hour,
            activated_at_day=game_time.current_day,
            expires_at_hour=(game_time.current_hour + 6) % 24,
            expires_at_day=game_time.current_day,
        )
        PlayerPotion.objects.create(
            player=player, potion=potion2,
            activated_at_hour=game_time.current_hour,
            activated_at_day=game_time.current_day,
            expires_at_hour=(game_time.current_hour + 6) % 24,
            expires_at_day=game_time.current_day,
        )

        result = has_active_potion(player, 'luck')
        assert result in (potion1, potion2)


@pytest.mark.django_db
class TestGetPotionEffectValue:
    """Тесты получения значения эффекта зелья."""

    def test_no_active_potion(self, player):
        """Без активного зелья возвращается None."""
        value = get_potion_effect_value(player, 'luck')
        assert value is None

    def test_returns_effect_value(self, player, potion_luck, game_time):
        """Возвращается значение эффекта активного зелья."""
        PlayerPotion.objects.create(
            player=player,
            potion=potion_luck,
            activated_at_hour=game_time.current_hour,
            activated_at_day=game_time.current_day,
            expires_at_hour=(game_time.current_hour + 6) % 24,
            expires_at_day=game_time.current_day,
        )

        value = get_potion_effect_value(player, 'luck')
        assert value == 1.3

    def test_expired_potion_returns_none(self, player, potion_luck, game_time):
        """Для истёкшего зелья возвращается None."""
        PlayerPotion.objects.create(
            player=player,
            potion=potion_luck,
            activated_at_hour=(game_time.current_hour - 7) % 24,
            activated_at_day=game_time.current_day - 1,
            expires_at_hour=(game_time.current_hour - 1) % 24,
            expires_at_day=game_time.current_day - 1,
        )

        value = get_potion_effect_value(player, 'luck')
        assert value is None

    def test_different_effect_types(self, player, game_time):
        """Разные типы эффектов возвращают разные значения."""
        luck_potion = Potion.objects.create(
            name='Зелье удачи', effect_type='luck', effect_value=1.3,
            karma_cost=50, duration_hours=6,
        )
        rarity_potion = Potion.objects.create(
            name='Зелье редкости', effect_type='rarity', effect_value=2.0,
            karma_cost=100, duration_hours=6,
        )

        PlayerPotion.objects.create(
            player=player, potion=luck_potion,
            activated_at_hour=game_time.current_hour,
            activated_at_day=game_time.current_day,
            expires_at_hour=(game_time.current_hour + 6) % 24,
            expires_at_day=game_time.current_day,
        )
        PlayerPotion.objects.create(
            player=player, potion=rarity_potion,
            activated_at_hour=game_time.current_hour,
            activated_at_day=game_time.current_day,
            expires_at_hour=(game_time.current_hour + 6) % 24,
            expires_at_day=game_time.current_day,
        )

        luck_value = get_potion_effect_value(player, 'luck')
        rarity_value = get_potion_effect_value(player, 'rarity')

        assert luck_value == 1.3
        assert rarity_value == 2.0

    def test_one_time_potion(self, player, potion_rank, game_time):
        """Одноразовое зелье (без длительности)."""
        # Одноразовые зелья не создают PlayerPotion записи
        # Их эффект применяется сразу
        value = get_potion_effect_value(player, 'rank_boost')
        assert value is None
