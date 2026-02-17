"""Use case: скрафтить зелье из морских звёзд."""

from dataclasses import dataclass

from apps.fishing.models import GameTime

from ..models import PlayerPotion, PlayerStar, Potion


@dataclass
class CraftPotionResult:
    """Результат крафта зелья."""

    message: str
    effect: str = ''
    duration_hours: int = 0
    new_rank: int | None = None


class CraftPotionUseCase:
    """Крафт зелья: проверка ресурсов, списание, активация."""

    def execute(self, player, potion_id: int) -> CraftPotionResult:
        """Raises: Potion.DoesNotExist, ValueError."""
        try:
            potion = Potion.objects.get(pk=potion_id)
        except Potion.DoesNotExist:
            raise Potion.DoesNotExist('Зелье не найдено.')

        if player.karma < potion.karma_cost:
            raise ValueError(
                f'Недостаточно кармы. Нужно: {potion.karma_cost}, есть: {player.karma}.',
            )

        for color, qty in potion.required_stars.items():
            ps = PlayerStar.objects.filter(player=player, star__color=color).first()
            if not ps or ps.quantity < qty:
                have = ps.quantity if ps else 0
                raise ValueError(
                    f'Недостаточно звёзд ({color}). Нужно: {qty}, есть: {have}.',
                )

        # Списываем ресурсы
        player.karma -= potion.karma_cost
        player.save(update_fields=['karma'])

        for color, qty in potion.required_stars.items():
            ps = PlayerStar.objects.get(player=player, star__color=color)
            ps.quantity -= qty
            if ps.quantity <= 0:
                ps.delete()
            else:
                ps.save(update_fields=['quantity'])

        # Одноразовые зелья — мгновенный эффект
        if potion.is_one_time:
            return self._apply_instant(player, potion)

        # Длительные — создаём активное зелье
        gt = GameTime.get_instance()
        expire_hour = gt.current_hour + potion.duration_hours
        expire_day = gt.current_day + expire_hour // 24
        expire_hour = expire_hour % 24

        PlayerPotion.objects.create(
            player=player,
            potion=potion,
            activated_at_hour=gt.current_hour,
            activated_at_day=gt.current_day,
            expires_at_hour=expire_hour,
            expires_at_day=expire_day,
        )

        return CraftPotionResult(
            message=f'Зелье "{potion.name}" активировано!',
            effect=potion.effect_type,
            duration_hours=potion.duration_hours,
        )

    def _apply_instant(self, player, potion) -> CraftPotionResult:
        """Мгновенный эффект одноразового зелья."""
        if potion.effect_type == 'rank_boost':
            player.rank += int(potion.effect_value)
            player.save(update_fields=['rank'])
            return CraftPotionResult(
                message=f'Разряд повышен до {player.rank}!',
                new_rank=player.rank,
            )
        return CraftPotionResult(message=f'Зелье "{potion.name}" использовано!')
