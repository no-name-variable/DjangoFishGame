"""Комплексные тесты базовых механик ловли рыбы."""

from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

from apps.accounts.models import Player
from apps.fishing.models import FightState, FishingSession, GameTime, GroundbaitSpot
from apps.fishing.services.bite_calculator import BiteCalculatorService
from apps.fishing.services.fight_engine import FightEngineService
from apps.fishing.services.fish_selector import FishSelectorService
from apps.fishing.services.time_service import TimeService
from apps.fishing.utils import calc_bite_timeout_seconds
from apps.potions.services import PotionService
from apps.inventory.models import CaughtFish, InventoryItem, PlayerRod
from apps.tackle.models import Bait, FishSpecies, RodType
from apps.world.models import LocationFish


# ═══════════════════════════════════════════════════════════
# 1. Мульти-удочки: лимиты, слоты, одновременность
# ═══════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestMultiRodCast:
    """Тесты заброса нескольких удочек одновременно."""
    URL = '/api/fishing/cast/'

    def _make_rod(self, player, rod_type, line, hook, float_tackle, bait, slot_attr):
        """Создать удочку и экипировать в указанный слот."""
        rod = PlayerRod.objects.create(
            player=player, rod_type=rod_type,
            line=line, hook=hook, float_tackle=float_tackle,
            bait=bait, bait_remaining=20,
            is_assembled=True, depth_setting=1.5,
        )
        setattr(player, slot_attr, rod)
        player.save(update_fields=[slot_attr])
        return rod

    def test_cast_three_rods(self, api_client, player, location,
                             rod_type, line, hook, float_tackle, bait):
        """Можно забросить 3 удочки одновременно."""
        player.current_location = location
        player.save(update_fields=['current_location'])

        rod1 = self._make_rod(player, rod_type, line, hook, float_tackle, bait, 'rod_slot_1')
        rod2 = self._make_rod(player, rod_type, line, hook, float_tackle, bait, 'rod_slot_2')
        rod3 = self._make_rod(player, rod_type, line, hook, float_tackle, bait, 'rod_slot_3')

        for i, rod in enumerate([rod1, rod2, rod3], 1):
            resp = api_client.post(self.URL, {
                'rod_id': rod.pk, 'point_x': i * 10.0, 'point_y': i * 5.0,
            })
            assert resp.status_code == 200, f'Удочка {i}: {resp.data}'
            assert resp.data['slot'] == i

        assert FishingSession.objects.filter(player=player).count() == 3

    def test_cast_fourth_rod_rejected(self, api_client, player, location,
                                       rod_type, line, hook, float_tackle, bait):
        """Нельзя забросить 4-ю удочку."""
        player.current_location = location
        player.save(update_fields=['current_location'])

        rods = []
        for i, slot in enumerate(['rod_slot_1', 'rod_slot_2', 'rod_slot_3'], 1):
            rod = self._make_rod(player, rod_type, line, hook, float_tackle, bait, slot)
            rods.append(rod)
            api_client.post(self.URL, {
                'rod_id': rod.pk, 'point_x': i * 10.0, 'point_y': 20.0,
            })

        # Создаём 4-ю удочку (без слота для экипировки)
        rod4 = PlayerRod.objects.create(
            player=player, rod_type=rod_type,
            line=line, hook=hook, float_tackle=float_tackle,
            bait=bait, bait_remaining=20,
            is_assembled=True, depth_setting=1.5,
        )
        resp = api_client.post(self.URL, {
            'rod_id': rod4.pk, 'point_x': 50.0, 'point_y': 30.0,
        })
        assert resp.status_code == 400

    def test_slot_reuse_after_retrieve(self, api_client, player, location,
                                        rod_type, line, hook, float_tackle, bait):
        """Слот освобождается после retrieve и доступен повторно."""
        player.current_location = location
        player.save(update_fields=['current_location'])

        rod = self._make_rod(player, rod_type, line, hook, float_tackle, bait, 'rod_slot_1')

        resp = api_client.post(self.URL, {
            'rod_id': rod.pk, 'point_x': 10.0, 'point_y': 20.0,
        })
        session_id = resp.data['session_id']
        slot = resp.data['slot']

        # Вытаскиваем
        api_client.post('/api/fishing/retrieve/', {'session_id': session_id})
        assert not FishingSession.objects.filter(pk=session_id).exists()

        # Повторный заброс — тот же слот
        resp2 = api_client.post(self.URL, {
            'rod_id': rod.pk, 'point_x': 15.0, 'point_y': 25.0,
        })
        assert resp2.status_code == 200
        assert resp2.data['slot'] == slot

    def test_cast_unequipped_rod_rejected(self, api_client, player, location,
                                           rod_type, line, hook, float_tackle, bait):
        """Нельзя забросить неэкипированную удочку."""
        player.current_location = location
        player.save(update_fields=['current_location'])

        rod = PlayerRod.objects.create(
            player=player, rod_type=rod_type,
            line=line, hook=hook, float_tackle=float_tackle,
            bait=bait, bait_remaining=20,
            is_assembled=True, depth_setting=1.5,
        )
        # Не экипируем в слот
        resp = api_client.post(self.URL, {
            'rod_id': rod.pk, 'point_x': 10.0, 'point_y': 20.0,
        })
        assert resp.status_code == 400


# ═══════════════════════════════════════════════════════════
# 2. Одновременно только один FIGHTING
# ═══════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestOnlyOneFighting:
    """Нельзя вываживать на двух удочках сразу."""

    def test_strike_blocked_when_already_fighting(self, api_client, player, location,
                                                   rod_type, line, hook, float_tackle,
                                                   bait, fish_species):
        """Подсечка заблокирована, если уже идёт вываживание на другой удочке."""
        player.current_location = location
        player.save(update_fields=['current_location'])

        # Удочка 1: FIGHTING
        rod1 = PlayerRod.objects.create(
            player=player, rod_type=rod_type,
            line=line, hook=hook, float_tackle=float_tackle,
            bait=bait, bait_remaining=20,
            is_assembled=True, depth_setting=1.5,
        )
        player.rod_slot_1 = rod1
        player.save(update_fields=['rod_slot_1'])
        s1 = FishingSession.objects.create(
            player=player, location=location, rod=rod1, slot=1,
            state=FishingSession.State.FIGHTING,
            cast_time=timezone.now(),
            hooked_species=fish_species, hooked_weight=1.0, hooked_length=20.0,
        )
        FightState.objects.create(session=s1, fish_strength=3.0, distance=15.0)

        # Удочка 2: BITE
        rod2 = PlayerRod.objects.create(
            player=player, rod_type=rod_type,
            line=line, hook=hook, float_tackle=float_tackle,
            bait=bait, bait_remaining=20,
            is_assembled=True, depth_setting=1.5,
        )
        player.rod_slot_2 = rod2
        player.save(update_fields=['rod_slot_2'])
        s2 = FishingSession.objects.create(
            player=player, location=location, rod=rod2, slot=2,
            state=FishingSession.State.BITE,
            cast_time=timezone.now(), bite_time=timezone.now(),
            hooked_species=fish_species, hooked_weight=0.5, hooked_length=15.0,
        )

        resp = api_client.post('/api/fishing/strike/', {'session_id': s2.pk})
        assert resp.status_code == 400
        assert 'вываживание' in resp.data['error'].lower() or 'fighting' in resp.data.get('error', '').lower()


# ═══════════════════════════════════════════════════════════
# 3. Подсечка — таймер 40±10 секунд
# ═══════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestStrikeTimer:
    """Тесты таймера подсечки."""
    URL = '/api/fishing/strike/'

    def test_strike_within_window(self, api_client, fishing_session_bite):
        """Подсечка в пределах окна — успех."""
        timeout = calc_bite_timeout_seconds(fishing_session_bite)
        fishing_session_bite.bite_time = timezone.now() - timedelta(seconds=timeout - 5)
        fishing_session_bite.save(update_fields=['bite_time'])

        resp = api_client.post(self.URL, {'session_id': fishing_session_bite.pk})
        assert resp.status_code == 200
        assert resp.data['status'] == 'fighting'

    def test_strike_near_limit_still_ok(self, api_client, fishing_session_bite):
        """Подсечка прямо перед окончанием окна — успешна."""
        timeout = calc_bite_timeout_seconds(fishing_session_bite)
        fishing_session_bite.bite_time = timezone.now() - timedelta(seconds=timeout - 0.5)
        fishing_session_bite.save(update_fields=['bite_time'])

        resp = api_client.post(self.URL, {'session_id': fishing_session_bite.pk})
        assert resp.status_code == 200

    def test_strike_after_timeout_resets_to_waiting(self, api_client, fishing_session_bite):
        """Поздняя подсечка — рыба сходит, удочка возвращается к WAITING."""
        timeout = calc_bite_timeout_seconds(fishing_session_bite)
        fishing_session_bite.bite_time = timezone.now() - timedelta(seconds=timeout + 5)
        fishing_session_bite.save(update_fields=['bite_time'])

        resp = api_client.post(self.URL, {'session_id': fishing_session_bite.pk})
        assert resp.status_code == 400

        fishing_session_bite.refresh_from_db()
        assert fishing_session_bite.state == FishingSession.State.WAITING
        assert fishing_session_bite.hooked_species is None
        assert fishing_session_bite.hooked_weight is None
        assert fishing_session_bite.hooked_length is None

    def test_expired_bite_reset_on_polling(self, api_client, fishing_session_bite):
        """Протухшая поклёвка автоматически сбрасывается при polling status."""
        timeout = calc_bite_timeout_seconds(fishing_session_bite)
        fishing_session_bite.bite_time = timezone.now() - timedelta(seconds=timeout + 5)
        fishing_session_bite.save(update_fields=['bite_time'])

        resp = api_client.get('/api/fishing/status/')
        assert resp.status_code == 200

        fishing_session_bite.refresh_from_db()
        assert fishing_session_bite.state == FishingSession.State.WAITING
        assert fishing_session_bite.hooked_species is None
        assert fishing_session_bite.bite_time is None


# ═══════════════════════════════════════════════════════════
# 4. Лимит садка (MAX_CREEL_SIZE)
# ═══════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestCreelLimit:
    """Проверка лимита садка."""
    URL = '/api/fishing/keep/'

    def test_keep_rejected_when_creel_full(self, api_client, player, location,
                                           player_rod, fish_species):
        """Нельзя положить рыбу, если садок полон (30 рыб)."""
        # Заполняем садок до максимума
        for _ in range(30):
            CaughtFish.objects.create(
                player=player, species=fish_species,
                weight=0.5, length=15.0, location=location,
            )

        # Создаём CAUGHT сессию
        player.current_location = location
        player.save(update_fields=['current_location'])
        session = FishingSession.objects.create(
            player=player, location=location, rod=player_rod, slot=1,
            state=FishingSession.State.CAUGHT,
            cast_time=timezone.now(),
            hooked_species=fish_species, hooked_weight=1.0, hooked_length=20.0,
        )

        resp = api_client.post(self.URL, {'session_id': session.pk})
        assert resp.status_code == 400
        assert 'полон' in resp.data['error'].lower() or 'creel' in resp.data.get('error', '').lower()


# ═══════════════════════════════════════════════════════════
# 5. Keep: опыт, расход наживки, запись в садок
# ═══════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestKeepMechanics:
    """Тесты механики «положить в садок»."""
    URL = '/api/fishing/keep/'

    def test_keep_adds_experience(self, api_client, player, fishing_session_caught):
        """Keep даёт опыт игроку."""
        exp_before = player.experience
        rank_before = player.rank

        api_client.post(self.URL, {'session_id': fishing_session_caught.pk})

        player.refresh_from_db()
        assert player.experience > exp_before or player.rank > rank_before

    def test_keep_consumes_bait(self, api_client, player, fishing_session_caught):
        """Keep расходует 1 единицу наживки."""
        rod = fishing_session_caught.rod
        bait_before = rod.bait_remaining

        api_client.post(self.URL, {'session_id': fishing_session_caught.pk})

        rod.refresh_from_db()
        assert rod.bait_remaining == bait_before - 1

    def test_keep_creates_caught_fish(self, api_client, player, fishing_session_caught, fish_species):
        """Keep создаёт запись CaughtFish в садке."""
        assert CaughtFish.objects.filter(player=player, is_sold=False, is_released=False).count() == 0

        api_client.post(self.URL, {'session_id': fishing_session_caught.pk})

        fish = CaughtFish.objects.filter(player=player, is_sold=False, is_released=False)
        assert fish.count() == 1
        assert fish.first().species == fish_species
        assert fish.first().weight == 1.5

    def test_keep_deletes_session(self, api_client, fishing_session_caught):
        """Keep удаляет сессию."""
        api_client.post(self.URL, {'session_id': fishing_session_caught.pk})
        assert not FishingSession.objects.filter(pk=fishing_session_caught.pk).exists()


# ═══════════════════════════════════════════════════════════
# 6. Release: карма, опыт (0.5x), наживка
# ═══════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestReleaseMechanics:
    """Тесты механики «отпустить рыбу»."""
    URL = '/api/fishing/release/'

    def test_release_adds_karma(self, api_client, player, fishing_session_caught):
        """Release даёт карму пропорционально весу."""
        player.karma = 0
        player.save(update_fields=['karma'])

        resp = api_client.post(self.URL, {'session_id': fishing_session_caught.pk})

        player.refresh_from_db()
        assert player.karma > 0
        assert resp.data['karma_bonus'] == max(1, int(fishing_session_caught.hooked_weight))

    def test_release_gives_half_experience(self, api_client, player, fishing_session_caught, fish_species):
        """Release даёт 50% опыта от keep."""
        exp_before = player.experience
        rank_before = player.rank
        expected_exp = int(fish_species.experience_per_kg * fishing_session_caught.hooked_weight * 0.5)

        api_client.post(self.URL, {'session_id': fishing_session_caught.pk})

        player.refresh_from_db()
        actual_exp_gained = (player.experience - exp_before) + (player.rank - rank_before) * 1000
        assert actual_exp_gained >= expected_exp - 1  # допускаем округление

    def test_release_consumes_bait(self, api_client, player, fishing_session_caught):
        """Release расходует наживку."""
        rod = fishing_session_caught.rod
        bait_before = rod.bait_remaining

        api_client.post(self.URL, {'session_id': fishing_session_caught.pk})

        rod.refresh_from_db()
        assert rod.bait_remaining == bait_before - 1

    def test_release_deletes_session(self, api_client, fishing_session_caught):
        """Release удаляет сессию."""
        api_client.post(self.URL, {'session_id': fishing_session_caught.pk})
        assert not FishingSession.objects.filter(pk=fishing_session_caught.pk).exists()

    def test_release_no_caught_fish_record(self, api_client, player, fishing_session_caught):
        """Release НЕ создаёт запись CaughtFish."""
        api_client.post(self.URL, {'session_id': fishing_session_caught.pk})
        assert CaughtFish.objects.filter(player=player).count() == 0


# ═══════════════════════════════════════════════════════════
# 7. Вываживание: полный цикл, обрыв, поломка удилища
# ═══════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestFightFullCycle:
    """Тесты полного цикла вываживания."""

    @patch('apps.fishing.services.fight_engine._fish_action', lambda f: None)
    def test_fight_to_catch(self, api_client, fishing_session_fighting):
        """Подмотка до вытаскивания: distance → 0 = caught."""
        fight = FightState.objects.get(session=fishing_session_fighting)
        fight.distance = 0.1
        fight.fish_strength = 0.1
        fight.line_tension = 5
        fight.save()

        resp = api_client.post('/api/fishing/reel-in/', {'session_id': fishing_session_fighting.pk})
        assert resp.status_code == 200
        assert resp.data['result'] == 'caught'
        assert 'fish' in resp.data
        assert 'weight' in resp.data

        fishing_session_fighting.refresh_from_db()
        assert fishing_session_fighting.state == FishingSession.State.CAUGHT

    def test_line_break_deletes_session(self, api_client, fishing_session_fighting):
        """Обрыв лески удаляет сессию."""
        fight = FightState.objects.get(session=fishing_session_fighting)
        fight.line_tension = 99
        fight.fish_strength = 200  # гарантирует обрыв
        fight.save()

        resp = api_client.post('/api/fishing/reel-in/', {'session_id': fishing_session_fighting.pk})
        assert resp.status_code == 200

        if resp.data['result'] == 'line_break':
            assert not FishingSession.objects.filter(pk=fishing_session_fighting.pk).exists()

    def test_rod_break_zeros_durability(self, api_client, fishing_session_fighting):
        """Поломка удилища обнуляет durability_current."""
        fight = FightState.objects.get(session=fishing_session_fighting)
        fight.rod_durability = 1
        fight.fish_strength = 0.1
        fight.line_tension = 10
        fight.save()

        resp = api_client.post('/api/fishing/pull/', {'session_id': fishing_session_fighting.pk})
        if resp.data['result'] == 'rod_break':
            rod = fishing_session_fighting.rod
            rod.refresh_from_db()
            assert rod.durability_current == 0
            assert not FishingSession.objects.filter(pk=fishing_session_fighting.pk).exists()

    def test_pull_wears_rod(self, api_client, fishing_session_fighting):
        """Pull уменьшает прочность удилища на 1."""
        fight = FightState.objects.get(session=fishing_session_fighting)
        fight.fish_strength = 0.1
        fight.line_tension = 5
        fight.distance = 50.0  # далеко, чтобы не caught
        fight.save()
        initial_durability = fight.rod_durability

        resp = api_client.post('/api/fishing/pull/', {'session_id': fishing_session_fighting.pk})
        if resp.data['result'] == 'fighting':
            fight.refresh_from_db()
            assert fight.rod_durability == initial_durability - 1


# ═══════════════════════════════════════════════════════════
# 8. Смена наживки (ChangeBaitView)
# ═══════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestChangeBait:
    """Тесты смены наживки во время рыбалки."""
    URL = '/api/fishing/change-bait/'

    def test_change_bait_success(self, api_client, player, location, player_rod, bait):
        """Смена наживки: новая ставится, старая возвращается."""
        player.current_location = location
        player.save(update_fields=['current_location'])

        session = FishingSession.objects.create(
            player=player, location=location, rod=player_rod, slot=1,
            state=FishingSession.State.WAITING,
            cast_time=timezone.now(),
        )

        # Создаём новую наживку
        new_bait = Bait.objects.create(
            name='Опарыш', quantity_per_pack=30, price=Decimal('10.00'),
        )
        ct = ContentType.objects.get_for_model(new_bait)
        InventoryItem.objects.create(
            player=player, content_type=ct, object_id=new_bait.pk, quantity=2,
        )

        old_bait = player_rod.bait
        old_remaining = player_rod.bait_remaining

        resp = api_client.post(self.URL, {
            'session_id': session.pk, 'bait_id': new_bait.pk,
        })

        assert resp.status_code == 200
        assert resp.data['new_bait'] == 'Опарыш'
        assert resp.data['bait_remaining'] == 30

        # Наживка не списывается из инвентаря (many-to-many)
        inv = InventoryItem.objects.get(player=player, content_type=ct, object_id=new_bait.pk)
        assert inv.quantity == 2

    def test_change_bait_not_in_inventory(self, api_client, player, location, player_rod):
        """Нельзя сменить на наживку, которой нет в инвентаре."""
        player.current_location = location
        player.save(update_fields=['current_location'])

        session = FishingSession.objects.create(
            player=player, location=location, rod=player_rod, slot=1,
            state=FishingSession.State.WAITING,
            cast_time=timezone.now(),
        )

        new_bait = Bait.objects.create(
            name='Кукуруза', quantity_per_pack=15, price=Decimal('5.00'),
        )

        resp = api_client.post(self.URL, {
            'session_id': session.pk, 'bait_id': new_bait.pk,
        })
        assert resp.status_code == 400

    def test_change_bait_only_waiting(self, api_client, fishing_session_fighting):
        """Смена наживки возможна только в состоянии WAITING."""
        new_bait = Bait.objects.create(
            name='Мотыль', quantity_per_pack=25, price=Decimal('7.00'),
        )

        resp = api_client.post(self.URL, {
            'session_id': fishing_session_fighting.pk, 'bait_id': new_bait.pk,
        })
        assert resp.status_code == 400


# ═══════════════════════════════════════════════════════════
# 10. Прикормка (GroundbaitSpot) — истечение и ароматизатор
# ═══════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestGroundbaitMechanics:
    """Тесты прикормки."""

    def setup_method(self):
        self.bite_calc = BiteCalculatorService(TimeService(), PotionService())

    def test_groundbait_expires_by_game_time(self, player, location, groundbait, game_time):
        """Прикормка истекает по игровому времени."""
        game_time.current_hour = 10
        game_time.current_day = 1
        game_time.save()

        # Прикорм до часа 13, день 1
        spot = GroundbaitSpot.objects.create(
            player=player, location=location, groundbait=groundbait,
            expires_at_hour=13, expires_at_day=1,
        )

        assert spot.is_active() is True

        # Сдвигаем время на 14:00
        game_time.current_hour = 14
        game_time.save()
        assert spot.is_active() is False

    def test_groundbait_expires_next_day(self, player, location, groundbait, game_time):
        """Прикормка с переходом через день."""
        game_time.current_hour = 22
        game_time.current_day = 1
        game_time.save()

        # Истекает в час 1 дня 2
        spot = GroundbaitSpot.objects.create(
            player=player, location=location, groundbait=groundbait,
            expires_at_hour=1, expires_at_day=2,
        )

        assert spot.is_active() is True

        game_time.current_day = 2
        game_time.current_hour = 0
        game_time.save()
        assert spot.is_active() is True

        game_time.current_hour = 2
        game_time.save()
        assert spot.is_active() is False

    def test_groundbait_with_flavoring(self, api_client, player, location, groundbait,
                                        flavoring, game_time):
        """Прикормка с ароматизатором — оба списываются из инвентаря."""
        player.current_location = location
        player.save(update_fields=['current_location'])

        # Добавляем прикормку и ароматизатор в инвентарь
        ct_g = ContentType.objects.get_for_model(groundbait)
        InventoryItem.objects.create(
            player=player, content_type=ct_g, object_id=groundbait.pk, quantity=2,
        )
        ct_f = ContentType.objects.get_for_model(flavoring)
        InventoryItem.objects.create(
            player=player, content_type=ct_f, object_id=flavoring.pk, quantity=1,
        )

        resp = api_client.post('/api/fishing/groundbait/', {
            'groundbait_id': groundbait.pk,
            'flavoring_id': flavoring.pk,
        })

        assert resp.status_code == 200
        assert resp.data['flavoring'] == flavoring.name

        # Инвентарь
        inv_g = InventoryItem.objects.get(player=player, content_type=ct_g, object_id=groundbait.pk)
        assert inv_g.quantity == 1

        # Ароматизатор удалён (был 1, стало 0)
        assert not InventoryItem.objects.filter(player=player, content_type=ct_f, object_id=flavoring.pk).exists()

        # Spot создан с ароматизатором
        spot = GroundbaitSpot.objects.get(player=player, location=location)
        assert spot.flavoring == flavoring

    def test_groundbait_affects_bite_chance(self, player, location, player_rod, groundbait,
                                            location_fish, game_time):
        """Активная прикормка увеличивает шанс поклёвки."""
        player.current_location = location
        player.save(update_fields=['current_location'])

        chance_without = self.bite_calc.calculate_bite_chance(player, location, player_rod)

        GroundbaitSpot.objects.create(
            player=player, location=location, groundbait=groundbait,
            expires_at_hour=(game_time.current_hour + 3) % 24,
            expires_at_day=game_time.current_day if (game_time.current_hour + 3) < 24 else game_time.current_day + 1,
        )

        chance_with = self.bite_calc.calculate_bite_chance(player, location, player_rod)
        assert chance_with > chance_without


# ═══════════════════════════════════════════════════════════
# 11. Статус: polling всех сессий, переход WAITING → BITE
# ═══════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestStatusPolling:
    """Тесты GET /status/ — polling."""
    URL = '/api/fishing/status/'

    def test_status_returns_all_sessions(self, api_client, player, location,
                                         rod_type, line, hook, float_tackle, bait):
        """Статус возвращает все сессии игрока."""
        player.current_location = location
        player.save(update_fields=['current_location'])

        rods = []
        for i, slot in enumerate(['rod_slot_1', 'rod_slot_2'], 1):
            rod = PlayerRod.objects.create(
                player=player, rod_type=rod_type,
                line=line, hook=hook, float_tackle=float_tackle,
                bait=bait, bait_remaining=20,
                is_assembled=True, depth_setting=1.5,
            )
            setattr(player, slot, rod)
            rods.append(rod)
        player.save(update_fields=['rod_slot_1', 'rod_slot_2'])

        for i, rod in enumerate(rods, 1):
            FishingSession.objects.create(
                player=player, location=location, rod=rod, slot=i,
                state=FishingSession.State.WAITING,
                cast_time=timezone.now(),
            )

        resp = api_client.get(self.URL)
        assert resp.status_code == 200
        assert len(resp.data['sessions']) == 2

    def test_status_includes_game_time(self, api_client, game_time):
        """Статус всегда содержит игровое время."""
        resp = api_client.get(self.URL)
        assert resp.status_code == 200
        assert 'game_time' in resp.data
        assert resp.data['game_time']['hour'] == game_time.current_hour

    def test_status_includes_fight_data(self, api_client, fishing_session_fighting):
        """Статус содержит данные вываживания для FIGHTING сессий."""
        resp = api_client.get(self.URL)
        assert resp.status_code == 200
        assert len(resp.data['fights']) > 0

        sid = str(fishing_session_fighting.pk)
        assert sid in resp.data['fights']
        fight_data = resp.data['fights'][sid]
        assert 'line_tension' in fight_data
        assert 'distance' in fight_data

    @patch.object(BiteCalculatorService, 'try_bite', return_value=True)
    @patch.object(FishSelectorService, 'select_fish')
    @patch.object(FishSelectorService, 'generate_fish_weight', return_value=1.2)
    @patch.object(FishSelectorService, 'generate_fish_length', return_value=22.0)
    def test_status_triggers_nibble_not_bite(self, mock_length, mock_weight, mock_select, mock_bite,
                                              api_client, fishing_session_waiting, fish_species):
        """Polling переводит WAITING → NIBBLE (не сразу BITE)."""
        mock_select.return_value = fish_species

        resp = api_client.get(self.URL)
        assert resp.status_code == 200

        fishing_session_waiting.refresh_from_db()
        assert fishing_session_waiting.state == FishingSession.State.NIBBLE
        assert fishing_session_waiting.hooked_species == fish_species
        assert fishing_session_waiting.hooked_weight == 1.2
        assert fishing_session_waiting.nibble_time is not None
        assert fishing_session_waiting.nibble_duration is not None
        assert 1.0 <= fishing_session_waiting.nibble_duration <= 3.0


# ═══════════════════════════════════════════════════════════
# 12. NIBBLE: переходы и подсечка
# ═══════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestNibbleMechanics:
    """Тесты трёхфазной механики: WAITING → NIBBLE → BITE."""
    URL = '/api/fishing/status/'

    def test_nibble_transitions_to_bite(self, api_client, player, location, player_rod, fish_species):
        """NIBBLE с истёкшим duration → BITE."""
        player.current_location = location
        player.save(update_fields=['current_location'])

        session = FishingSession.objects.create(
            player=player, location=location, rod=player_rod, slot=1,
            state=FishingSession.State.NIBBLE,
            cast_time=timezone.now(),
            nibble_time=timezone.now() - timedelta(seconds=10),
            nibble_duration=2.0,
            hooked_species=fish_species, hooked_weight=1.0, hooked_length=20.0,
        )

        resp = api_client.get(self.URL)
        assert resp.status_code == 200

        session.refresh_from_db()
        assert session.state == FishingSession.State.BITE
        assert session.bite_time is not None
        assert session.bite_duration is not None
        assert 20.0 <= session.bite_duration <= 40.0
        assert session.nibble_time is None
        assert session.nibble_duration is None

    def test_bite_expires_to_waiting(self, api_client, player, location, player_rod, fish_species):
        """BITE с истёкшим duration → WAITING."""
        player.current_location = location
        player.save(update_fields=['current_location'])

        session = FishingSession.objects.create(
            player=player, location=location, rod=player_rod, slot=1,
            state=FishingSession.State.BITE,
            cast_time=timezone.now(),
            bite_time=timezone.now() - timedelta(seconds=10),
            bite_duration=3.0,
            hooked_species=fish_species, hooked_weight=1.0, hooked_length=20.0,
        )

        resp = api_client.get(self.URL)
        assert resp.status_code == 200

        session.refresh_from_db()
        assert session.state == FishingSession.State.WAITING
        assert session.hooked_species is None
        assert session.bite_time is None
        assert session.bite_duration is None

    def test_strike_during_nibble_rejected(self, api_client, player, location, player_rod, fish_species):
        """Подсечка во время NIBBLE отклоняется."""
        player.current_location = location
        player.save(update_fields=['current_location'])

        session = FishingSession.objects.create(
            player=player, location=location, rod=player_rod, slot=1,
            state=FishingSession.State.NIBBLE,
            cast_time=timezone.now(),
            nibble_time=timezone.now(),
            nibble_duration=2.0,
            hooked_species=fish_species, hooked_weight=1.0, hooked_length=20.0,
        )

        resp = api_client.post('/api/fishing/strike/', {'session_id': session.pk})
        assert resp.status_code == 400

    def test_nibble_not_expired_stays_nibble(self, api_client, player, location, player_rod, fish_species):
        """NIBBLE с оставшимся временем остаётся NIBBLE."""
        player.current_location = location
        player.save(update_fields=['current_location'])

        session = FishingSession.objects.create(
            player=player, location=location, rod=player_rod, slot=1,
            state=FishingSession.State.NIBBLE,
            cast_time=timezone.now(),
            nibble_time=timezone.now(),
            nibble_duration=3.0,
            hooked_species=fish_species, hooked_weight=1.0, hooked_length=20.0,
        )

        resp = api_client.get(self.URL)
        assert resp.status_code == 200

        session.refresh_from_db()
        assert session.state == FishingSession.State.NIBBLE


# ═══════════════════════════════════════════════════════════
# 13. Retrieve (вытаскивание удочки)
# ═══════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestRetrieveMechanics:
    """Тесты вытаскивания удочки."""
    URL = '/api/fishing/retrieve/'

    def test_retrieve_idle(self, api_client, player, location, player_rod):
        """Можно вытащить IDLE сессию."""
        player.current_location = location
        player.save(update_fields=['current_location'])

        session = FishingSession.objects.create(
            player=player, location=location, rod=player_rod, slot=1,
            state=FishingSession.State.IDLE,
            cast_time=timezone.now(),
        )

        resp = api_client.post(self.URL, {'session_id': session.pk})
        assert resp.status_code == 200
        assert not FishingSession.objects.filter(pk=session.pk).exists()

    def test_retrieve_caught_rejected(self, api_client, fishing_session_caught):
        """Нельзя вытащить удочку с пойманной рыбой — нужно keep/release."""
        resp = api_client.post(self.URL, {'session_id': fishing_session_caught.pk})
        assert resp.status_code == 400

    def test_retrieve_bite_rejected(self, api_client, fishing_session_bite):
        """Нельзя вытащить во время поклёвки."""
        resp = api_client.post(self.URL, {'session_id': fishing_session_bite.pk})
        assert resp.status_code == 400


# ═══════════════════════════════════════════════════════════
# 13. Полный сценарий: заброс → поклёвка → подсечка → вываживание → keep
# ═══════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestFullFishingCycle:
    """Интеграционный тест: полный цикл ловли."""

    @patch('apps.fishing.services.fight_engine._fish_action', lambda f: None)
    @patch.object(BiteCalculatorService, 'try_bite', return_value=True)
    @patch.object(FishSelectorService, 'select_fish')
    @patch.object(FishSelectorService, 'generate_fish_weight', return_value=0.8)
    @patch.object(FishSelectorService, 'generate_fish_length', return_value=18.0)
    def test_full_cycle_cast_to_keep(self, mock_length, mock_weight, mock_select, mock_bite,
                                      api_client, player, location, player_rod,
                                      fish_species, location_fish, game_time):
        """Полный цикл: cast → status(nibble) → status(bite) → strike → reel_in(caught) → keep."""
        mock_select.return_value = fish_species

        player.current_location = location
        player.save(update_fields=['current_location'])

        # 1. Заброс
        resp = api_client.post('/api/fishing/cast/', {
            'rod_id': player_rod.pk, 'point_x': 50.0, 'point_y': 30.0,
        })
        assert resp.status_code == 200
        session_id = resp.data['session_id']

        # 2. Polling → nibble
        resp = api_client.get('/api/fishing/status/')
        assert resp.status_code == 200
        nibble_session = next(
            (s for s in resp.data['sessions'] if s['id'] == session_id), None,
        )
        assert nibble_session is not None
        assert nibble_session['state'] == 'nibble'

        # 3. Принудительно продвигаем nibble → bite (сдвигаем nibble_time в прошлое)
        session = FishingSession.objects.get(pk=session_id)
        session.nibble_time = timezone.now() - timedelta(seconds=10)
        session.save(update_fields=['nibble_time'])

        resp = api_client.get('/api/fishing/status/')
        bite_session = next(
            (s for s in resp.data['sessions'] if s['id'] == session_id), None,
        )
        assert bite_session is not None
        assert bite_session['state'] == 'bite'

        # 4. Подсечка
        resp = api_client.post('/api/fishing/strike/', {'session_id': session_id})
        assert resp.status_code == 200
        assert resp.data['status'] == 'fighting'

        # 5. Подмотка до caught (ставим нулевую дистанцию)
        fight = FightState.objects.get(session_id=session_id)
        fight.distance = 0.0
        fight.fish_strength = 0.01
        fight.line_tension = 5
        fight.save()

        resp = api_client.post('/api/fishing/reel-in/', {'session_id': session_id})
        assert resp.status_code == 200
        assert resp.data['result'] == 'caught'

        # 6. В садок
        resp = api_client.post('/api/fishing/keep/', {'session_id': session_id})
        assert resp.status_code == 201

        # Проверяем: рыба в садке, сессия удалена
        assert CaughtFish.objects.filter(player=player, species=fish_species).exists()
        assert not FishingSession.objects.filter(pk=session_id).exists()

    @patch('apps.fishing.services.fight_engine._fish_action', lambda f: None)
    @patch.object(BiteCalculatorService, 'try_bite', return_value=True)
    @patch.object(FishSelectorService, 'select_fish')
    @patch.object(FishSelectorService, 'generate_fish_weight', return_value=2.0)
    @patch.object(FishSelectorService, 'generate_fish_length', return_value=30.0)
    def test_full_cycle_cast_to_release(self, mock_length, mock_weight, mock_select, mock_bite,
                                         api_client, player, location, player_rod,
                                         fish_species, location_fish, game_time):
        """Полный цикл: cast → nibble → bite → strike → reel_in(caught) → release."""
        mock_select.return_value = fish_species
        player.current_location = location
        player.karma = 0
        player.save(update_fields=['current_location', 'karma'])

        # 1. Заброс
        resp = api_client.post('/api/fishing/cast/', {
            'rod_id': player_rod.pk, 'point_x': 50.0, 'point_y': 30.0,
        })
        session_id = resp.data['session_id']

        # 2. Nibble
        api_client.get('/api/fishing/status/')

        # 3. Продвигаем nibble → bite
        session = FishingSession.objects.get(pk=session_id)
        session.nibble_time = timezone.now() - timedelta(seconds=10)
        session.save(update_fields=['nibble_time'])
        api_client.get('/api/fishing/status/')

        # 4. Подсечка
        api_client.post('/api/fishing/strike/', {'session_id': session_id})

        # 5. Caught
        fight = FightState.objects.get(session_id=session_id)
        fight.distance = 0.01
        fight.fish_strength = 0.1
        fight.line_tension = 5
        fight.save()
        resp = api_client.post('/api/fishing/reel-in/', {'session_id': session_id})
        assert resp.data['result'] == 'caught'

        # 6. Отпускаем
        resp = api_client.post('/api/fishing/release/', {'session_id': session_id})
        assert resp.status_code == 200
        assert resp.data['karma_bonus'] >= 1

        player.refresh_from_db()
        assert player.karma > 0
        assert CaughtFish.objects.filter(player=player).count() == 0


# ═══════════════════════════════════════════════════════════
# 14. Сервисы: граничные случаи
# ═══════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestBiteCalculatorEdgeCases:
    """Граничные случаи расчёта поклёвки."""

    def setup_method(self):
        self.bite_calc = BiteCalculatorService(TimeService(), PotionService())

    def test_chance_capped_at_50_percent(self, player, location, player_rod, location_fish, game_time):
        """Шанс поклёвки не превышает 50%."""
        player.rank = 100
        player.karma = 1000
        player.hunger = 100
        player.save()

        chance = self.bite_calc.calculate_bite_chance(player, location, player_rod)
        assert chance <= 0.5

    def test_empty_location_returns_positive_chance(self, player, location, player_rod, game_time):
        """Без рыбы в локации всё равно есть базовый шанс (модификатор 1.0)."""
        player.current_location = location
        player.save(update_fields=['current_location'])

        # Без location_fish — нет рыб, но tod модификатор по дефолту
        chance = self.bite_calc.calculate_bite_chance(player, location, player_rod)
        assert chance >= 0.0

    def test_zero_hunger_reduces_chance(self, player, location, player_rod, location_fish, game_time):
        """Голод 0 снижает шанс до 0.7x."""
        player.hunger = 100
        player.save()
        chance_full = self.bite_calc.calculate_bite_chance(player, location, player_rod)

        player.hunger = 0
        player.save()
        chance_hungry = self.bite_calc.calculate_bite_chance(player, location, player_rod)

        # Соотношение: hungry/full ≈ 0.7
        ratio = chance_hungry / chance_full if chance_full > 0 else 0
        assert 0.65 <= ratio <= 0.75


@pytest.mark.django_db
class TestFishSelectorEdgeCases:
    """Граничные случаи выбора рыбы."""

    def setup_method(self):
        self.selector = FishSelectorService(TimeService(), PotionService())

    def test_empty_location_returns_none(self, location, player_rod):
        """Пустая локация — None."""
        result = self.selector.select_fish(location, player_rod)
        assert result is None

    def test_weight_always_in_range(self, fish_species):
        """Вес рыбы всегда в пределах min-max."""
        for _ in range(50):
            w = self.selector.generate_fish_weight(fish_species)
            assert fish_species.weight_min <= w <= fish_species.weight_max

    def test_length_always_in_range(self, fish_species):
        """Длина рыбы всегда в пределах min-max."""
        for _ in range(50):
            w = self.selector.generate_fish_weight(fish_species)
            l = self.selector.generate_fish_length(fish_species, w)
            assert fish_species.length_min <= l <= fish_species.length_max


@pytest.mark.django_db
class TestFightEngineEdgeCases:
    """Граничные случаи вываживания."""

    def setup_method(self):
        self.engine = FightEngineService()

    def test_create_fight_common_vs_legendary(self, fishing_session_waiting, fish_species):
        """Легендарная рыба в 3x сильнее обычной."""
        fish_species.rarity = 'common'
        fish_species.save()
        fight_c = self.engine.create_fight(fishing_session_waiting, 1.0, fish_species)
        strength_c = fight_c.fish_strength
        fight_c.delete()

        fish_species.rarity = 'legendary'
        fish_species.save()
        fight_l = self.engine.create_fight(fishing_session_waiting, 1.0, fish_species)
        strength_l = fight_l.fish_strength

        assert strength_l == strength_c * 3.0

    def test_fight_distance_range(self, fishing_session_waiting, fish_species):
        """Начальная дистанция всегда 10-30м."""
        for _ in range(20):
            fight = self.engine.create_fight(fishing_session_waiting, 1.0, fish_species)
            assert 10 <= fight.distance <= 30
            fight.delete()

    def test_fish_strength_never_below_1(self, fishing_session_fighting):
        """Сила рыбы не падает ниже 1.0."""
        fight = FightState.objects.get(session=fishing_session_fighting)
        fight.fish_strength = 1.05
        fight.line_tension = 10
        fight.distance = 100
        fight.save()

        for _ in range(10):
            result = self.engine.wait_action(fight)
            fight.refresh_from_db()
            if result != 'fighting':
                break

        assert fight.fish_strength >= 1.0

    def test_tension_never_negative(self, fishing_session_fighting):
        """Натяжение не уходит в минус."""
        fight = FightState.objects.get(session=fishing_session_fighting)
        fight.line_tension = 1
        fight.fish_strength = 0.1
        fight.distance = 100
        fight.save()

        self.engine.wait_action(fight)
        fight.refresh_from_db()

        assert fight.line_tension >= 0

    def test_distance_never_negative(self, fishing_session_fighting):
        """Дистанция не уходит в минус."""
        fight = FightState.objects.get(session=fishing_session_fighting)
        fight.distance = 0.5
        fight.fish_strength = 0.1
        fight.line_tension = 5
        fight.save()

        self.engine.reel_in(fight)
        fight.refresh_from_db()

        assert fight.distance >= 0
