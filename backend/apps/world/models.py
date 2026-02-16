"""Модели водоёмов и локаций."""

from django.db import models


class Base(models.Model):
    """Рыболовная база (регион)."""

    name = models.CharField('Название', max_length=100)
    description = models.TextField('Описание', blank=True)
    image = models.ImageField('Изображение', upload_to='bases/', blank=True)
    world_map_x = models.FloatField('X на карте мира', default=0)
    world_map_y = models.FloatField('Y на карте мира', default=0)
    min_rank = models.IntegerField('Мин. разряд', default=1)
    min_karma = models.IntegerField('Мин. карма', default=0)
    travel_cost = models.DecimalField('Стоимость переезда', max_digits=10, decimal_places=2, default=0)
    requires_vehicle = models.BooleanField('Требует транспорт', default=False)

    class Meta:
        verbose_name = 'База'
        verbose_name_plural = 'Базы'
        ordering = ['min_rank', 'name']

    def __str__(self):
        return self.name


class Location(models.Model):
    """Конкретная локация для рыбалки."""

    base = models.ForeignKey(Base, on_delete=models.CASCADE, related_name='locations', verbose_name='База')
    name = models.CharField('Название', max_length=100)
    description = models.TextField('Описание', blank=True)
    image_morning = models.ImageField('Изображение (утро)', upload_to='locations/', blank=True)
    image_day = models.ImageField('Изображение (день)', upload_to='locations/', blank=True)
    image_evening = models.ImageField('Изображение (вечер)', upload_to='locations/', blank=True)
    image_night = models.ImageField('Изображение (ночь)', upload_to='locations/', blank=True)
    depth_map = models.JSONField('Карта глубин', default=dict, blank=True)
    min_rank = models.IntegerField('Мин. разряд', default=1)
    requires_ticket = models.BooleanField('Требует путёвку', default=False)
    fish_species = models.ManyToManyField(
        'tackle.FishSpecies',
        through='LocationFish',
        verbose_name='Виды рыб',
    )

    class Meta:
        verbose_name = 'Локация'
        verbose_name_plural = 'Локации'
        ordering = ['base', 'name']

    def __str__(self):
        return f'{self.base.name} — {self.name}'


class LocationFish(models.Model):
    """Связь рыбы с локацией (с дополнительными параметрами)."""

    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='location_fish')
    fish = models.ForeignKey('tackle.FishSpecies', on_delete=models.CASCADE, related_name='location_fish')
    spawn_weight = models.FloatField('Вес спавна (0-1)', default=0.5, help_text='Относительная вероятность')
    depth_preference = models.FloatField('Предпочтительная глубина (м)', default=2.0)

    class Meta:
        verbose_name = 'Рыба на локации'
        verbose_name_plural = 'Рыбы на локациях'
        unique_together = ('location', 'fish')

    def __str__(self):
        return f'{self.fish.name_ru} @ {self.location.name}'
