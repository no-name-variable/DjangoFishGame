"""Модели турнирной системы."""

from django.db import models


class Tournament(models.Model):
    """Турнир (индивидуальный или командный)."""

    class TournamentType(models.TextChoices):
        INDIVIDUAL = 'individual', 'Индивидуальный'
        TEAM = 'team', 'Командный'

    class Scoring(models.TextChoices):
        WEIGHT = 'weight', 'По весу'
        COUNT = 'count', 'По количеству'
        SPECIFIC_FISH = 'specific_fish', 'По конкретной рыбе'

    name = models.CharField('Название', max_length=200)
    description = models.TextField('Описание', blank=True)
    tournament_type = models.CharField(
        'Тип турнира', max_length=20,
        choices=TournamentType.choices, default=TournamentType.INDIVIDUAL,
    )
    scoring = models.CharField(
        'Система подсчёта', max_length=20,
        choices=Scoring.choices, default=Scoring.WEIGHT,
    )
    target_species = models.ForeignKey(
        'tackle.FishSpecies', on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name='Целевой вид рыбы',
        related_name='tournaments',
    )
    target_location = models.ForeignKey(
        'world.Location', on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name='Целевая локация',
        related_name='tournaments',
    )
    start_time = models.DateTimeField('Начало')
    end_time = models.DateTimeField('Окончание')
    entry_fee = models.DecimalField('Вступительный взнос', max_digits=10, decimal_places=2, default=0)
    prize_money = models.DecimalField('Призовой фонд', max_digits=12, decimal_places=2, default=0)
    prize_experience = models.IntegerField('Призовой опыт', default=0)
    prize_karma = models.IntegerField('Призовая карма', default=0)
    min_rank = models.IntegerField('Мин. разряд', default=1)
    max_participants = models.IntegerField('Макс. участников', default=100)
    is_active = models.BooleanField('Активен', default=True)
    is_finished = models.BooleanField('Завершён', default=False)
    created_by = models.ForeignKey(
        'accounts.Player', on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name='Создатель',
        related_name='created_tournaments',
    )

    class Meta:
        verbose_name = 'Турнир'
        verbose_name_plural = 'Турниры'
        ordering = ['-start_time']

    def __str__(self):
        return self.name


class TournamentEntry(models.Model):
    """Участие игрока в турнире."""

    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE,
        related_name='entries', verbose_name='Турнир',
    )
    player = models.ForeignKey(
        'accounts.Player', on_delete=models.CASCADE,
        related_name='tournament_entries', verbose_name='Игрок',
    )
    team = models.ForeignKey(
        'teams.Team', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='tournament_entries',
        verbose_name='Команда',
    )
    score = models.FloatField('Очки', default=0)
    fish_count = models.IntegerField('Количество рыб', default=0)
    rank_position = models.IntegerField('Место', default=0)
    joined_at = models.DateTimeField('Дата регистрации', auto_now_add=True)

    class Meta:
        verbose_name = 'Участие в турнире'
        verbose_name_plural = 'Участия в турнирах'
        unique_together = ('tournament', 'player')

    def __str__(self):
        return f'{self.player.nickname} — {self.tournament.name} (#{self.rank_position})'
