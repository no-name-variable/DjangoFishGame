"""Модели кафе — заказы рыбы на локациях."""

from django.db import models


class CafeOrder(models.Model):
    """Заказ кафе на определённый вид рыбы."""

    location = models.ForeignKey(
        'world.Location', on_delete=models.CASCADE,
        related_name='cafe_orders', verbose_name='Локация',
    )
    species = models.ForeignKey(
        'tackle.FishSpecies', on_delete=models.CASCADE,
        verbose_name='Вид рыбы',
    )
    quantity_required = models.IntegerField('Требуемое количество')
    min_weight_grams = models.IntegerField('Мин. вес одной рыбы (г)')
    reward_per_fish = models.DecimalField(
        'Награда за штуку', max_digits=10, decimal_places=2,
    )
    is_active = models.BooleanField('Активен', default=True)
    activated_at = models.DateTimeField('Время активации', auto_now_add=True)
    expires_at = models.DateTimeField('Истекает')

    class Meta:
        verbose_name = 'Заказ кафе'
        verbose_name_plural = 'Заказы кафе'
        ordering = ['-activated_at']

    def __str__(self):
        return (
            f'{self.location.name}: {self.species.name_ru} '
            f'x{self.quantity_required} (от {self.min_weight_grams}г)'
        )


class CafeDelivery(models.Model):
    """Прогресс игрока по заказу кафе."""

    order = models.ForeignKey(
        CafeOrder, on_delete=models.CASCADE,
        related_name='deliveries', verbose_name='Заказ',
    )
    player = models.ForeignKey(
        'accounts.Player', on_delete=models.CASCADE,
        related_name='cafe_deliveries', verbose_name='Игрок',
    )
    quantity_delivered = models.IntegerField('Сдано штук', default=0)

    class Meta:
        verbose_name = 'Сдача рыбы в кафе'
        verbose_name_plural = 'Сдачи рыбы в кафе'
        unique_together = ('order', 'player')

    def __str__(self):
        return f'{self.player.nickname}: {self.order} — {self.quantity_delivered}/{self.order.quantity_required}'

    @property
    def is_completed(self):
        """Заказ выполнен полностью."""
        return self.quantity_delivered >= self.order.quantity_required

    @property
    def remaining(self):
        """Сколько рыб осталось сдать."""
        return max(0, self.order.quantity_required - self.quantity_delivered)
