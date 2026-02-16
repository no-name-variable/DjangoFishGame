"""Модель игрока."""

from django.conf import settings
from django.db import models


class Player(models.Model):
    """Профиль игрока."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='player')
    nickname = models.CharField('Никнейм', max_length=50, unique=True)
    rank = models.IntegerField('Разряд', default=1)
    experience = models.IntegerField('Опыт', default=0)
    karma = models.IntegerField('Карма', default=0)
    money = models.DecimalField('Деньги', max_digits=12, decimal_places=2, default=500.00)
    gold = models.IntegerField('Голд (премиум)', default=0)
    hunger = models.IntegerField('Сытость (0-100)', default=100)
    current_base = models.ForeignKey(
        'world.Base', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='players', verbose_name='Текущая база',
    )
    current_location = models.ForeignKey(
        'world.Location', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='players', verbose_name='Текущая локация',
    )
    # Слоты для удочек (максимум 3)
    rod_slot_1 = models.ForeignKey(
        'inventory.PlayerRod', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='player_slot_1', verbose_name='Слот удочки 1',
    )
    rod_slot_2 = models.ForeignKey(
        'inventory.PlayerRod', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='player_slot_2', verbose_name='Слот удочки 2',
    )
    rod_slot_3 = models.ForeignKey(
        'inventory.PlayerRod', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='player_slot_3', verbose_name='Слот удочки 3',
    )
    created_at = models.DateTimeField('Создан', auto_now_add=True)
    updated_at = models.DateTimeField('Обновлён', auto_now=True)

    class Meta:
        verbose_name = 'Игрок'
        verbose_name_plural = 'Игроки'

    def __str__(self):
        return self.nickname

    @property
    def rank_title(self):
        """Название разряда."""
        titles = {
            1: 'Новичок', 5: 'Любитель', 10: 'Рыболов',
            20: 'Опытный рыболов', 30: 'Мастер', 50: 'Эксперт',
            75: 'Гуру', 100: 'Легенда',
        }
        result = 'Новичок'
        for level, title in titles.items():
            if self.rank >= level:
                result = title
        return result

    @property
    def experience_to_next_rank(self):
        """Опыт, необходимый для следующего разряда."""
        if self.rank < 50:
            return self.rank * 1000
        return 200000

    def add_experience(self, amount):
        """Добавить опыт и проверить повышение разряда."""
        self.experience += amount
        while self.experience >= self.experience_to_next_rank:
            self.experience -= self.experience_to_next_rank
            self.rank += 1
        self.save(update_fields=['experience', 'rank'])
