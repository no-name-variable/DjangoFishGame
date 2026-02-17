"""Use case: положить рыбу в садок."""

from dataclasses import dataclass, field

from django.conf import settings

from apps.fishing.models import FishingSession
from apps.inventory.models import CaughtFish
from apps.inventory.serializers import CaughtFishSerializer
from apps.potions.services import PotionService
from apps.quests.services import QuestService
from apps.records.services import RecordService


@dataclass
class KeepFishResult:
    caught_fish_data: dict
    is_record: bool = False
    completed_quests: list = field(default_factory=list)
    new_achievements: list = field(default_factory=list)
    star_drop: dict | None = None


class KeepFishUseCase:
    """Положить рыбу в садок, начислить опыт, проверить рекорды/квесты/достижения."""

    def __init__(
        self,
        record_service: RecordService,
        quest_service: QuestService,
        potion_service: PotionService,
    ):
        self._records = record_service
        self._quests = quest_service
        self._potions = potion_service

    def execute(self, player, session_id: int) -> KeepFishResult:
        """Raises: FishingSession.DoesNotExist, ValueError."""
        session = FishingSession.objects.select_related(
            'rod', 'hooked_species', 'location',
        ).get(pk=session_id, player=player)

        if session.state != FishingSession.State.CAUGHT:
            raise ValueError('Сессия не в нужном состоянии.')

        # Проверяем лимит садка
        creel_count = CaughtFish.objects.filter(
            player=player, is_sold=False, is_released=False,
        ).count()
        max_creel = settings.GAME_SETTINGS['MAX_CREEL_SIZE']
        if creel_count >= max_creel:
            raise ValueError(f'Садок полон ({max_creel} рыб).')

        caught = CaughtFish.objects.create(
            player=player,
            species=session.hooked_species,
            weight=session.hooked_weight,
            length=session.hooked_length,
            location=session.location,
        )

        player.add_experience(caught.experience_reward)

        record = self._records.check_record(
            player, session.hooked_species, session.hooked_weight,
            session.hooked_length, session.location,
        )
        if record:
            caught.is_record = True
            caught.save(update_fields=['is_record'])

        completed_quests = self._quests.update_quest_progress(
            player, session.hooked_species, session.hooked_weight, session.location,
        )
        new_achievements = self._records.check_achievements(player)
        star_drop = self._potions.drop_marine_star(player)

        # Расходуем наживку
        rod = session.rod
        if rod.bait and rod.bait_remaining > 0:
            rod.bait_remaining -= 1
            rod.save(update_fields=['bait_remaining'])

        session.delete()

        response = CaughtFishSerializer(caught).data
        if record:
            response['new_record'] = True
        if completed_quests:
            response['completed_quests'] = [pq.quest.name for pq in completed_quests]
        if new_achievements:
            response['new_achievements'] = [pa.achievement.name for pa in new_achievements]
        if star_drop:
            response['star_drop'] = star_drop

        return KeepFishResult(
            caught_fish_data=response,
            is_record=bool(record),
            completed_quests=completed_quests,
            new_achievements=new_achievements,
            star_drop=star_drop,
        )
