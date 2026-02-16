"""Модели рыбнадзора."""

from django.db import models


class FishInspection(models.Model):
    """Проверка рыбнадзора."""

    class ViolationType(models.TextChoices):
        FORBIDDEN_SPECIES = 'forbidden_species', 'Запрещённый вид'
        SIZE_LIMIT = 'size_limit', 'Размерное нарушение'
        CREEL_LIMIT = 'creel_limit', 'Превышение лимита садка'

    player = models.ForeignKey(
        'accounts.Player', on_delete=models.CASCADE,
        related_name='inspections', verbose_name='Игрок',
    )
    location = models.ForeignKey(
        'world.Location', on_delete=models.SET_NULL,
        null=True, verbose_name='Локация',
    )
    checked_at = models.DateTimeField('Время проверки', auto_now_add=True)
    violation_found = models.BooleanField('Нарушение обнаружено', default=False)
    violation_type = models.CharField(
        'Тип нарушения', max_length=30,
        choices=ViolationType.choices, blank=True,
    )
    fine_amount = models.DecimalField(
        'Сумма штрафа', max_digits=10, decimal_places=2, default=0,
    )
    karma_penalty = models.IntegerField('Штраф кармы', default=0)
    details = models.TextField('Описание нарушения', blank=True)

    class Meta:
        verbose_name = 'Проверка рыбнадзора'
        verbose_name_plural = 'Проверки рыбнадзора'
        ordering = ['-checked_at']

    def __str__(self):
        status = 'Нарушение' if self.violation_found else 'Чисто'
        return f'{self.player} — {status} ({self.checked_at})'
