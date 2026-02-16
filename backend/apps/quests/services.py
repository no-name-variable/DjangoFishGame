"""Сервис обновления прогресса квестов при поимке рыбы."""

from django.utils import timezone

from .models import PlayerQuest


def update_quest_progress(player, species, weight, location):
    """
    Обновляет прогресс всех активных квестов игрока при поимке рыбы.
    Возвращает список завершённых квестов.
    """
    completed = []
    active_quests = PlayerQuest.objects.filter(
        player=player, status=PlayerQuest.Status.ACTIVE,
    ).select_related('quest', 'quest__target_species', 'quest__target_location')

    for pq in active_quests:
        quest = pq.quest

        # Проверяем локацию если задана
        if quest.target_location and quest.target_location_id != location.pk:
            continue

        if quest.quest_type == 'catch_fish':
            # Поймать N рыб (любых или конкретного вида)
            if quest.target_species and quest.target_species_id != species.pk:
                continue
            pq.progress += 1

        elif quest.quest_type == 'catch_weight':
            # Набрать суммарный вес
            if quest.target_species and quest.target_species_id != species.pk:
                continue
            pq.progress_weight += weight

        elif quest.quest_type == 'catch_species':
            # Поймать конкретный вид (любой размер)
            if quest.target_species_id != species.pk:
                continue
            pq.progress += 1

        # Проверяем завершение
        if _is_quest_complete(pq):
            pq.status = PlayerQuest.Status.COMPLETED
            pq.completed_at = timezone.now()
            completed.append(pq)

        pq.save()

    return completed


def _is_quest_complete(pq):
    """Проверяет, выполнен ли квест."""
    quest = pq.quest
    if quest.quest_type in ('catch_fish', 'catch_species'):
        return pq.progress >= quest.target_count
    elif quest.quest_type == 'catch_weight':
        return pq.progress_weight >= quest.target_weight
    return False
