"""Модели чата."""

from django.db import models


class ChatMessage(models.Model):
    """Сообщение в чате локации."""

    class Channel(models.TextChoices):
        LOCATION = 'location', 'Локация'
        BASE = 'base', 'База'
        GLOBAL = 'global', 'Общий'

    player = models.ForeignKey('accounts.Player', on_delete=models.CASCADE, related_name='messages')
    channel = models.CharField('Канал', max_length=20, choices=Channel.choices, default=Channel.LOCATION)
    channel_id = models.IntegerField('ID канала', default=0, help_text='ID локации или базы (0 для global)')
    text = models.TextField('Текст', max_length=500)
    created_at = models.DateTimeField('Время', auto_now_add=True)

    class Meta:
        verbose_name = 'Сообщение'
        verbose_name_plural = 'Сообщения'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.player.nickname}: {self.text[:50]}'
