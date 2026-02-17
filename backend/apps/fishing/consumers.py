"""WebSocket consumer для рыбалки — заменяет REST polling."""

import asyncio
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.core.serializers.json import DjangoJSONEncoder

logger = logging.getLogger(__name__)


def _resolve(use_case_cls):
    """Резолвит use case из DI-контейнера."""
    from config.container import container
    return container.resolve(use_case_cls)


class FishingConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer для рыбалки с серверным tick loop."""

    @classmethod
    async def encode_json(cls, content):
        """Используем DjangoJSONEncoder для поддержки Decimal, datetime и т.д."""
        import json
        return json.dumps(content, cls=DjangoJSONEncoder)

    async def connect(self):
        user = self.scope.get('user')
        if not user or user.is_anonymous:
            await self.close()
            return

        self.player = await self._get_player(user)
        if not self.player:
            await self.close()
            return

        await self.accept()

        # Отправляем начальный state
        state = await self._get_state_snapshot()
        await self.send_json({'type': 'state', **state})

        # Запускаем tick loop
        self._tick_task = asyncio.create_task(self._tick_loop())

    async def disconnect(self, code):
        if hasattr(self, '_tick_task'):
            self._tick_task.cancel()

    async def receive_json(self, content):
        action = content.get('action')
        handler = {
            'cast': self._handle_cast,
            'strike': self._handle_strike,
            'reel_in': self._handle_reel_in,
            'pull': self._handle_pull,
            'keep': self._handle_keep,
            'release': self._handle_release,
            'retrieve': self._handle_retrieve,
            'update_retrieve': self._handle_update_retrieve,
            'change_bait': self._handle_change_bait,
            'groundbait': self._handle_groundbait,
        }.get(action)

        if not handler:
            await self.send_json({'type': 'error', 'message': f'Неизвестное действие: {action}'})
            return

        try:
            await handler(content)
        except Exception as e:
            logger.exception('Ошибка обработки действия %s', action)
            await self.send_json({'type': 'error', 'message': str(e)})

    # --- Tick loop ---

    async def _tick_loop(self):
        """Серверный тик каждые 1.5 сек — проверяет поклёвки и прогресс проводки."""
        try:
            while True:
                await asyncio.sleep(1.5)
                try:
                    result = await self._do_tick()
                    if result:
                        await self.send_json(result)
                except Exception:
                    import traceback; traceback.print_exc()
        except asyncio.CancelledError:
            pass

    @database_sync_to_async
    def _do_tick(self):
        """Выполняет логику тика (аналог FishingStatusUseCase.execute)."""
        from apps.fishing.use_cases.status import FishingStatusUseCase

        self.player.refresh_from_db()
        uc = _resolve(FishingStatusUseCase)
        result = uc.execute(self.player)

        from apps.fishing.serializers import (
            FightStateSerializer,
            FishingSessionSerializer,
        )
        from apps.fishing.models import GameTime

        sessions_data = FishingSessionSerializer(result.sessions, many=True).data
        fights_data = {
            str(sid): FightStateSerializer(fight).data
            for sid, fight in result.fights.items()
        }

        gt = result.game_time
        game_time = {
            'hour': gt.current_hour,
            'day': gt.current_day,
            'time_of_day': gt.time_of_day,
        } if gt else None

        # Определяем новые поклёвки
        bite_sessions = [s for s in result.sessions if s.state == 'bite']

        response = {
            'type': 'state',
            'sessions': sessions_data,
            'fights': fights_data,
            'game_time': game_time,
        }

        # Добавляем информацию о новых поклёвках
        if bite_sessions:
            response['bites'] = [s.pk for s in bite_sessions]

        return response

    # --- Обработчики действий ---

    async def _handle_cast(self, content):
        rod_id = content.get('rod_id')
        point_x = content.get('point_x')
        point_y = content.get('point_y')

        if not all([rod_id, point_x is not None, point_y is not None]):
            await self.send_json({'type': 'error', 'message': 'Укажите rod_id, point_x, point_y.'})
            return

        result = await self._do_cast(rod_id, point_x, point_y)
        await self.send_json(result)

        if result['type'] != 'error':
            state = await self._get_state_snapshot()
            await self.send_json({'type': 'state', **state})

    @database_sync_to_async
    def _do_cast(self, rod_id, point_x, point_y):
        from apps.fishing.use_cases.cast import CastUseCase
        from apps.inventory.models import PlayerRod

        self.player.refresh_from_db()
        uc = _resolve(CastUseCase)
        try:
            result = uc.execute(self.player, rod_id, point_x, point_y)
            return {
                'type': 'cast_ok',
                'session_id': result.session_id,
                'slot': result.slot,
            }
        except PlayerRod.DoesNotExist:
            return {'type': 'error', 'message': 'Снасть не найдена.'}
        except ValueError as e:
            return {'type': 'error', 'message': str(e)}

    async def _handle_strike(self, content):
        session_id = content.get('session_id')
        if not session_id:
            await self.send_json({'type': 'error', 'message': 'Укажите session_id.'})
            return

        result = await self._do_strike(session_id)
        await self.send_json(result)

        if result['type'] != 'error':
            state = await self._get_state_snapshot()
            await self.send_json({'type': 'state', **state})

    @database_sync_to_async
    def _do_strike(self, session_id):
        from apps.fishing.use_cases.strike import StrikeUseCase
        from apps.fishing.models import FishingSession

        self.player.refresh_from_db()
        uc = _resolve(StrikeUseCase)
        try:
            result = uc.execute(self.player, session_id)
            return {
                'type': 'strike_ok',
                'session_id': result.session_id,
                'fish': result.fish_name,
                'species_id': result.species_id,
                'species_image': result.species_image,
                'tension': result.tension,
                'distance': result.distance,
            }
        except FishingSession.DoesNotExist:
            return {'type': 'error', 'message': 'Сессия не найдена.'}
        except ValueError as e:
            return {'type': 'error', 'message': str(e)}

    async def _handle_reel_in(self, content):
        await self._handle_fight_action(content, 'reel_in')

    async def _handle_pull(self, content):
        await self._handle_fight_action(content, 'pull')

    async def _handle_fight_action(self, content, action):
        session_id = content.get('session_id')
        if not session_id:
            await self.send_json({'type': 'error', 'message': 'Укажите session_id.'})
            return

        result = await self._do_fight_action(session_id, action)
        await self.send_json(result)

        if result['type'] != 'error':
            state = await self._get_state_snapshot()
            await self.send_json({'type': 'state', **state})

    @database_sync_to_async
    def _do_fight_action(self, session_id, action):
        from apps.fishing.use_cases.fight import PullRodUseCase, ReelInUseCase
        from apps.fishing.models import FishingSession

        self.player.refresh_from_db()
        uc_cls = ReelInUseCase if action == 'reel_in' else PullRodUseCase
        uc = _resolve(uc_cls)
        try:
            result = uc.execute(self.player, session_id)

            if result.result == 'caught':
                return {
                    'type': 'fight_result',
                    'result': 'caught',
                    'session_id': result.session_id,
                    'fish': result.fish_name,
                    'species_id': result.species_id,
                    'species_image': result.species_image,
                    'weight': result.weight,
                    'length': result.length,
                    'rarity': result.rarity,
                }
            elif result.result in ('line_break', 'rod_break'):
                return {
                    'type': 'fight_result',
                    'result': result.result,
                    'session_id': session_id,
                }
            else:
                return {
                    'type': 'fight_result',
                    'result': 'fighting',
                    'session_id': result.session_id,
                    'tension': result.tension,
                    'distance': result.distance,
                    'rod_durability': result.rod_durability,
                }
        except FishingSession.DoesNotExist:
            return {'type': 'error', 'message': 'Сессия не найдена.'}
        except ValueError as e:
            return {'type': 'error', 'message': str(e)}

    async def _handle_keep(self, content):
        session_id = content.get('session_id')
        if not session_id:
            await self.send_json({'type': 'error', 'message': 'Укажите session_id.'})
            return

        result = await self._do_keep(session_id)
        await self.send_json(result)

        if result['type'] != 'error':
            state = await self._get_state_snapshot()
            await self.send_json({'type': 'state', **state})

    @database_sync_to_async
    def _do_keep(self, session_id):
        from apps.fishing.use_cases.keep_fish import KeepFishUseCase
        from apps.fishing.models import FishingSession

        self.player.refresh_from_db()
        uc = _resolve(KeepFishUseCase)
        try:
            result = uc.execute(self.player, session_id)
            return {
                'type': 'keep_result',
                **result.caught_fish_data,
            }
        except FishingSession.DoesNotExist:
            return {'type': 'error', 'message': 'Сессия не найдена.'}
        except ValueError as e:
            return {'type': 'error', 'message': str(e)}

    async def _handle_release(self, content):
        session_id = content.get('session_id')
        if not session_id:
            await self.send_json({'type': 'error', 'message': 'Укажите session_id.'})
            return

        result = await self._do_release(session_id)
        await self.send_json(result)

        if result['type'] != 'error':
            state = await self._get_state_snapshot()
            await self.send_json({'type': 'state', **state})

    @database_sync_to_async
    def _do_release(self, session_id):
        from apps.fishing.use_cases.release_fish import ReleaseFishUseCase
        from apps.fishing.models import FishingSession

        self.player.refresh_from_db()
        uc = _resolve(ReleaseFishUseCase)
        try:
            result = uc.execute(self.player, session_id)
            return {
                'type': 'release_result',
                'karma_bonus': result.karma_bonus,
                'karma_total': result.karma_total,
            }
        except FishingSession.DoesNotExist:
            return {'type': 'error', 'message': 'Сессия не найдена.'}
        except ValueError as e:
            return {'type': 'error', 'message': str(e)}

    async def _handle_retrieve(self, content):
        session_id = content.get('session_id')
        if not session_id:
            await self.send_json({'type': 'error', 'message': 'Укажите session_id.'})
            return

        result = await self._do_retrieve(session_id)
        await self.send_json(result)

        if result['type'] != 'error':
            state = await self._get_state_snapshot()
            await self.send_json({'type': 'state', **state})

    @database_sync_to_async
    def _do_retrieve(self, session_id):
        from apps.fishing.use_cases.retrieve import RetrieveRodUseCase
        from apps.fishing.models import FishingSession

        self.player.refresh_from_db()
        uc = _resolve(RetrieveRodUseCase)
        try:
            uc.execute(self.player, session_id)
            return {'type': 'retrieve_ok', 'session_id': session_id}
        except FishingSession.DoesNotExist:
            return {'type': 'error', 'message': 'Сессия не найдена.'}
        except ValueError as e:
            return {'type': 'error', 'message': str(e)}

    async def _handle_update_retrieve(self, content):
        session_id = content.get('session_id')
        is_retrieving = content.get('is_retrieving')

        if not session_id or is_retrieving is None:
            await self.send_json({'type': 'error', 'message': 'Укажите session_id и is_retrieving.'})
            return

        result = await self._do_update_retrieve(session_id, is_retrieving)
        await self.send_json(result)

    @database_sync_to_async
    def _do_update_retrieve(self, session_id, is_retrieving):
        from apps.fishing.models import FishingSession

        try:
            session = FishingSession.objects.get(
                pk=session_id, player=self.player,
                state=FishingSession.State.WAITING,
            )
        except FishingSession.DoesNotExist:
            return {'type': 'error', 'message': 'Сессия не найдена.'}

        session.is_retrieving = is_retrieving
        if not is_retrieving:
            session.retrieve_progress = 0.0
            session.save(update_fields=['is_retrieving', 'retrieve_progress'])
        else:
            session.save(update_fields=['is_retrieving'])

        return {'type': 'update_retrieve_ok', 'session_id': session_id, 'is_retrieving': session.is_retrieving}

    async def _handle_change_bait(self, content):
        session_id = content.get('session_id')
        bait_id = content.get('bait_id')

        if not session_id or not bait_id:
            await self.send_json({'type': 'error', 'message': 'Укажите session_id и bait_id.'})
            return

        result = await self._do_change_bait(session_id, bait_id)
        await self.send_json(result)

        if result['type'] != 'error':
            state = await self._get_state_snapshot()
            await self.send_json({'type': 'state', **state})

    @database_sync_to_async
    def _do_change_bait(self, session_id, bait_id):
        from apps.fishing.use_cases.change_bait import ChangeBaitUseCase
        from apps.fishing.models import FishingSession
        from apps.tackle.models import Bait

        self.player.refresh_from_db()
        uc = _resolve(ChangeBaitUseCase)
        try:
            result = uc.execute(self.player, session_id, bait_id)
            return {
                'type': 'change_bait_ok',
                'session_id': result.session_id,
                'new_bait': result.new_bait_name,
                'bait_remaining': result.bait_remaining,
            }
        except (FishingSession.DoesNotExist, Bait.DoesNotExist):
            return {'type': 'error', 'message': 'Сессия или наживка не найдена.'}
        except ValueError as e:
            return {'type': 'error', 'message': str(e)}

    async def _handle_groundbait(self, content):
        groundbait_id = content.get('groundbait_id')
        flavoring_id = content.get('flavoring_id')

        if not groundbait_id:
            await self.send_json({'type': 'error', 'message': 'Укажите groundbait_id.'})
            return

        result = await self._do_groundbait(groundbait_id, flavoring_id)
        await self.send_json(result)

    @database_sync_to_async
    def _do_groundbait(self, groundbait_id, flavoring_id):
        from apps.fishing.use_cases.groundbait import ApplyGroundbaitUseCase
        from apps.tackle.models import Flavoring, Groundbait

        self.player.refresh_from_db()
        uc = _resolve(ApplyGroundbaitUseCase)
        try:
            result = uc.execute(self.player, groundbait_id, flavoring_id)
            return {
                'type': 'groundbait_ok',
                'message': result.message,
                'duration_hours': result.duration_hours,
                'flavoring': result.flavoring_name,
            }
        except (Groundbait.DoesNotExist, Flavoring.DoesNotExist) as e:
            return {'type': 'error', 'message': str(e)}
        except ValueError as e:
            return {'type': 'error', 'message': str(e)}

    # --- Хелперы ---

    @database_sync_to_async
    def _get_player(self, user):
        try:
            return user.player
        except Exception:
            return None

    @database_sync_to_async
    def _get_state_snapshot(self):
        """Сериализует текущее состояние всех сессий игрока."""
        from apps.fishing.use_cases.status import SELECT_RELATED
        from apps.fishing.models import FightState, FishingSession, GameTime
        from apps.fishing.serializers import (
            FightStateSerializer,
            FishingSessionSerializer,
        )

        self.player.refresh_from_db()
        sessions = list(
            FishingSession.objects.filter(player=self.player)
            .select_related(*SELECT_RELATED)
            .order_by('slot')
        )

        fights = {}
        for session in sessions:
            if session.state == FishingSession.State.FIGHTING:
                try:
                    fights[session.pk] = session.fight
                except FightState.DoesNotExist:
                    pass

        gt = GameTime.get_instance()

        return {
            'sessions': FishingSessionSerializer(sessions, many=True).data,
            'fights': {
                str(sid): FightStateSerializer(fight).data
                for sid, fight in fights.items()
            },
            'game_time': {
                'hour': gt.current_hour,
                'day': gt.current_day,
                'time_of_day': gt.time_of_day,
            } if gt else None,
        }
