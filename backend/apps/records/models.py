"""Модели рекордов и достижений."""

from django.db import models


class FishRecord(models.Model):
    """Рекорд по виду рыбы."""

    species = models.ForeignKey('tackle.FishSpecies', on_delete=models.CASCADE, related_name='records')
    player = models.ForeignKey('accounts.Player', on_delete=models.CASCADE, related_name='records')
    weight = models.FloatField('Вес (кг)')
    length = models.FloatField('Длина (см)')
    location = models.ForeignKey('world.Location', on_delete=models.SET_NULL, null=True)
    caught_at = models.DateTimeField('Время поимки', auto_now_add=True)
    is_weekly_champion = models.BooleanField('Рекордсмен недели', default=False)

    class Meta:
        verbose_name = 'Рекорд'
        verbose_name_plural = 'Рекорды'
        ordering = ['-weight']

    def __str__(self):
        return f'{self.species.name_ru}: {self.weight}кг ({self.player.nickname})'


class Achievement(models.Model):
    """Достижение / медаль."""

    class Category(models.TextChoices):
        CATCH = 'catch', 'Поимка'
        RECORD = 'record', 'Рекорд'
        QUEST = 'quest', 'Квест'
        RANK = 'rank', 'Разряд'
        KARMA = 'karma', 'Карма'
        SPECIAL = 'special', 'Особое'

    name = models.CharField('Название', max_length=100)
    description = models.TextField('Описание')
    category = models.CharField('Категория', max_length=20, choices=Category.choices)
    icon = models.CharField('Иконка (emoji)', max_length=10, default='🏆')
    condition_type = models.CharField(
        'Тип условия', max_length=50,
        help_text='fish_count, species_count, total_weight, rank, karma, quest_count, record',
    )
    condition_value = models.IntegerField('Значение условия', default=1)
    reward_money = models.DecimalField('Награда (деньги)', max_digits=10, decimal_places=2, default=0)
    reward_experience = models.IntegerField('Награда (опыт)', default=0)

    class Meta:
        verbose_name = 'Достижение'
        verbose_name_plural = 'Достижения'
        ordering = ['category', 'condition_value']

    def __str__(self):
        return f'{self.icon} {self.name}'


class PlayerAchievement(models.Model):
    """Полученное достижение игрока."""

    player = models.ForeignKey('accounts.Player', on_delete=models.CASCADE, related_name='achievements')
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE, related_name='player_achievements')
    unlocked_at = models.DateTimeField('Разблокировано', auto_now_add=True)

    class Meta:
        verbose_name = 'Достижение игрока'
        verbose_name_plural = 'Достижения игроков'
        unique_together = ('player', 'achievement')

    def __str__(self):
        return f'{self.player.nickname}: {self.achievement.name}'
