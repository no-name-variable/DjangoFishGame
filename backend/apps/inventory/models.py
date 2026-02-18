"""Модели инвентаря игрока."""

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class PlayerRod(models.Model):
    """Собранная снасть игрока."""

    player = models.ForeignKey('accounts.Player', on_delete=models.CASCADE, related_name='rods')
    custom_name = models.CharField('Название сборки', max_length=64, blank=True, default='')
    rod_type = models.ForeignKey('tackle.RodType', on_delete=models.CASCADE, verbose_name='Удилище')
    reel = models.ForeignKey('tackle.Reel', on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Катушка')
    line = models.ForeignKey('tackle.Line', on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Леска')
    hook = models.ForeignKey('tackle.Hook', on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Крючок')
    float_tackle = models.ForeignKey(
        'tackle.FloatTackle', on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Поплавок',
    )
    bait = models.ForeignKey('tackle.Bait', on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Наживка')
    bait_remaining = models.IntegerField('Осталось наживки', default=0)
    durability_current = models.IntegerField('Текущая прочность', default=100)
    is_assembled = models.BooleanField('Собрана', default=False)
    depth_setting = models.FloatField('Глубина (м)', default=1.5)
    clip_distance = models.FloatField('Клипса - дистанция заброса (м)', default=30.0)

    class Meta:
        verbose_name = 'Снасть игрока'
        verbose_name_plural = 'Снасти игроков'

    def __str__(self):
        name = self.custom_name or self.rod_type.name
        return f'{self.player.nickname} — {name}'

    @property
    def display_name(self):
        """Название сборки: пользовательское или по типу удилища."""
        return self.custom_name or self.rod_type.name

    @property
    def rod_class(self):
        return self.rod_type.rod_class

    @property
    def is_ready(self):
        """Проверяет, что снасть полностью собрана для ловли."""
        base_ready = self.rod_type and self.line and self.hook
        if self.rod_type.rod_class == 'float':
            return bool(base_ready and self.float_tackle and self.bait and self.bait_remaining > 0)
        elif self.rod_type.rod_class == 'bottom':
            return bool(base_ready and self.bait and self.bait_remaining > 0)
        return False


class InventoryItem(models.Model):
    """Предмет в инвентаре (обобщённая связь)."""

    player = models.ForeignKey('accounts.Player', on_delete=models.CASCADE, related_name='inventory_items')
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    item = GenericForeignKey('content_type', 'object_id')
    quantity = models.IntegerField('Количество', default=1)

    class Meta:
        verbose_name = 'Предмет инвентаря'
        verbose_name_plural = 'Предметы инвентаря'
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
        ]

    def __str__(self):
        return f'{self.player.nickname}: {self.item} x{self.quantity}'


class CaughtFish(models.Model):
    """Пойманная рыба."""

    player = models.ForeignKey('accounts.Player', on_delete=models.CASCADE, related_name='caught_fish')
    species = models.ForeignKey('tackle.FishSpecies', on_delete=models.CASCADE, verbose_name='Вид')
    weight = models.FloatField('Вес (кг)')
    length = models.FloatField('Длина (см)')
    location = models.ForeignKey('world.Location', on_delete=models.SET_NULL, null=True, verbose_name='Локация')
    caught_at = models.DateTimeField('Время поимки', auto_now_add=True)
    is_sold = models.BooleanField('Продана', default=False)
    is_released = models.BooleanField('Отпущена', default=False)
    is_record = models.BooleanField('Рекорд', default=False)

    class Meta:
        verbose_name = 'Пойманная рыба'
        verbose_name_plural = 'Пойманные рыбы'
        ordering = ['-caught_at']

    def __str__(self):
        return f'{self.species.name_ru} {self.weight}кг ({self.player.nickname})'

    @property
    def sell_price(self):
        from decimal import Decimal
        return (self.species.sell_price_per_kg * Decimal(str(self.weight))).quantize(Decimal('0.01'))

    @property
    def experience_reward(self):
        return int(self.species.experience_per_kg * self.weight)

    @property
    def in_creel(self):
        """Рыба в садке (не продана и не отпущена)."""
        return not self.is_sold and not self.is_released
