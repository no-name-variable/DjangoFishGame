"""Use case: взять квест."""

from ..models import PlayerQuest, Quest


class AcceptQuestUseCase:
    """Принять квест с проверками разряда и предварительного квеста."""

    def execute(self, player, quest_id: int) -> PlayerQuest:
        """Raises: Quest.DoesNotExist, ValueError."""
        try:
            quest = Quest.objects.get(pk=quest_id)
        except Quest.DoesNotExist:
            raise Quest.DoesNotExist('Квест не найден.')

        if quest.min_rank > player.rank:
            raise ValueError('Недостаточный разряд.')

        if quest.prerequisite_quest_id:
            has_prereq = PlayerQuest.objects.filter(
                player=player, quest=quest.prerequisite_quest,
                status__in=[PlayerQuest.Status.COMPLETED, PlayerQuest.Status.CLAIMED],
            ).exists()
            if not has_prereq:
                raise ValueError('Сначала выполните предварительный квест.')

        if PlayerQuest.objects.filter(player=player, quest=quest).exists():
            raise ValueError('Квест уже взят.')

        return PlayerQuest.objects.create(player=player, quest=quest)
