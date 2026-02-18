"""Общие фикстуры для тестов."""
import pytest
from decimal import Decimal
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

from apps.accounts.models import Player
from apps.world.models import Base, Location, LocationFish
from apps.tackle.models import (
    FishSpecies, RodType, Reel, Line, Hook, FloatTackle, Bait,
    Groundbait, Flavoring, Food,
)
from apps.inventory.models import PlayerRod, InventoryItem, CaughtFish
from apps.fishing.models import FishingSession, FightState, GameTime


@pytest.fixture
def user(db):
    return User.objects.create_user(username='fisher', password='testpass123')


@pytest.fixture
def player(user):
    base = Base.objects.create(
        name='Тестовое озеро', description='Тест',
        min_rank=1, min_karma=0, travel_cost=0,
    )
    return Player.objects.create(
        user=user, nickname='Рыбак', money=Decimal('1000.00'),
        current_base=base,
    )


@pytest.fixture
def api_client(player):
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import AccessToken
    client = APIClient()
    token = AccessToken.for_user(player.user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


@pytest.fixture
def base(player):
    return player.current_base


@pytest.fixture
def location(base):
    return Location.objects.create(
        base=base, name='Тихая заводь', description='Тест',
        min_rank=1, depth_map={'avg': 2.0, 'min': 0.5, 'max': 4.0},
    )


@pytest.fixture
def fish_species():
    return FishSpecies.objects.create(
        name_ru='Карась', name_latin='Carassius', rarity='common',
        weight_min=0.1, weight_max=2.0,
        length_min=5, length_max=35,
        sell_price_per_kg=Decimal('10.00'),
        experience_per_kg=50,
        active_time={'morning': 1.0, 'day': 0.8, 'evening': 1.2, 'night': 0.3},
    )


@pytest.fixture
def location_fish(location, fish_species):
    return LocationFish.objects.create(
        location=location, fish=fish_species,
        spawn_weight=0.8, depth_preference=1.5,
    )


@pytest.fixture
def rod_type():
    return RodType.objects.create(
        name="Удочка 'Новичок'", rod_class='float',
        length=3.0, test_min=5, test_max=25,
        price=Decimal('50.00'), min_rank=1,
    )


@pytest.fixture
def reel():
    return Reel.objects.create(
        name='Катушка тест', drag_power=3.0,
        line_capacity=100, price=Decimal('30.00'),
    )


@pytest.fixture
def line():
    return Line.objects.create(
        name='Леска 0.2', thickness=0.2,
        breaking_strength=4.0, length=100, price=Decimal('15.00'),
    )


@pytest.fixture
def hook():
    return Hook.objects.create(
        name='Крючок №6', size=6, price=Decimal('5.00'),
    )


@pytest.fixture
def float_tackle():
    return FloatTackle.objects.create(
        name='Поплавок 2г', capacity=2.0,
        price=Decimal('10.00'),
    )


@pytest.fixture
def bait():
    return Bait.objects.create(
        name='Червь',
        quantity_per_pack=20, price=Decimal('8.00'),
    )


@pytest.fixture
def food():
    return Food.objects.create(
        name='Бутерброд', satiety=30, price=Decimal('20.00'),
    )


@pytest.fixture
def groundbait():
    return Groundbait.objects.create(
        name='Прикормка универсал', duration_hours=3,
        effectiveness=1.0, price=Decimal('15.00'),
    )


@pytest.fixture
def flavoring():
    return Flavoring.objects.create(
        name='Ваниль', bonus_multiplier=1.3,
        price=Decimal('12.00'),
    )


@pytest.fixture
def player_rod(player, rod_type, line, hook, float_tackle, bait):
    rod = PlayerRod.objects.create(
        player=player, rod_type=rod_type,
        line=line, hook=hook, float_tackle=float_tackle,
        bait=bait, bait_remaining=20,
        is_assembled=True, depth_setting=1.5,
    )
    # Экипируем удочку в первый слот (CastView требует)
    player.rod_slot_1 = rod
    player.save(update_fields=['rod_slot_1'])
    return rod


@pytest.fixture
def inv_rod(player, rod_type):
    ct = ContentType.objects.get_for_model(rod_type)
    return InventoryItem.objects.create(
        player=player, content_type=ct, object_id=rod_type.pk, quantity=1,
    )


@pytest.fixture
def game_time():
    gt, _ = GameTime.objects.get_or_create(
        pk=1, defaults={'current_hour': 10, 'current_day': 1},
    )
    return gt


@pytest.fixture
def fishing_session_waiting(player, location, player_rod):
    player.current_location = location
    player.save(update_fields=['current_location'])
    return FishingSession.objects.create(
        player=player, location=location, rod=player_rod,
        slot=1,
        state=FishingSession.State.WAITING,
        cast_time=timezone.now(),
    )


@pytest.fixture
def fishing_session_bite(player, location, player_rod, fish_species):
    player.current_location = location
    player.save(update_fields=['current_location'])
    return FishingSession.objects.create(
        player=player, location=location, rod=player_rod,
        slot=1,
        state=FishingSession.State.BITE,
        cast_time=timezone.now(), bite_time=timezone.now(),
        hooked_species=fish_species, hooked_weight=1.5, hooked_length=25.0,
    )


@pytest.fixture
def fishing_session_fighting(fishing_session_bite, fish_species):
    session = fishing_session_bite
    session.state = FishingSession.State.FIGHTING
    session.save()
    FightState.objects.create(
        session=session,
        fish_strength=session.hooked_weight * 3,
        line_tension=20, distance=25.0, rod_durability=100,
    )
    return session


@pytest.fixture
def fishing_session_caught(player, location, player_rod, fish_species):
    player.current_location = location
    player.save(update_fields=['current_location'])
    return FishingSession.objects.create(
        player=player, location=location, rod=player_rod,
        slot=1,
        state=FishingSession.State.CAUGHT,
        cast_time=timezone.now(),
        hooked_species=fish_species, hooked_weight=1.5, hooked_length=25.0,
    )
