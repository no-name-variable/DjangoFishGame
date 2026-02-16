"""Celery-задачи турнирной системы."""

from celery import shared_task
from django.utils import timezone

from .models import Tournament
from .services import finalize_tournament


@shared_task
def check_and_finalize_tournaments():
    """
    Находит турниры, у которых истёк срок окончания,
    но итоги ещё не подведены, и завершает их.
    """
    pending = Tournament.objects.filter(
        is_finished=False,
        end_time__lte=timezone.now(),
    )
    for tournament in pending:
        finalize_tournament(tournament.pk)
