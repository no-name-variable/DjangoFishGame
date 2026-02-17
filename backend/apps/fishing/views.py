"""Views рыбалки — core gameplay с поддержкой мульти-удочек."""

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.inventory.models import CaughtFish, PlayerRod
from apps.inventory.serializers import CaughtFishSerializer
from apps.potions.services import drop_marine_star
from apps.quests.services import update_quest_progress
from apps.records.services import check_achievements, check_record

from .models import FightState, FishingSession, GameTime, GroundbaitSpot
from .serializers import CastSerializer, FishingMultiStatusSerializer, SessionActionSerializer, UpdateRetrieveSerializer
from .services.bite_calculator import try_bite
from .services.fight_engine import create_fight, pull_rod, reel_in, wait_action
from .services.fish_selector import generate_fish_length, generate_fish_weight, select_fish

MAX_RODS = settings.GAME_SETTINGS.get('MAX_ACTIVE_RODS', 3)

SELECT_RELATED = (
    'location', 'rod__rod_type', 'rod__reel', 'rod__line',
    'rod__hook', 'rod__bait', 'rod__lure', 'hooked_species',
)


def _get_session(player, session_id, allowed_states=None):
    """Получить сессию по ID, проверить принадлежность и состояние."""
    try:
        session = FishingSession.objects.select_related(*SELECT_RELATED).get(
            pk=session_id, player=player,
        )
    except FishingSession.DoesNotExist:
        return None, Response({'error': 'Сессия не найдена.'}, status=status.HTTP_404_NOT_FOUND)

    if allowed_states and session.state not in allowed_states:
        state_labels = [FishingSession.State(s).label for s in allowed_states]
        return None, Response(
            {'error': f'Сессия не в нужном состоянии (ожидается: {", ".join(state_labels)}).'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return session, None


class CastView(APIView):
    """Заброс снасти — до MAX_ACTIVE_RODS одновременно."""

    def post(self, request):
        serializer = CastSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        player = request.user.player
        if not player.current_location:
            return Response({'error': 'Вы не на локации.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            rod = PlayerRod.objects.select_related(
                'rod_type', 'reel', 'line', 'hook', 'float_tackle', 'lure', 'bait',
            ).get(pk=data['rod_id'], player=player)
        except PlayerRod.DoesNotExist:
            return Response({'error': 'Снасть не найдена.'}, status=status.HTTP_404_NOT_FOUND)

        if not rod.is_ready:
            return Response({'error': 'Снасть не полностью собрана.'}, status=status.HTTP_400_BAD_REQUEST)

        # Проверяем, что удочка экипирована в один из слотов
        if rod not in [player.rod_slot_1, player.rod_slot_2, player.rod_slot_3]:
            return Response(
                {'error': 'Удочка должна быть экипирована в слот для использования.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Проверяем, что эта удочка ещё не заброшена
        if FishingSession.objects.filter(player=player, rod=rod).exists():
            return Response({'error': 'Эта удочка уже заброшена.'}, status=status.HTTP_400_BAD_REQUEST)

        # Проверяем лимит удочек (только активные состояния)
        active_sessions = FishingSession.objects.filter(
            player=player,
            state__in=[FishingSession.State.WAITING, FishingSession.State.BITE, FishingSession.State.FIGHTING],
        )
        if active_sessions.count() >= MAX_RODS:
            return Response(
                {'error': f'Максимум {MAX_RODS} удочки одновременно.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Назначаем свободный слот — учитываем ВСЕ существующие сессии (включая CAUGHT)
        all_used_slots = set(
            FishingSession.objects.filter(player=player).values_list('slot', flat=True)
        )
        free_slot = next((s for s in range(1, MAX_RODS + 1) if s not in all_used_slots), None)
        if free_slot is None:
            return Response(
                {'error': 'Нет свободных слотов. Завершите текущие сессии.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        slot = free_slot

        session = FishingSession.objects.create(
            player=player,
            location=player.current_location,
            rod=rod,
            slot=slot,
            state=FishingSession.State.WAITING,
            cast_x=data['point_x'],
            cast_y=data['point_y'],
            cast_time=timezone.now(),
        )

        return Response({'status': 'cast_ok', 'session_id': session.id, 'slot': slot})


class FishingStatusView(APIView):
    """Получить статус всех сессий. Для каждой WAITING — try_bite()."""

    def get(self, request):
        player = request.user.player
        sessions = list(
            FishingSession.objects.filter(player=player)
            .select_related(*SELECT_RELATED)
            .order_by('slot')
        )

        # Текущее игровое время (нужно даже если нет сессий)
        gt = GameTime.get_instance()

        if not sessions:
            return Response({
                'sessions': [],
                'fights': {},
                'game_time': {
                    'hour': gt.current_hour,
                    'day': gt.current_day,
                    'time_of_day': gt.time_of_day,
                }
            })

        # Для каждой WAITING — пробуем поклёвку и обновляем прогресс проводки
        for session in sessions:
            if session.state == FishingSession.State.WAITING:
                # Обновляем прогресс проводки для спиннинга
                if session.rod.rod_class == 'spinning' and session.is_retrieving:
                    # Увеличиваем прогресс на основе скорости проводки
                    # Скорость 1-10, прогресс за тик: speed * 0.005 (за ~20 секунд до берега при speed=10)
                    increment = session.rod.retrieve_speed * 0.005
                    session.retrieve_progress = min(1.0, session.retrieve_progress + increment)
                    session.save(update_fields=['retrieve_progress'])

                    # Если приманка дошла до берега — автоматически вытаскиваем
                    if session.retrieve_progress >= 1.0:
                        session.delete()
                        continue

                if try_bite(player, session.location, session.rod, session):
                    fish = select_fish(session.location, session.rod)
                    if fish:
                        weight = generate_fish_weight(fish, player)
                        length = generate_fish_length(fish, weight)
                        session.state = FishingSession.State.BITE
                        session.bite_time = timezone.now()
                        session.hooked_species = fish
                        session.hooked_weight = weight
                        session.hooked_length = length
                        session.save()

        # Собираем fights
        fights = {}
        for session in sessions:
            if session.state == FishingSession.State.FIGHTING:
                try:
                    fights[session.pk] = session.fight
                except FightState.DoesNotExist:
                    pass

        # Добавляем текущее игровое время
        gt = GameTime.get_instance()

        return Response(FishingMultiStatusSerializer({
            'sessions': sessions,
            'fights': fights,
            'game_time': gt,
        }).data)


class StrikeView(APIView):
    """Подсечка при поклёвке — принимает session_id."""

    def post(self, request):
        ser = SessionActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        player = request.user.player

        session, err = _get_session(
            player, ser.validated_data['session_id'],
            allowed_states=[FishingSession.State.BITE],
        )
        if err:
            return err

        # Проверяем, что нет другой сессии в FIGHTING
        if FishingSession.objects.filter(
            player=player, state=FishingSession.State.FIGHTING,
        ).exists():
            return Response(
                {'error': 'Уже идёт вываживание на другой удочке.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Проверка таймера подсечки (3 секунды)
        if session.bite_time and (timezone.now() - session.bite_time).total_seconds() > 3:
            session.state = FishingSession.State.WAITING
            session.hooked_species = None
            session.hooked_weight = None
            session.hooked_length = None
            session.save()
            return Response({'error': 'Поздно! Рыба сошла.'}, status=status.HTTP_400_BAD_REQUEST)

        session.state = FishingSession.State.FIGHTING
        session.save()

        fight = create_fight(session, session.hooked_weight, session.hooked_species)

        species = session.hooked_species
        return Response({
            'status': 'fighting',
            'session_id': session.pk,
            'fish': species.name_ru,
            'species_id': species.pk,
            'species_image': species.image.url if species.image else None,
            'tension': fight.line_tension,
            'distance': fight.distance,
        })


class ReelInView(APIView):
    """Подмотка (вываживание) — принимает session_id."""

    def post(self, request):
        return self._fight_action(request, reel_in)

    def _fight_action(self, request, action_func):
        ser = SessionActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        player = request.user.player

        session, err = _get_session(
            player, ser.validated_data['session_id'],
            allowed_states=[FishingSession.State.FIGHTING],
        )
        if err:
            return err

        try:
            fight = session.fight
        except FightState.DoesNotExist:
            return Response({'error': 'Нет состояния вываживания.'}, status=status.HTTP_400_BAD_REQUEST)

        result = action_func(fight)

        if result == 'caught':
            session.state = FishingSession.State.CAUGHT
            session.save()
            species = session.hooked_species
            return Response({
                'result': 'caught',
                'session_id': session.pk,
                'fish': species.name_ru,
                'species_id': species.pk,
                'species_image': species.image.url if species.image else None,
                'weight': session.hooked_weight,
                'length': session.hooked_length,
                'rarity': species.rarity,
            })
        elif result in ('line_break', 'rod_break'):
            if result == 'rod_break':
                rod = session.rod
                rod.durability_current = 0
                rod.save(update_fields=['durability_current'])
            session.delete()
            return Response({'result': result})

        return Response({
            'result': 'fighting',
            'session_id': session.pk,
            'tension': fight.line_tension,
            'distance': fight.distance,
            'rod_durability': fight.rod_durability,
        })


class PullRodView(ReelInView):
    """Подтяжка удилищем."""

    def post(self, request):
        return self._fight_action(request, pull_rod)


class KeepFishView(APIView):
    """Положить рыбу в садок."""

    def post(self, request):
        ser = SessionActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        player = request.user.player

        session, err = _get_session(
            player, ser.validated_data['session_id'],
            allowed_states=[FishingSession.State.CAUGHT],
        )
        if err:
            return err

        # Проверяем лимит садка
        creel_count = CaughtFish.objects.filter(player=player, is_sold=False, is_released=False).count()
        max_creel = settings.GAME_SETTINGS['MAX_CREEL_SIZE']
        if creel_count >= max_creel:
            return Response({'error': f'Садок полон ({max_creel} рыб).'}, status=status.HTTP_400_BAD_REQUEST)

        caught = CaughtFish.objects.create(
            player=player,
            species=session.hooked_species,
            weight=session.hooked_weight,
            length=session.hooked_length,
            location=session.location,
        )

        player.add_experience(caught.experience_reward)

        record = check_record(
            player, session.hooked_species, session.hooked_weight,
            session.hooked_length, session.location,
        )
        if record:
            caught.is_record = True
            caught.save(update_fields=['is_record'])

        completed_quests = update_quest_progress(
            player, session.hooked_species, session.hooked_weight, session.location,
        )
        new_achievements = check_achievements(player)
        star_drop = drop_marine_star(player)

        # Расходуем наживку
        rod = session.rod
        if rod.bait and rod.bait_remaining > 0:
            rod.bait_remaining -= 1
            rod.save(update_fields=['bait_remaining'])

        session.delete()

        response = CaughtFishSerializer(caught).data
        if record:
            response['new_record'] = True
        if completed_quests:
            response['completed_quests'] = [pq.quest.name for pq in completed_quests]
        if new_achievements:
            response['new_achievements'] = [pa.achievement.name for pa in new_achievements]
        if star_drop:
            response['star_drop'] = star_drop

        return Response(response, status=status.HTTP_201_CREATED)


class ReleaseFishView(APIView):
    """Отпустить рыбу (+карма)."""

    def post(self, request):
        ser = SessionActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        player = request.user.player

        session, err = _get_session(
            player, ser.validated_data['session_id'],
            allowed_states=[FishingSession.State.CAUGHT],
        )
        if err:
            return err

        karma_bonus = max(1, int(session.hooked_weight))
        player.karma += karma_bonus
        player.save(update_fields=['karma'])

        exp = int(session.hooked_species.experience_per_kg * session.hooked_weight * 0.5)
        player.add_experience(exp)

        rod = session.rod
        if rod.bait and rod.bait_remaining > 0:
            rod.bait_remaining -= 1
            rod.save(update_fields=['bait_remaining'])

        session.delete()

        return Response({
            'status': 'released',
            'karma_bonus': karma_bonus,
            'karma_total': player.karma,
        })


class RetrieveRodView(APIView):
    """Вытащить удочку (удалить сессию WAITING/IDLE)."""

    def post(self, request):
        ser = SessionActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        player = request.user.player

        session, err = _get_session(
            player, ser.validated_data['session_id'],
            allowed_states=[FishingSession.State.IDLE, FishingSession.State.WAITING],
        )
        if err:
            return err

        session.delete()
        return Response({'status': 'retrieved'})


class UpdateRetrieveView(APIView):
    """Обновить статус проводки спиннинга (is_retrieving)."""

    def post(self, request):
        ser = UpdateRetrieveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        player = request.user.player

        session, err = _get_session(
            player, data['session_id'],
            allowed_states=[FishingSession.State.WAITING],
        )
        if err:
            return err

        session.is_retrieving = data['is_retrieving']

        # При остановке проводки — сбрасываем прогресс (можно перезабросить)
        if not session.is_retrieving:
            session.retrieve_progress = 0.0
            session.save(update_fields=['is_retrieving', 'retrieve_progress'])
        else:
            session.save(update_fields=['is_retrieving'])

        return Response({'status': 'ok', 'is_retrieving': session.is_retrieving})


class GroundbaitView(APIView):
    """Бросить прикормку в точку ловли."""

    def post(self, request):
        from django.contrib.contenttypes.models import ContentType
        from apps.inventory.models import InventoryItem
        from apps.tackle.models import Flavoring, Groundbait

        player = request.user.player
        if not player.current_location:
            return Response({'error': 'Вы не на локации.'}, status=status.HTTP_400_BAD_REQUEST)

        groundbait_id = request.data.get('groundbait_id')
        flavoring_id = request.data.get('flavoring_id')

        if not groundbait_id:
            return Response({'error': 'Укажите groundbait_id.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            groundbait = Groundbait.objects.get(pk=groundbait_id)
        except Groundbait.DoesNotExist:
            return Response({'error': 'Прикормка не найдена.'}, status=status.HTTP_404_NOT_FOUND)

        ct = ContentType.objects.get_for_model(groundbait)
        inv = InventoryItem.objects.filter(player=player, content_type=ct, object_id=groundbait.pk, quantity__gte=1).first()
        if not inv:
            return Response({'error': 'Нет прикормки в инвентаре.'}, status=status.HTTP_400_BAD_REQUEST)

        flavoring = None
        if flavoring_id:
            try:
                flavoring = Flavoring.objects.get(pk=flavoring_id)
                ct_f = ContentType.objects.get_for_model(flavoring)
                inv_f = InventoryItem.objects.filter(player=player, content_type=ct_f, object_id=flavoring.pk, quantity__gte=1).first()
                if not inv_f:
                    return Response({'error': 'Нет ароматизатора в инвентаре.'}, status=status.HTTP_400_BAD_REQUEST)
                inv_f.quantity -= 1
                if inv_f.quantity <= 0:
                    inv_f.delete()
                else:
                    inv_f.save(update_fields=['quantity'])
            except Flavoring.DoesNotExist:
                return Response({'error': 'Ароматизатор не найден.'}, status=status.HTTP_404_NOT_FOUND)

        inv.quantity -= 1
        if inv.quantity <= 0:
            inv.delete()
        else:
            inv.save(update_fields=['quantity'])

        gt = GameTime.get_instance()
        expire_hour = gt.current_hour + groundbait.duration_hours
        expire_day = gt.current_day + expire_hour // 24
        expire_hour = expire_hour % 24

        spot = GroundbaitSpot.objects.create(
            player=player,
            location=player.current_location,
            groundbait=groundbait,
            flavoring=flavoring,
            expires_at_hour=expire_hour,
            expires_at_day=expire_day,
        )

        return Response({
            'message': f'Прикормка "{groundbait.name}" брошена!',
            'duration_hours': groundbait.duration_hours,
            'flavoring': flavoring.name if flavoring else None,
        })


class ChangeBaitView(APIView):
    """Сменить наживку на удочке во время рыбалки (только для WAITING сессий)."""

    def post(self, request):
        from django.contrib.contenttypes.models import ContentType
        from apps.inventory.models import InventoryItem
        from apps.tackle.models import Bait
        from .serializers import ChangeBaitSerializer

        serializer = ChangeBaitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        player = request.user.player

        # Получаем сессию
        session, err = _get_session(
            player, data['session_id'],
            allowed_states=[FishingSession.State.WAITING],
        )
        if err:
            return err

        # Получаем наживку
        try:
            bait = Bait.objects.get(pk=data['bait_id'])
        except Bait.DoesNotExist:
            return Response({'error': 'Наживка не найдена.'}, status=status.HTTP_404_NOT_FOUND)

        # Проверяем наличие в инвентаре
        ct = ContentType.objects.get_for_model(bait)
        inv = InventoryItem.objects.filter(player=player, content_type=ct, object_id=bait.pk, quantity__gte=1).first()
        if not inv:
            return Response({'error': 'Нет наживки в инвентаре.'}, status=status.HTTP_400_BAD_REQUEST)

        # Возвращаем старую наживку в инвентарь (если была)
        rod = session.rod
        if rod.bait and rod.bait_remaining > 0:
            old_ct = ContentType.objects.get_for_model(rod.bait)
            old_inv, created = InventoryItem.objects.get_or_create(
                player=player, content_type=old_ct, object_id=rod.bait.pk,
                defaults={'quantity': 0},
            )
            old_inv.quantity += rod.bait_remaining
            old_inv.save(update_fields=['quantity'])

        # Обновляем удочку
        rod.bait = bait
        rod.bait_remaining = bait.quantity_per_pack
        rod.save(update_fields=['bait', 'bait_remaining'])

        # Списываем новую наживку из инвентаря
        inv.quantity -= 1
        if inv.quantity <= 0:
            inv.delete()
        else:
            inv.save(update_fields=['quantity'])

        return Response({
            'status': 'bait_changed',
            'session_id': session.pk,
            'new_bait': bait.name,
            'bait_remaining': rod.bait_remaining,
        })


class GameTimeView(APIView):
    """Получить текущее игровое время."""

    def get(self, request):
        gt = GameTime.get_instance()
        return Response({
            'hour': gt.current_hour,
            'day': gt.current_day,
            'time_of_day': gt.time_of_day,
        })
