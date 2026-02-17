"""Сервис подведения итогов турниров."""

from collections import defaultdict
from decimal import Decimal

from django.db import transaction
from django.db.models import Count, Sum

from apps.inventory.models import CaughtFish

from .models import Tournament, TournamentEntry


class TournamentService:
    """Сервис турниров: подведение итогов, начисление призов."""

    def finalize_tournament(self, tournament_id):
        """
        Подводит итоги турнира:
        1. Рассчитывает очки участников по пойманной рыбе за период турнира.
        2. Расставляет места.
        3. Начисляет призы топ-3 (1-е: 100%, 2-е: 50%, 3-е: 25%).
        4. Помечает турнир как завершённый.
        """
        tournament = Tournament.objects.select_related(
            'target_species', 'target_location',
        ).get(pk=tournament_id)

        entries = TournamentEntry.objects.filter(
            tournament=tournament,
        ).select_related('player')

        # Подсчёт очков для каждого участника
        for entry in entries:
            fish_qs = CaughtFish.objects.filter(
                player=entry.player,
                caught_at__gte=tournament.start_time,
                caught_at__lte=tournament.end_time,
                is_released=False,
            )

            # Фильтрация по целевой локации
            if tournament.target_location:
                fish_qs = fish_qs.filter(location=tournament.target_location)

            # Фильтрация по целевому виду (для scoring=specific_fish)
            if tournament.scoring == Tournament.Scoring.SPECIFIC_FISH and tournament.target_species:
                fish_qs = fish_qs.filter(species=tournament.target_species)

            # Расчёт очков в зависимости от системы подсчёта
            if tournament.scoring == Tournament.Scoring.WEIGHT:
                aggregated = fish_qs.aggregate(
                    total_weight=Sum('weight'),
                    total_count=Count('id'),
                )
                entry.score = aggregated['total_weight'] or 0
                entry.fish_count = aggregated['total_count'] or 0

            elif tournament.scoring == Tournament.Scoring.COUNT:
                aggregated = fish_qs.aggregate(total_count=Count('id'))
                entry.score = aggregated['total_count'] or 0
                entry.fish_count = aggregated['total_count'] or 0

            elif tournament.scoring == Tournament.Scoring.SPECIFIC_FISH:
                aggregated = fish_qs.aggregate(
                    total_weight=Sum('weight'),
                    total_count=Count('id'),
                )
                entry.score = aggregated['total_weight'] or 0
                entry.fish_count = aggregated['total_count'] or 0

            entry.save(update_fields=['score', 'fish_count'])

        # Командный или индивидуальный турнир
        if tournament.tournament_type == Tournament.TournamentType.TEAM:
            self._finalize_team_tournament(tournament, entries)
        else:
            self._finalize_individual_tournament(tournament)

        # Завершение турнира
        tournament.is_finished = True
        tournament.save(update_fields=['is_finished'])

    def _finalize_individual_tournament(self, tournament):
        """Подведение итогов индивидуального турнира."""
        ranked_entries = TournamentEntry.objects.filter(
            tournament=tournament,
        ).select_related('player').order_by('-score')

        for position, entry in enumerate(ranked_entries, start=1):
            entry.rank_position = position
            entry.save(update_fields=['rank_position'])

        self._award_prizes(tournament, ranked_entries[:3])

    def _finalize_team_tournament(self, tournament, entries):
        """Подведение итогов командного турнира. Очки суммируются по команде."""
        team_scores = defaultdict(float)
        team_fish = defaultdict(int)
        team_entries = defaultdict(list)

        for entry in entries:
            if entry.team_id:
                team_scores[entry.team_id] += entry.score
                team_fish[entry.team_id] += entry.fish_count
                team_entries[entry.team_id].append(entry)

        # Ранжирование команд
        ranked_teams = sorted(team_scores.keys(), key=lambda t: team_scores[t], reverse=True)

        position = 1
        for team_id in ranked_teams:
            for entry in team_entries[team_id]:
                entry.rank_position = position
                entry.save(update_fields=['rank_position'])
            position += 1

        # Призы для топ-3 команд — делятся между членами
        prize_distribution = {
            0: Decimal('1.00'),
            1: Decimal('0.50'),
            2: Decimal('0.25'),
        }

        with transaction.atomic():
            for i, team_id in enumerate(ranked_teams[:3]):
                multiplier = prize_distribution.get(i)
                if multiplier is None:
                    continue
                members = team_entries[team_id]
                member_count = len(members)
                if member_count == 0:
                    continue

                for entry in members:
                    player = entry.player
                    if tournament.prize_money:
                        player.money += (tournament.prize_money * multiplier) / member_count
                    if tournament.prize_experience:
                        exp = int(tournament.prize_experience * float(multiplier) / member_count)
                        player.add_experience(exp)
                    if tournament.prize_karma:
                        player.karma += int(tournament.prize_karma * float(multiplier) / member_count)
                    player.save(update_fields=['money', 'karma', 'rank', 'experience'])

    def _award_prizes(self, tournament, top_entries):
        """Начисление призов топ-3 индивидуального турнира."""
        prize_distribution = {
            1: Decimal('1.00'),
            2: Decimal('0.50'),
            3: Decimal('0.25'),
        }

        with transaction.atomic():
            for entry in top_entries:
                multiplier = prize_distribution.get(entry.rank_position)
                if multiplier is None:
                    continue

                player = entry.player

                if tournament.prize_money:
                    player.money += tournament.prize_money * multiplier
                if tournament.prize_experience:
                    exp_reward = int(tournament.prize_experience * multiplier)
                    player.add_experience(exp_reward)
                if tournament.prize_karma:
                    player.karma += int(tournament.prize_karma * multiplier)

                player.save(update_fields=['money', 'karma', 'rank', 'experience'])
