"""Сервис уведомлений бара — шлёт сообщения в барный чат."""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.chat.models import ChatMessage

# Пороги выпитого и сообщения
DRINK_MILESTONES = {
    3: '{nick} разогревается — уже 3-я кружка!',
    5: '{nick} в ударе — 5 кружек! Бармен начинает волноваться.',
    7: '{nick} не останавливается — 7 кружек! Стол уже качается.',
    10: '{nick} злоупотребляет пивом — 10 кружек! Рыба в реке в безопасности.',
    15: '{nick} — легенда бара! 15 кружек и не думает останавливаться!',
    20: '{nick} побил все рекорды — 20 кружек! Бармен аплодирует стоя.',
}


def send_bar_notification(player, drink_count: int) -> None:
    """Отправляет уведомление в барный чат при достижении порога."""
    template = DRINK_MILESTONES.get(drink_count)
    if not template:
        return

    text = template.format(nick=player.nickname)
    # Бар — общее место, channel_id=0
    # Сохраняем как системное сообщение в БД
    msg = ChatMessage.objects.create(
        player=player,
        channel='bar',
        channel_id=0,
        text=text,
    )

    # Рассылаем по WebSocket
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        'chat_bar_0',
        {
            'type': 'chat.message',
            'message': {
                'id': msg.id,
                'nickname': player.nickname,
                'text': text,
                'created_at': msg.created_at.isoformat(),
            },
        },
    )
