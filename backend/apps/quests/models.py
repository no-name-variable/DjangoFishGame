"""Модели квестов."""

from django.db import models


class Quest(models.Model):
    """Задание для игрока."""

    class QuestType(models.TextChoices):
        CATCH_FISH = 'catch_fish', 'Поймать рыбу'
        CATCH_WEIGHT = 'catch_weight', 'Поймать вес'
        CATCH_SPECIES = 'catch_species', 'Поймать вид'

    name = models.CharField('Название', max_length=200)
    description = models.TextField('Описание')
    quest_type = models.CharField('Тип', max_length=20, choices=QuestType.choices)
    target_species = models.ForeignKey(
        'tackle.FishSpecies', on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name='Целевой вид',
    )
    target_count = models.IntegerField('Целевое количество', default=1)
    target_weight = models.FloatField('Целевой вес (кг)', default=0)
    target_location = models.ForeignKey(
        'world.Location', on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name='Целевая локация',
    )
    reward_money = models.DecimalField('Награда (деньги)', max_digits=10, decimal_places=2, default=0)
    reward_experience = models.IntegerField('Награда (опыт)', default=0)
    reward_karma = models.IntegerField('Награда (карма)', default=0)
    reward_apparatus_part = models.ForeignKey(
        'home.ApparatusPart', on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name='Награда: деталь аппарата',
    )
    prerequisite_quest = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        verbose_name='Предварительный квест',
    )
    min_rank = models.IntegerField('Мин. разряд', default=1)
    order = models.IntegerField('Порядок', default=0)

    class Meta:
        verbose_name = 'Квест'
        verbose_name_plural = 'Квесты'
        ordering = ['order', 'min_rank']

    def __str__(self):
        return self.name


class PlayerQuest(models.Model):
    """Прогресс квеста игрока."""

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Активный'
        COMPLETED = 'completed', 'Завершён'
        CLAIMED = 'claimed', 'Награда получена'

    player = models.ForeignKey('accounts.Player', on_delete=models.CASCADE, related_name='quests')
    quest = models.ForeignKey(Quest, on_delete=models.CASCADE, related_name='player_quests')
    progress = models.IntegerField('Прогресс', default=0)
    progress_weight = models.FloatField('Прогресс (вес)', default=0)
    status = models.CharField('Статус', max_length=20, choices=Status.choices, default=Status.ACTIVE)
    started_at = models.DateTimeField('Начат', auto_now_add=True)
    completed_at = models.DateTimeField('Завершён', null=True, blank=True)

    class Meta:
        verbose_name = 'Квест игрока'
        verbose_name_plural = 'Квесты игроков'
        unique_together = ('player', 'quest')

    def __str__(self):
        return f'{self.player.nickname}: {self.quest.name} ({self.get_status_display()})'
