"""Use case: получить награду за выполненный квест."""

from dataclasses import dataclass

from ..models import PlayerQuest


@dataclass
class ClaimRewardResult:
    """Результат получения награды."""

    quest_name: str
    reward_money: int
    reward_experience: int
    reward_karma: int
    reward_apparatus_part: str | None = None


class ClaimQuestRewardUseCase:
    """Получить награду за завершённый квест."""

    def execute(self, player, player_quest_id: int) -> ClaimRewardResult:
        """Raises: PlayerQuest.DoesNotExist, ValueError."""
        try:
            pq = PlayerQuest.objects.select_related('quest').get(
                pk=player_quest_id, player=player,
            )
        except PlayerQuest.DoesNotExist:
            raise PlayerQuest.DoesNotExist('Квест не найден.')

        if pq.status != PlayerQuest.Status.COMPLETED:
            raise ValueError('Квест ещё не завершён.')

        quest = pq.quest

        player.money += quest.reward_money
        player.karma += quest.reward_karma
        player.add_experience(quest.reward_experience)
        player.save(update_fields=['money', 'karma', 'rank', 'experience'])

        # Выдача детали аппарата
        apparatus_part_name = None
        if quest.reward_apparatus_part_id:
            from apps.home.models import PlayerApparatusPart
            PlayerApparatusPart.objects.get_or_create(
                player=player, part=quest.reward_apparatus_part,
            )
            apparatus_part_name = quest.reward_apparatus_part.name

        pq.status = PlayerQuest.Status.CLAIMED
        pq.save(update_fields=['status'])

        return ClaimRewardResult(
            quest_name=quest.name,
            reward_money=quest.reward_money,
            reward_experience=quest.reward_experience,
            reward_karma=quest.reward_karma,
            reward_apparatus_part=apparatus_part_name,
        )
