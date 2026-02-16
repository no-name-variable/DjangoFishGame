"""Юнит-тесты для сервисов quests (update_quest_progress)."""

import pytest
from decimal import Decimal

from apps.quests.services import update_quest_progress
from apps.quests.models import Quest, PlayerQuest


@pytest.mark.django_db
class TestUpdateQuestProgress:
    """Тесты обновления прогресса квестов."""

    def test_catch_fish_any_species(self, player, fish_species, location):
        """Квест на поимку любой рыбы."""
        quest = Quest.objects.create(
            name='Поймай 3 рыбы',
            description='Поймайте 3 рыбы любого вида',
            quest_type='catch_fish',
            target_count=3,
        )
        pq = PlayerQuest.objects.create(player=player, quest=quest)

        # Первая рыба
        completed = update_quest_progress(player, fish_species, 1.0, location)
        pq.refresh_from_db()
        assert pq.progress == 1
        assert pq.status == 'active'
        assert len(completed) == 0

        # Вторая рыба
        update_quest_progress(player, fish_species, 1.5, location)
        pq.refresh_from_db()
        assert pq.progress == 2

        # Третья рыба — завершение
        completed = update_quest_progress(player, fish_species, 2.0, location)
        pq.refresh_from_db()
        assert pq.progress == 3
        assert pq.status == 'completed'
        assert len(completed) == 1
        assert completed[0] == pq

    def test_catch_fish_specific_species(self, player, location):
        """Квест на поимку конкретного вида."""
        from apps.tackle.models import FishSpecies

        target_species = FishSpecies.objects.create(
            name_ru='Карп', weight_min=1.0, weight_max=10.0,
            length_min=20, length_max=60, sell_price_per_kg=Decimal('20.00'),
        )
        other_species = FishSpecies.objects.create(
            name_ru='Окунь', weight_min=0.1, weight_max=1.0,
            length_min=10, length_max=25, sell_price_per_kg=Decimal('15.00'),
        )

        quest = Quest.objects.create(
            name='Поймай 2 карпа',
            description='Поймайте 2 карпа',
            quest_type='catch_fish',
            target_species=target_species,
            target_count=2,
        )
        pq = PlayerQuest.objects.create(player=player, quest=quest)

        # Окунь не засчитывается
        update_quest_progress(player, other_species, 0.5, location)
        pq.refresh_from_db()
        assert pq.progress == 0

        # Карп засчитывается
        update_quest_progress(player, target_species, 3.0, location)
        pq.refresh_from_db()
        assert pq.progress == 1

        # Второй карп — завершение
        completed = update_quest_progress(player, target_species, 4.0, location)
        pq.refresh_from_db()
        assert pq.progress == 2
        assert pq.status == 'completed'
        assert len(completed) == 1

    def test_catch_weight_cumulative(self, player, fish_species, location):
        """Квест на набор суммарного веса."""
        quest = Quest.objects.create(
            name='Наберите 10 кг',
            description='Поймайте рыбу общим весом 10 кг',
            quest_type='catch_weight',
            target_weight=Decimal('10.0'),
        )
        pq = PlayerQuest.objects.create(player=player, quest=quest)

        # Первая рыба 3 кг
        update_quest_progress(player, fish_species, Decimal('3.0'), location)
        pq.refresh_from_db()
        assert pq.progress_weight == Decimal('3.0')
        assert pq.status == 'active'

        # Вторая рыба 5 кг
        update_quest_progress(player, fish_species, Decimal('5.0'), location)
        pq.refresh_from_db()
        assert pq.progress_weight == Decimal('8.0')

        # Третья рыба 2 кг — завершение
        completed = update_quest_progress(player, fish_species, Decimal('2.0'), location)
        pq.refresh_from_db()
        assert pq.progress_weight == Decimal('10.0')
        assert pq.status == 'completed'
        assert len(completed) == 1

    def test_catch_weight_specific_species(self, player, location):
        """Квест на вес конкретного вида."""
        from apps.tackle.models import FishSpecies

        target_species = FishSpecies.objects.create(
            name_ru='Щука', weight_min=1.0, weight_max=15.0,
            length_min=30, length_max=100, sell_price_per_kg=Decimal('25.00'),
        )
        other_species = FishSpecies.objects.create(
            name_ru='Плотва', weight_min=0.1, weight_max=0.5,
            length_min=10, length_max=20, sell_price_per_kg=Decimal('10.00'),
        )

        quest = Quest.objects.create(
            name='5 кг щуки',
            description='Поймайте щуку общим весом 5 кг',
            quest_type='catch_weight',
            target_species=target_species,
            target_weight=Decimal('5.0'),
        )
        pq = PlayerQuest.objects.create(player=player, quest=quest)

        # Плотва не засчитывается
        update_quest_progress(player, other_species, Decimal('0.3'), location)
        pq.refresh_from_db()
        assert pq.progress_weight == Decimal('0.0')

        # Щука засчитывается
        update_quest_progress(player, target_species, Decimal('3.0'), location)
        pq.refresh_from_db()
        assert pq.progress_weight == Decimal('3.0')

        update_quest_progress(player, target_species, Decimal('2.0'), location)
        pq.refresh_from_db()
        assert pq.progress_weight == Decimal('5.0')
        assert pq.status == 'completed'

    def test_catch_species_quest(self, player, location):
        """Квест на поимку конкретного вида (синоним catch_fish с target_species)."""
        from apps.tackle.models import FishSpecies

        target_species = FishSpecies.objects.create(
            name_ru='Сом', weight_min=5.0, weight_max=50.0,
            length_min=50, length_max=200, sell_price_per_kg=Decimal('30.00'),
        )
        other_species = FishSpecies.objects.create(
            name_ru='Лещ', weight_min=0.5, weight_max=3.0,
            length_min=20, length_max=50, sell_price_per_kg=Decimal('18.00'),
        )

        quest = Quest.objects.create(
            name='Поймай сома',
            description='Поймайте 1 сома',
            quest_type='catch_species',
            target_species=target_species,
            target_count=1,
        )
        pq = PlayerQuest.objects.create(player=player, quest=quest)

        # Лещ не засчитывается
        update_quest_progress(player, other_species, Decimal('1.5'), location)
        pq.refresh_from_db()
        assert pq.progress == 0

        # Сом засчитывается
        completed = update_quest_progress(player, target_species, Decimal('10.0'), location)
        pq.refresh_from_db()
        assert pq.progress == 1
        assert pq.status == 'completed'
        assert len(completed) == 1

    def test_target_location_filtering(self, player, fish_species):
        """Квест на поимку в конкретной локации."""
        from apps.world.models import Location

        target_location = Location.objects.create(
            base=player.current_base,
            name='Целевая локация',
            description='Тест',
        )
        other_location = Location.objects.create(
            base=player.current_base,
            name='Другая локация',
            description='Тест',
        )

        quest = Quest.objects.create(
            name='Поймай на озере',
            description='Поймайте 2 рыбы на целевой локации',
            quest_type='catch_fish',
            target_location=target_location,
            target_count=2,
        )
        pq = PlayerQuest.objects.create(player=player, quest=quest)

        # В другой локации не засчитывается
        update_quest_progress(player, fish_species, Decimal('1.0'), other_location)
        pq.refresh_from_db()
        assert pq.progress == 0

        # В целевой локации засчитывается
        update_quest_progress(player, fish_species, Decimal('1.0'), target_location)
        pq.refresh_from_db()
        assert pq.progress == 1

        completed = update_quest_progress(player, fish_species, Decimal('1.0'), target_location)
        pq.refresh_from_db()
        assert pq.progress == 2
        assert pq.status == 'completed'
        assert len(completed) == 1

    def test_multiple_active_quests(self, player, fish_species, location):
        """Несколько активных квестов обновляются одновременно."""
        quest1 = Quest.objects.create(
            name='Квест 1', description='Поймайте 1 рыбу',
            quest_type='catch_fish', target_count=1,
        )
        quest2 = Quest.objects.create(
            name='Квест 2', description='Наберите 2 кг',
            quest_type='catch_weight', target_weight=Decimal('2.0'),
        )

        pq1 = PlayerQuest.objects.create(player=player, quest=quest1)
        pq2 = PlayerQuest.objects.create(player=player, quest=quest2)

        completed = update_quest_progress(player, fish_species, Decimal('2.5'), location)

        pq1.refresh_from_db()
        pq2.refresh_from_db()

        # Оба квеста обновились
        assert pq1.progress == 1
        assert pq1.status == 'completed'
        assert pq2.progress_weight == Decimal('2.5')
        assert pq2.status == 'completed'

        # Оба квеста завершены
        assert len(completed) == 2

    def test_completed_quest_not_updated(self, player, fish_species, location):
        """Завершённый квест не обновляется."""
        quest = Quest.objects.create(
            name='Квест', description='Поймайте 1 рыбу',
            quest_type='catch_fish', target_count=1,
        )
        pq = PlayerQuest.objects.create(
            player=player, quest=quest, status='completed', progress=1,
        )

        update_quest_progress(player, fish_species, Decimal('1.0'), location)
        pq.refresh_from_db()

        # Прогресс не изменился
        assert pq.progress == 1

    def test_claimed_quest_not_updated(self, player, fish_species, location):
        """Полученный квест не обновляется."""
        quest = Quest.objects.create(
            name='Квест', description='Поймайте 1 рыбу',
            quest_type='catch_fish', target_count=1,
        )
        pq = PlayerQuest.objects.create(
            player=player, quest=quest, status='claimed', progress=1,
        )

        update_quest_progress(player, fish_species, Decimal('1.0'), location)
        pq.refresh_from_db()

        # Прогресс не изменился
        assert pq.progress == 1

    def test_no_active_quests(self, player, fish_species, location):
        """Без активных квестов ничего не обновляется."""
        completed = update_quest_progress(player, fish_species, Decimal('1.0'), location)
        assert len(completed) == 0

    def test_completed_at_timestamp(self, player, fish_species, location):
        """При завершении квеста устанавливается completed_at."""
        quest = Quest.objects.create(
            name='Квест', description='Поймайте 1 рыбу',
            quest_type='catch_fish', target_count=1,
        )
        pq = PlayerQuest.objects.create(player=player, quest=quest)

        assert pq.completed_at is None

        update_quest_progress(player, fish_species, Decimal('1.0'), location)
        pq.refresh_from_db()

        assert pq.completed_at is not None
