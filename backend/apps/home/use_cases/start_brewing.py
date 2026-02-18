"""Use case: начать варку самогона."""

from dataclasses import dataclass

from apps.fishing.models import GameTime

from ..models import BrewingSession, MoonshineRecipe, PlayerIngredient
from ..services import MoonshineService


@dataclass
class StartBrewingResult:
    """Результат начала варки."""
    recipe_name: str
    ready_at_hour: int
    ready_at_day: int


class StartBrewingUseCase:
    """Начать варку самогона: проверка аппарата + ингредиентов."""

    def __init__(self, moonshine_service: MoonshineService):
        self._moonshine = moonshine_service

    def execute(self, player, recipe_id: int) -> StartBrewingResult:
        """Raises: MoonshineRecipe.DoesNotExist, ValueError."""
        try:
            recipe = MoonshineRecipe.objects.get(pk=recipe_id)
        except MoonshineRecipe.DoesNotExist:
            raise MoonshineRecipe.DoesNotExist('Рецепт не найден.')

        if not self._moonshine.is_apparatus_complete(player):
            raise ValueError('Аппарат не собран. Соберите все 6 деталей.')

        # Проверяем, нет ли уже активной варки
        if BrewingSession.objects.filter(player=player).exists():
            raise ValueError('У вас уже есть активная варка.')

        # Проверяем ингредиенты
        for slug, qty in recipe.required_ingredients.items():
            pi = PlayerIngredient.objects.filter(
                player=player, ingredient__slug=slug,
            ).first()
            if not pi or pi.quantity < qty:
                have = pi.quantity if pi else 0
                raise ValueError(
                    f'Недостаточно ингредиента ({slug}). Нужно: {qty}, есть: {have}.',
                )

        # Списываем ингредиенты
        for slug, qty in recipe.required_ingredients.items():
            pi = PlayerIngredient.objects.get(player=player, ingredient__slug=slug)
            pi.quantity -= qty
            if pi.quantity <= 0:
                pi.delete()
            else:
                pi.save(update_fields=['quantity'])

        # Создаём сессию варки
        gt = GameTime.get_instance()
        ready_hour = gt.current_hour + recipe.crafting_time_hours
        ready_day = gt.current_day + ready_hour // 24
        ready_hour = ready_hour % 24

        session = BrewingSession.objects.create(
            player=player,
            recipe=recipe,
            started_at_hour=gt.current_hour,
            started_at_day=gt.current_day,
            ready_at_hour=ready_hour,
            ready_at_day=ready_day,
        )

        return StartBrewingResult(
            recipe_name=recipe.name,
            ready_at_hour=session.ready_at_hour,
            ready_at_day=session.ready_at_day,
        )
