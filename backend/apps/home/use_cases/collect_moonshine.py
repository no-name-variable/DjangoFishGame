"""Use case: забрать готовый самогон."""

from dataclasses import dataclass

from apps.fishing.models import GameTime

from ..models import BrewingSession, PlayerMoonshineBuff


@dataclass
class CollectMoonshineResult:
    """Результат сбора самогона."""
    recipe_name: str
    effect_type: str
    message: str
    duration_hours: int = 0
    hunger_restored: int = 0


class CollectMoonshineUseCase:
    """Забрать готовый самогон и получить бафф."""

    def execute(self, player, session_id: int) -> CollectMoonshineResult:
        """Raises: BrewingSession.DoesNotExist, ValueError."""
        try:
            session = BrewingSession.objects.select_related('recipe').get(
                pk=session_id, player=player,
            )
        except BrewingSession.DoesNotExist:
            raise BrewingSession.DoesNotExist('Сессия варки не найдена.')

        if session.status != BrewingSession.Status.READY:
            raise ValueError('Самогон ещё не готов.')

        recipe = session.recipe

        # Мгновенный эффект — восстановление сытости
        if recipe.effect_type == 'hunger_restore':
            restored = int(recipe.effect_value)
            player.hunger = min(100, player.hunger + restored)
            player.save(update_fields=['hunger'])
            session.delete()
            return CollectMoonshineResult(
                recipe_name=recipe.name,
                effect_type=recipe.effect_type,
                message=f'Сытость восстановлена на {restored}!',
                hunger_restored=restored,
            )

        # Длительный бафф
        gt = GameTime.get_instance()
        expire_hour = gt.current_hour + recipe.duration_hours
        expire_day = gt.current_day + expire_hour // 24
        expire_hour = expire_hour % 24

        PlayerMoonshineBuff.objects.create(
            player=player,
            recipe=recipe,
            activated_at_hour=gt.current_hour,
            activated_at_day=gt.current_day,
            expires_at_hour=expire_hour,
            expires_at_day=expire_day,
        )

        session.delete()

        return CollectMoonshineResult(
            recipe_name=recipe.name,
            effect_type=recipe.effect_type,
            message=f'Самогон "{recipe.name}" активирован!',
            duration_hours=recipe.duration_hours,
        )
