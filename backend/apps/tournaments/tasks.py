"""Celery-задачи турнирной системы."""

from celery import shared_task
from django.utils import timezone

from .models import Tournament


@shared_task
def check_and_finalize_tournaments():
    """
    Находит турниры, у которых истёк срок окончания,
    но итоги ещё не подведены, и завершает их.
    """
    from config.container import container
    from .services import TournamentService

    svc = container.resolve(TournamentService)

    pending = Tournament.objects.filter(
        is_finished=False,
        end_time__lte=timezone.now(),
    )
    for tournament in pending:
        svc.finalize_tournament(tournament.pk)
