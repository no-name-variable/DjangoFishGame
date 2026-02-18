"""Модели дома рыбака — самогонный аппарат и самогон."""

from django.db import models


class ApparatusPart(models.Model):
    """Деталь самогонного аппарата (6 штук)."""

    name = models.CharField('Название', max_length=100)
    slug = models.SlugField('Slug', unique=True)
    description = models.TextField('Описание', blank=True)
    order = models.IntegerField('Порядок', default=0)

    class Meta:
        verbose_name = 'Деталь аппарата'
        verbose_name_plural = 'Детали аппарата'
        ordering = ['order']

    def __str__(self):
        return self.name


class PlayerApparatusPart(models.Model):
    """Собранная деталь игрока."""

    player = models.ForeignKey('accounts.Player', on_delete=models.CASCADE, related_name='apparatus_parts')
    part = models.ForeignKey(ApparatusPart, on_delete=models.CASCADE)

    class Meta:
        verbose_name = 'Деталь аппарата игрока'
        verbose_name_plural = 'Детали аппарата игроков'
        unique_together = ('player', 'part')

    def __str__(self):
        return f'{self.player.nickname}: {self.part.name}'


class MoonshineIngredient(models.Model):
    """Ингредиент для самогона."""

    name = models.CharField('Название', max_length=100)
    slug = models.SlugField('Slug', unique=True)
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2)
    description = models.TextField('Описание', blank=True)

    class Meta:
        verbose_name = 'Ингредиент'
        verbose_name_plural = 'Ингредиенты'

    def __str__(self):
        return f'{self.name} ({self.price}$)'


class PlayerIngredient(models.Model):
    """Купленные ингредиенты игрока."""

    player = models.ForeignKey('accounts.Player', on_delete=models.CASCADE, related_name='ingredients')
    ingredient = models.ForeignKey(MoonshineIngredient, on_delete=models.CASCADE)
    quantity = models.IntegerField('Количество', default=0)

    class Meta:
        verbose_name = 'Ингредиент игрока'
        verbose_name_plural = 'Ингредиенты игроков'
        unique_together = ('player', 'ingredient')

    def __str__(self):
        return f'{self.player.nickname}: {self.ingredient.name} x{self.quantity}'


class MoonshineRecipe(models.Model):
    """Рецепт самогона."""

    class EffectType(models.TextChoices):
        BITE_BOOST = 'bite_boost', 'Поклёвка +25%'
        EXPERIENCE_BOOST = 'experience_boost', 'Опыт +30%'
        HUNGER_RESTORE = 'hunger_restore', 'Восстановление сытости'
        LUCK = 'luck', 'Удача (редкие рыбы)'

    name = models.CharField('Название', max_length=100)
    description = models.TextField('Описание', blank=True)
    effect_type = models.CharField('Тип эффекта', max_length=20, choices=EffectType.choices)
    effect_value = models.FloatField('Сила эффекта', default=0.25)
    duration_hours = models.IntegerField('Длительность (игр. часов)', default=6)
    crafting_time_hours = models.IntegerField('Время варки (игр. часов)', default=3)
    required_ingredients = models.JSONField(
        'Необходимые ингредиенты',
        default=dict,
        help_text='{"sugar": 3, "yeast": 1}',
    )

    class Meta:
        verbose_name = 'Рецепт самогона'
        verbose_name_plural = 'Рецепты самогона'

    def __str__(self):
        return self.name


class BrewingSession(models.Model):
    """Сессия варки самогона."""

    class Status(models.TextChoices):
        BREWING = 'brewing', 'Варится'
        READY = 'ready', 'Готов'

    player = models.ForeignKey('accounts.Player', on_delete=models.CASCADE, related_name='brewing_sessions')
    recipe = models.ForeignKey(MoonshineRecipe, on_delete=models.CASCADE)
    status = models.CharField('Статус', max_length=10, choices=Status.choices, default=Status.BREWING)
    started_at_hour = models.IntegerField('Час начала (игровой)')
    started_at_day = models.IntegerField('День начала (игровой)')
    ready_at_hour = models.IntegerField('Час готовности (игровой)')
    ready_at_day = models.IntegerField('День готовности (игровой)')

    class Meta:
        verbose_name = 'Сессия варки'
        verbose_name_plural = 'Сессии варки'

    def __str__(self):
        return f'{self.player.nickname}: {self.recipe.name} ({self.get_status_display()})'


class PlayerMoonshineBuff(models.Model):
    """Активный бафф от самогона."""

    player = models.ForeignKey('accounts.Player', on_delete=models.CASCADE, related_name='moonshine_buffs')
    recipe = models.ForeignKey(MoonshineRecipe, on_delete=models.CASCADE)
    activated_at_hour = models.IntegerField('Час активации (игровой)')
    activated_at_day = models.IntegerField('День активации (игровой)')
    expires_at_hour = models.IntegerField('Час истечения (игровой)')
    expires_at_day = models.IntegerField('День истечения (игровой)')

    class Meta:
        verbose_name = 'Бафф самогона'
        verbose_name_plural = 'Баффы самогона'

    def __str__(self):
        return f'{self.player.nickname}: {self.recipe.name}'

    def is_active(self):
        """Проверяет, активен ли бафф по игровому времени."""
        from apps.fishing.models import GameTime
        gt = GameTime.get_instance()
        if gt.current_day < self.expires_at_day:
            return True
        if gt.current_day == self.expires_at_day and gt.current_hour < self.expires_at_hour:
            return True
        return False
