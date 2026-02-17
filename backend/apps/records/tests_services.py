"""Юнит-тесты для сервисов records (check_record, check_achievements)."""

import pytest
from decimal import Decimal

from apps.records.services import RecordService
from apps.records.models import FishRecord, Achievement, PlayerAchievement
from apps.inventory.models import CaughtFish
from apps.quests.models import Quest, PlayerQuest


@pytest.mark.django_db
class TestCheckRecord:
    """Тесты проверки рекордов."""

    def setup_method(self):
        self.svc = RecordService()

    def test_first_record_created(self, player, fish_species, location):
        """Первая пойманная рыба автоматически становится рекордом."""
        record = self.svc.check_record(player, fish_species, 1.5, 25.0, location)

        assert record is not None
        assert record.player == player
        assert record.species == fish_species
        assert record.weight == 1.5
        assert record.length == 25.0
        assert record.location == location

    def test_heavier_fish_creates_new_record(self, player, fish_species, location):
        """Более тяжёлая рыба устанавливает новый рекорд."""
        # Создаём первый рекорд
        FishRecord.objects.create(
            species=fish_species, player=player,
            weight=1.0, length=20.0, location=location,
        )

        # Пытаемся установить новый рекорд
        record = self.svc.check_record(player, fish_species, 2.0, 30.0, location)

        assert record is not None
        assert record.weight == 2.0

    def test_lighter_fish_does_not_create_record(self, player, fish_species, location):
        """Более лёгкая рыба не устанавливает рекорд."""
        # Создаём рекорд
        FishRecord.objects.create(
            species=fish_species, player=player,
            weight=2.0, length=30.0, location=location,
        )

        # Пытаемся установить рекорд меньшей рыбой
        record = self.svc.check_record(player, fish_species, 1.5, 25.0, location)

        assert record is None

    def test_equal_weight_does_not_create_record(self, player, fish_species, location):
        """Рыба с таким же весом не устанавливает новый рекорд."""
        FishRecord.objects.create(
            species=fish_species, player=player,
            weight=1.5, length=25.0, location=location,
        )

        record = self.svc.check_record(player, fish_species, 1.5, 25.0, location)
        assert record is None

    def test_record_by_different_player(self, player, fish_species, location):
        """Рекорд может быть установлен другим игроком."""
        from apps.accounts.models import Player
        from django.contrib.auth.models import User

        other_user = User.objects.create_user(username='other', password='pass')
        other_player = Player.objects.create(
            user=other_user, nickname='Other',
            current_base=player.current_base,
        )

        # Первый игрок устанавливает рекорд
        FishRecord.objects.create(
            species=fish_species, player=player,
            weight=1.5, length=25.0, location=location,
        )

        # Второй игрок бьёт рекорд
        record = self.svc.check_record(other_player, fish_species, 2.0, 30.0, location)

        assert record is not None
        assert record.player == other_player


@pytest.mark.django_db
class TestCheckAchievements:
    """Тесты проверки достижений."""

    def setup_method(self):
        self.svc = RecordService()

    def test_no_achievements_initially(self, player):
        """Без достижений в базе ничего не выдаётся."""
        unlocked = self.svc.check_achievements(player)
        assert len(unlocked) == 0

    def test_fish_count_achievement(self, player, fish_species, location):
        """Достижение за количество пойманной рыбы."""
        achievement = Achievement.objects.create(
            name='Первый улов',
            description='Поймайте первую рыбу',
            category='catch',
            condition_type='fish_count',
            condition_value=1,
            reward_money=Decimal('100.00'),
            reward_experience=50,
        )

        # Ещё не поймали
        unlocked = self.svc.check_achievements(player)
        assert len(unlocked) == 0

        # Поймали рыбу
        CaughtFish.objects.create(
            player=player, species=fish_species,
            weight=1.0, length=20.0, location=location,
        )

        unlocked = self.svc.check_achievements(player)
        assert len(unlocked) == 1
        assert unlocked[0].achievement == achievement

    def test_achievement_rewards_applied(self, player, fish_species, location):
        """Награда за достижение начисляется игроку."""
        initial_money = player.money
        initial_exp = player.experience

        Achievement.objects.create(
            name='Первый улов',
            description='Поймайте первую рыбу',
            category='catch',
            condition_type='fish_count',
            condition_value=1,
            reward_money=Decimal('100.00'),
            reward_experience=50,
        )

        CaughtFish.objects.create(
            player=player, species=fish_species,
            weight=1.0, length=20.0, location=location,
        )

        self.svc.check_achievements(player)
        player.refresh_from_db()

        assert player.money == initial_money + Decimal('100.00')
        assert player.experience == initial_exp + 50

    def test_species_count_achievement(self, player, location):
        """Достижение за количество видов рыбы."""
        achievement = Achievement.objects.create(
            name='Коллекционер',
            description='Поймайте 3 разных вида',
            category='catch',
            condition_type='species_count',
            condition_value=3,
        )

        from apps.tackle.models import FishSpecies

        species1 = FishSpecies.objects.create(
            name_ru='Вид 1', weight_min=0.1, weight_max=1.0,
            length_min=5, length_max=20, sell_price_per_kg=10,
        )
        species2 = FishSpecies.objects.create(
            name_ru='Вид 2', weight_min=0.1, weight_max=1.0,
            length_min=5, length_max=20, sell_price_per_kg=10,
        )
        species3 = FishSpecies.objects.create(
            name_ru='Вид 3', weight_min=0.1, weight_max=1.0,
            length_min=5, length_max=20, sell_price_per_kg=10,
        )

        CaughtFish.objects.create(player=player, species=species1, weight=0.5, length=10, location=location)
        CaughtFish.objects.create(player=player, species=species2, weight=0.5, length=10, location=location)

        unlocked = self.svc.check_achievements(player)
        assert len(unlocked) == 0

        CaughtFish.objects.create(player=player, species=species3, weight=0.5, length=10, location=location)

        unlocked = self.svc.check_achievements(player)
        assert len(unlocked) == 1
        assert unlocked[0].achievement == achievement

    def test_total_weight_achievement(self, player, fish_species, location):
        """Достижение за суммарный вес улова."""
        achievement = Achievement.objects.create(
            name='Центнер',
            description='Поймайте 100 кг рыбы',
            category='catch',
            condition_type='total_weight',
            condition_value=100,
        )

        CaughtFish.objects.create(player=player, species=fish_species, weight=50.0, length=50, location=location)
        unlocked = self.svc.check_achievements(player)
        assert len(unlocked) == 0

        CaughtFish.objects.create(player=player, species=fish_species, weight=50.0, length=50, location=location)
        unlocked = self.svc.check_achievements(player)
        assert len(unlocked) == 1

    def test_rank_achievement(self, player):
        """Достижение за ранг."""
        achievement = Achievement.objects.create(
            name='Опытный рыбак',
            description='Достигните 10 разряда',
            category='progress',
            condition_type='rank',
            condition_value=10,
        )

        player.rank = 9
        player.save()
        unlocked = self.svc.check_achievements(player)
        assert len(unlocked) == 0

        player.rank = 10
        player.save()
        unlocked = self.svc.check_achievements(player)
        assert len(unlocked) == 1

    def test_karma_achievement(self, player):
        """Достижение за карму."""
        achievement = Achievement.objects.create(
            name='Добрая душа',
            description='Наберите 500 кармы',
            category='karma',
            condition_type='karma',
            condition_value=500,
        )

        player.karma = 499
        player.save()
        unlocked = self.svc.check_achievements(player)
        assert len(unlocked) == 0

        player.karma = 500
        player.save()
        unlocked = self.svc.check_achievements(player)
        assert len(unlocked) == 1

    def test_quest_count_achievement(self, player):
        """Достижение за количество выполненных квестов."""
        achievement = Achievement.objects.create(
            name='Квестоман',
            description='Выполните 5 квестов',
            category='quest',
            condition_type='quest_count',
            condition_value=5,
        )

        # Создаём выполненные квесты
        for i in range(4):
            quest = Quest.objects.create(
                name=f'Квест {i}',
                description='Тест',
                quest_type='catch_fish',
                target_count=1,
            )
            PlayerQuest.objects.create(
                player=player, quest=quest, status='completed',
            )

        unlocked = self.svc.check_achievements(player)
        assert len(unlocked) == 0

        quest = Quest.objects.create(
            name='Квест 5', description='Тест',
            quest_type='catch_fish', target_count=1,
        )
        PlayerQuest.objects.create(player=player, quest=quest, status='completed')

        unlocked = self.svc.check_achievements(player)
        assert len(unlocked) == 1

    def test_record_achievement(self, player, fish_species, location):
        """Достижение за установленные рекорды."""
        achievement = Achievement.objects.create(
            name='Рекордсмен',
            description='Установите 3 рекорда',
            category='record',
            condition_type='record',
            condition_value=3,
        )

        from apps.tackle.models import FishSpecies

        for i in range(2):
            species = FishSpecies.objects.create(
                name_ru=f'Вид {i}', weight_min=0.1, weight_max=1.0,
                length_min=5, length_max=20, sell_price_per_kg=10,
            )
            FishRecord.objects.create(
                player=player, species=species,
                weight=1.0, length=20.0, location=location,
            )

        unlocked = self.svc.check_achievements(player)
        assert len(unlocked) == 0

        species = FishSpecies.objects.create(
            name_ru='Вид 3', weight_min=0.1, weight_max=1.0,
            length_min=5, length_max=20, sell_price_per_kg=10,
        )
        FishRecord.objects.create(
            player=player, species=species,
            weight=1.0, length=20.0, location=location,
        )

        unlocked = self.svc.check_achievements(player)
        assert len(unlocked) == 1

    def test_achievement_not_duplicated(self, player, fish_species, location):
        """Достижение не выдаётся повторно."""
        achievement = Achievement.objects.create(
            name='Первый улов',
            description='Поймайте первую рыбу',
            category='catch',
            condition_type='fish_count',
            condition_value=1,
        )

        CaughtFish.objects.create(
            player=player, species=fish_species,
            weight=1.0, length=20.0, location=location,
        )

        # Первая проверка
        unlocked = self.svc.check_achievements(player)
        assert len(unlocked) == 1

        # Вторая проверка
        unlocked = self.svc.check_achievements(player)
        assert len(unlocked) == 0

    def test_multiple_achievements_unlocked(self, player, fish_species, location):
        """Можно получить несколько достижений за раз."""
        ach1 = Achievement.objects.create(
            name='Первый улов', description='Поймайте первую рыбу',
            category='catch', condition_type='fish_count', condition_value=1,
        )
        ach2 = Achievement.objects.create(
            name='Новичок', description='Достигните 1 разряда',
            category='progress', condition_type='rank', condition_value=1,
        )

        CaughtFish.objects.create(
            player=player, species=fish_species,
            weight=1.0, length=20.0, location=location,
        )
        player.rank = 1
        player.save()

        unlocked = self.svc.check_achievements(player)
        assert len(unlocked) == 2
