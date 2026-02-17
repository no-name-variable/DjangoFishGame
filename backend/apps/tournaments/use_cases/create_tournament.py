"""Use case: создание турнира игроком."""

from ..models import Tournament


class CreateTournamentUseCase:
    """Создание турнира с проверкой разряда и списанием денег."""

    MIN_RANK_TO_CREATE = 3
    CREATION_FEE = 100

    def execute(self, player, validated_data: dict) -> Tournament:
        """Raises: ValueError."""
        if player.rank < self.MIN_RANK_TO_CREATE:
            raise ValueError(
                f'Для создания турниров требуется минимум {self.MIN_RANK_TO_CREATE} разряд.',
            )

        if player.money < self.CREATION_FEE:
            raise ValueError(
                f'Недостаточно денег. Создание турнира стоит {self.CREATION_FEE}$.',
            )

        player.money -= self.CREATION_FEE
        player.save(update_fields=['money'])

        tournament = Tournament.objects.create(
            **validated_data, created_by=player, is_active=True,
        )
        return tournament
