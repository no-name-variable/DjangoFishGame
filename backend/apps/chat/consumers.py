"""WebSocket consumer для чата."""

import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer для чата локации/базы/глобального."""

    # Онлайн-участники по комнатам: {room_group: {channel_name: nickname}}
    _online = {}

    async def connect(self):
        self.channel_type = self.scope['url_route']['kwargs'].get('channel_type', 'global')
        self.channel_id = self.scope['url_route']['kwargs'].get('channel_id', 0)
        self.room_group = f'chat_{self.channel_type}_{self.channel_id}'

        user = self.scope.get('user')
        if not user or user.is_anonymous:
            await self.close()
            return

        self.player = await self._get_player(user)
        if not self.player:
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group, self.channel_name)
        await self.accept()

        # Отправить последние сообщения
        messages = await self._get_recent_messages()
        await self.send_json({'type': 'history', 'messages': messages})

        # Трекинг присутствия
        if self.room_group not in self._online:
            self._online[self.room_group] = {}
        self._online[self.room_group][self.channel_name] = self.player.nickname
        await self._broadcast_members()

    async def disconnect(self, code):
        if hasattr(self, 'room_group'):
            # Убрать из онлайн-списка
            room = self._online.get(self.room_group)
            if room:
                room.pop(self.channel_name, None)
                if not room:
                    self._online.pop(self.room_group, None)
            await self.channel_layer.group_discard(self.room_group, self.channel_name)
            await self._broadcast_members()

    async def receive_json(self, content):
        text = content.get('text', '').strip()
        if not text or len(text) > 500:
            return

        message = await self._save_message(text)

        await self.channel_layer.group_send(
            self.room_group,
            {
                'type': 'chat.message',
                'message': message,
            },
        )

    async def chat_message(self, event):
        await self.send_json({'type': 'message', **event['message']})

    async def chat_members(self, event):
        await self.send_json({'type': 'members', 'members': event['members']})

    async def _broadcast_members(self):
        """Рассылает список онлайн-участников комнаты."""
        room = self._online.get(self.room_group, {})
        members = sorted(set(room.values()))
        await self.channel_layer.group_send(
            self.room_group,
            {'type': 'chat.members', 'members': members},
        )

    @database_sync_to_async
    def _get_player(self, user):
        try:
            return user.player
        except Exception:
            return None

    @database_sync_to_async
    def _get_recent_messages(self):
        from .models import ChatMessage
        qs = ChatMessage.objects.filter(
            channel=self.channel_type, channel_id=self.channel_id,
        ).select_related('player').order_by('-created_at')[:50]
        return [
            {
                'id': m.id,
                'nickname': m.player.nickname,
                'text': m.text,
                'created_at': m.created_at.isoformat(),
            }
            for m in reversed(qs)
        ]

    @database_sync_to_async
    def _save_message(self, text):
        from .models import ChatMessage
        msg = ChatMessage.objects.create(
            player=self.player,
            channel=self.channel_type,
            channel_id=self.channel_id,
            text=text,
        )
        return {
            'id': msg.id,
            'nickname': self.player.nickname,
            'text': msg.text,
            'created_at': msg.created_at.isoformat(),
        }
