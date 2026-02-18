"""Модели рыбалки — сессия и вываживание."""

from django.db import models
from django.utils import timezone


class FishingSession(models.Model):
    """Текущая сессия рыбалки игрока."""

    class State(models.TextChoices):
        IDLE = 'idle', 'Без дела'
        WAITING = 'waiting', 'Ожидание поклёвки'
        NIBBLE = 'nibble', 'Подёргивание'
        BITE = 'bite', 'Поклёвка!'
        FIGHTING = 'fighting', 'Вываживание'
        CAUGHT = 'caught', 'Рыба поймана'

    player = models.ForeignKey('accounts.Player', on_delete=models.CASCADE, related_name='fishing_sessions')
    location = models.ForeignKey('world.Location', on_delete=models.CASCADE, verbose_name='Локация')
    rod = models.ForeignKey('inventory.PlayerRod', on_delete=models.CASCADE, verbose_name='Снасть')
    slot = models.PositiveSmallIntegerField('Слот удочки', default=1, db_default=1)
    state = models.CharField('Состояние', max_length=20, choices=State.choices, default=State.IDLE)
    cast_x = models.FloatField('Точка заброса X', default=0)
    cast_y = models.FloatField('Точка заброса Y', default=0)
    cast_time = models.DateTimeField('Время заброса', null=True, blank=True)
    bite_time = models.DateTimeField('Время поклёвки', null=True, blank=True)
    is_retrieving = models.BooleanField('Проводка (для спиннинга)', default=False)
    retrieve_progress = models.FloatField('Прогресс подматывания (0-1)', default=0.0)
    nibble_time = models.DateTimeField('Время начала подёргивания', null=True, blank=True)
    nibble_duration = models.FloatField('Длительность подёргивания (сек)', null=True, blank=True)
    bite_duration = models.FloatField('Длительность поклёвки (сек)', null=True, blank=True)
    hooked_species = models.ForeignKey(
        'tackle.FishSpecies', on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Клюнувшая рыба',
    )
    hooked_weight = models.FloatField('Вес клюнувшей рыбы', null=True, blank=True)
    hooked_length = models.FloatField('Длина клюнувшей рыбы', null=True, blank=True)

    class Meta:
        verbose_name = 'Сессия рыбалки'
        verbose_name_plural = 'Сессии рыбалки'

    def __str__(self):
        return f'{self.player.nickname} — {self.get_state_display()}'


class FightState(models.Model):
    """Состояние вываживания."""

    session = models.OneToOneField(FishingSession, on_delete=models.CASCADE, related_name='fight')
    fish_strength = models.FloatField('Сила рыбы', default=10.0)
    line_tension = models.FloatField('Натяжение лески (0-100)', default=0)
    distance = models.FloatField('Расстояние до берега (м)', default=20.0)
    rod_durability = models.FloatField('Прочность удилища', default=100)
    last_action_time = models.DateTimeField('Время последнего действия', default=timezone.now)

    class Meta:
        verbose_name = 'Состояние вываживания'
        verbose_name_plural = 'Состояния вываживания'

    def __str__(self):
        return f'Вываживание: натяжение={self.line_tension:.0f}%, дист={self.distance:.1f}м'


class GameTime(models.Model):
    """Глобальное игровое время (singleton)."""

    class TimeOfDay(models.TextChoices):
        MORNING = 'morning', 'Утро'
        DAY = 'day', 'День'
        EVENING = 'evening', 'Вечер'
        NIGHT = 'night', 'Ночь'

    current_hour = models.IntegerField('Текущий час (0-23)', default=8)
    current_day = models.IntegerField('Текущий день', default=1)
    last_tick = models.DateTimeField('Последний тик', default=timezone.now)

    class Meta:
        verbose_name = 'Игровое время'
        verbose_name_plural = 'Игровое время'

    def __str__(self):
        return f'День {self.current_day}, {self.current_hour}:00'

    @property
    def time_of_day(self):
        if 5 <= self.current_hour < 10:
            return self.TimeOfDay.MORNING
        elif 10 <= self.current_hour < 18:
            return self.TimeOfDay.DAY
        elif 18 <= self.current_hour < 22:
            return self.TimeOfDay.EVENING
        else:
            return self.TimeOfDay.NIGHT

    @classmethod
    def get_instance(cls):
        """Получить или создать единственный экземпляр."""
        instance, _ = cls.objects.get_or_create(pk=1)
        return instance


class GroundbaitSpot(models.Model):
    """Активный прикорм на точке ловли."""

    player = models.ForeignKey('accounts.Player', on_delete=models.CASCADE, related_name='groundbait_spots')
    location = models.ForeignKey('world.Location', on_delete=models.CASCADE)
    groundbait = models.ForeignKey('tackle.Groundbait', on_delete=models.CASCADE, verbose_name='Прикормка')
    flavoring = models.ForeignKey(
        'tackle.Flavoring', on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Ароматизатор',
    )
    applied_at = models.DateTimeField('Применено', auto_now_add=True)
    expires_at_hour = models.IntegerField('Истекает (игровой час)', default=0)
    expires_at_day = models.IntegerField('Истекает (игровой день)', default=0)

    class Meta:
        verbose_name = 'Точка прикорма'
        verbose_name_plural = 'Точки прикорма'

    def __str__(self):
        return f'{self.player.nickname}: {self.groundbait.name} на {self.location.name}'

    def is_active(self):
        """Проверяет, не истёк ли прикорм."""
        gt = GameTime.get_instance()
        if gt.current_day > self.expires_at_day:
            return False
        if gt.current_day == self.expires_at_day and gt.current_hour >= self.expires_at_hour:
            return False
        return True
