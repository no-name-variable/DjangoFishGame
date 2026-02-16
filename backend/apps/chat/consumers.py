"""WebSocket consumer для чата."""

import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer для чата локации/базы/глобального."""

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

    async def disconnect(self, code):
        if hasattr(self, 'room_group'):
            await self.channel_layer.group_discard(self.room_group, self.channel_name)

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
