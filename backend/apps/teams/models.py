"""Модели команд/клубов."""

from django.db import models


class Team(models.Model):
    """Команда (клуб) рыбаков."""

    name = models.CharField('Название', max_length=100, unique=True)
    description = models.TextField('Описание', blank=True)
    logo_image = models.ImageField('Логотип', upload_to='teams/', blank=True)
    leader = models.ForeignKey(
        'accounts.Player', on_delete=models.CASCADE,
        related_name='led_teams', verbose_name='Лидер',
    )
    created_at = models.DateTimeField('Создана', auto_now_add=True)
    max_members = models.IntegerField('Макс. участников', default=20)

    class Meta:
        verbose_name = 'Команда'
        verbose_name_plural = 'Команды'
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def member_count(self):
        return self.memberships.count()


class TeamMembership(models.Model):
    """Членство в команде."""

    class Role(models.TextChoices):
        LEADER = 'leader', 'Лидер'
        OFFICER = 'officer', 'Офицер'
        MEMBER = 'member', 'Участник'

    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='memberships')
    player = models.ForeignKey(
        'accounts.Player', on_delete=models.CASCADE,
        related_name='team_memberships', verbose_name='Игрок',
    )
    role = models.CharField('Роль', max_length=20, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField('Вступил', auto_now_add=True)

    class Meta:
        verbose_name = 'Членство'
        verbose_name_plural = 'Членства'
        unique_together = ('team', 'player')

    def __str__(self):
        return f'{self.player.nickname} — {self.team.name} ({self.get_role_display()})'
