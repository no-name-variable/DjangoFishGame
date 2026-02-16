"""Модели зелий (отваров) и морских звёзд."""

from django.db import models


class MarineStar(models.Model):
    """Морская звезда — ресурс для крафта зелий."""

    class Color(models.TextChoices):
        RED = 'red', 'Красная'
        ORANGE = 'orange', 'Оранжевая'
        YELLOW = 'yellow', 'Жёлтая'
        GREEN = 'green', 'Зелёная'
        BLUE = 'blue', 'Синяя'
        PURPLE = 'purple', 'Фиолетовая'

    color = models.CharField('Цвет', max_length=10, choices=Color.choices, unique=True)
    name = models.CharField('Название', max_length=50)
    description = models.TextField('Описание', blank=True)
    drop_chance = models.FloatField('Шанс выпадения (0-1)', default=0.05)
    image = models.ImageField('Изображение', upload_to='stars/', blank=True)

    class Meta:
        verbose_name = 'Морская звезда'
        verbose_name_plural = 'Морские звёзды'

    def __str__(self):
        return self.name


class PlayerStar(models.Model):
    """Морские звёзды в инвентаре игрока."""

    player = models.ForeignKey('accounts.Player', on_delete=models.CASCADE, related_name='stars')
    star = models.ForeignKey(MarineStar, on_delete=models.CASCADE)
    quantity = models.IntegerField('Количество', default=0)

    class Meta:
        verbose_name = 'Звезда игрока'
        verbose_name_plural = 'Звёзды игроков'
        unique_together = ('player', 'star')

    def __str__(self):
        return f'{self.player.nickname}: {self.star.name} x{self.quantity}'


class Potion(models.Model):
    """Зелье (отвар) — крафтится из морских звёзд."""

    class EffectType(models.TextChoices):
        LUCK = 'luck', 'Удача'
        INVISIBILITY = 'invisibility', 'Невидимость'
        TREASURE = 'treasure', 'Клад'
        RARITY = 'rarity', 'Редкость'
        RANK_BOOST = 'rank_boost', 'Разряд'
        TROPHY = 'trophy', 'Трофей'

    name = models.CharField('Название', max_length=100)
    description = models.TextField('Описание', blank=True)
    image = models.ImageField('Изображение', upload_to='potions/', blank=True)
    effect_type = models.CharField('Тип эффекта', max_length=20, choices=EffectType.choices)
    effect_value = models.FloatField('Сила эффекта', default=1.0)
    karma_cost = models.IntegerField('Стоимость в карме', default=50)
    duration_hours = models.IntegerField('Длительность (игр. часов)', default=6)
    required_stars = models.JSONField(
        'Необходимые звёзды',
        default=dict,
        help_text='{"red": 3, "blue": 2}',
    )
    is_one_time = models.BooleanField('Одноразовое', default=False)

    class Meta:
        verbose_name = 'Зелье'
        verbose_name_plural = 'Зелья'
        ordering = ['karma_cost']

    def __str__(self):
        return self.name


class PlayerPotion(models.Model):
    """Активное зелье игрока."""

    player = models.ForeignKey('accounts.Player', on_delete=models.CASCADE, related_name='active_potions')
    potion = models.ForeignKey(Potion, on_delete=models.CASCADE)
    activated_at_hour = models.IntegerField('Час активации (игровой)')
    activated_at_day = models.IntegerField('День активации (игровой)')
    expires_at_hour = models.IntegerField('Час истечения (игровой)')
    expires_at_day = models.IntegerField('День истечения (игровой)')

    class Meta:
        verbose_name = 'Активное зелье'
        verbose_name_plural = 'Активные зелья'

    def __str__(self):
        return f'{self.player.nickname}: {self.potion.name}'

    def is_active(self):
        """Проверяет, активно ли зелье по игровому времени."""
        from apps.fishing.models import GameTime
        gt = GameTime.get_instance()
        if gt.current_day < self.expires_at_day:
            return True
        if gt.current_day == self.expires_at_day and gt.current_hour < self.expires_at_hour:
            return True
        return False
