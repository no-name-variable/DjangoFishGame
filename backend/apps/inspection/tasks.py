"""Celery-задачи рыбнадзора."""

import random

from celery import shared_task


@shared_task
def fish_inspection():
    """
    Периодическая проверка рыбнадзора.

    Выбирает всех активных игроков (находящихся на локации)
    и с вероятностью 10% проводит проверку каждого.
    """
    from apps.accounts.models import Player

    from .services import inspect_player

    active_players = Player.objects.filter(
        current_location__isnull=False,
    )

    for player in active_players:
        if random.random() < 0.10:
            inspect_player(player)
