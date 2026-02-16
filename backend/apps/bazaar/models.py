"""Модели барахолки (базар между игроками)."""

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class MarketListing(models.Model):
    """Лот, выставленный на барахолке."""

    seller = models.ForeignKey(
        'accounts.Player', on_delete=models.CASCADE,
        related_name='market_listings', verbose_name='Продавец',
    )
    content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, verbose_name='Тип товара',
    )
    object_id = models.PositiveIntegerField()
    item = GenericForeignKey('content_type', 'object_id')

    quantity = models.IntegerField('Количество', default=1)
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2)
    created_at = models.DateTimeField('Дата создания', auto_now_add=True)
    is_active = models.BooleanField('Активен', default=True)

    buyer = models.ForeignKey(
        'accounts.Player', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='market_purchases',
        verbose_name='Покупатель',
    )
    sold_at = models.DateTimeField('Дата продажи', null=True, blank=True)

    class Meta:
        verbose_name = 'Лот на барахолке'
        verbose_name_plural = 'Лоты на барахолке'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
        ]

    def __str__(self):
        return f'{self.seller} — {self.item} x{self.quantity} за {self.price}'
