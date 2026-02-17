"""Сервис проверки рекордов и достижений."""

from django.db.models import Sum

from apps.inventory.models import CaughtFish

from .models import Achievement, FishRecord, PlayerAchievement


class RecordService:
    """Сервис рекордов и достижений."""

    def check_record(self, player, species, weight, length, location):
        """
        Проверяет, является ли пойманная рыба рекордом.
        Возвращает FishRecord если новый рекорд, иначе None.
        """
        current_record = FishRecord.objects.filter(species=species).order_by('-weight').first()

        if current_record is None or weight > current_record.weight:
            record = FishRecord.objects.create(
                species=species,
                player=player,
                weight=weight,
                length=length,
                location=location,
            )
            return record
        return None

    def check_achievements(self, player):
        """
        Проверяет и выдаёт достижения игроку.
        Возвращает список новых достижений.
        """
        unlocked = []
        existing = set(
            PlayerAchievement.objects.filter(player=player).values_list('achievement_id', flat=True)
        )

        for achievement in Achievement.objects.exclude(pk__in=existing):
            if self._check_condition(player, achievement):
                pa = PlayerAchievement.objects.create(player=player, achievement=achievement)
                # Начислить награду
                if achievement.reward_money:
                    player.money += achievement.reward_money
                if achievement.reward_experience:
                    player.add_experience(achievement.reward_experience)
                unlocked.append(pa)

        if unlocked:
            player.save(update_fields=['money'])

        return unlocked

    def _check_condition(self, player, achievement):
        """Проверяет, выполнено ли условие достижения."""
        ct = achievement.condition_type
        val = achievement.condition_value

        if ct == 'fish_count':
            count = CaughtFish.objects.filter(player=player).count()
            return count >= val

        elif ct == 'species_count':
            count = CaughtFish.objects.filter(player=player).values('species').distinct().count()
            return count >= val

        elif ct == 'total_weight':
            total = CaughtFish.objects.filter(player=player).aggregate(s=Sum('weight'))['s'] or 0
            return total >= val

        elif ct == 'rank':
            return player.rank >= val

        elif ct == 'karma':
            return player.karma >= val

        elif ct == 'quest_count':
            from apps.quests.models import PlayerQuest
            count = PlayerQuest.objects.filter(player=player, status='completed').count()
            return count >= val

        elif ct == 'record':
            count = FishRecord.objects.filter(player=player).count()
            return count >= val

        return False
