"""Use case: начать варку самогона."""

from dataclasses import dataclass

from django.contrib.contenttypes.models import ContentType

from apps.fishing.models import GameTime
from apps.inventory.models import InventoryItem

from ..models import BrewingSession, MoonshineIngredient, MoonshineRecipe
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

    def _get_ingredient_item(self, player, slug):
        """Находит InventoryItem с ингредиентом по slug."""
        ingredient = MoonshineIngredient.objects.filter(slug=slug).first()
        if not ingredient:
            return None, 0
        ct = ContentType.objects.get_for_model(MoonshineIngredient)
        inv = InventoryItem.objects.filter(
            player=player, content_type=ct, object_id=ingredient.pk,
        ).first()
        return inv, inv.quantity if inv else 0

    def execute(self, player, recipe_id: int) -> StartBrewingResult:
        """Raises: MoonshineRecipe.DoesNotExist, ValueError."""
        try:
            recipe = MoonshineRecipe.objects.get(pk=recipe_id)
        except MoonshineRecipe.DoesNotExist:
            raise MoonshineRecipe.DoesNotExist('Рецепт не найден.')

        if not self._moonshine.is_apparatus_complete(player):
            raise ValueError('Аппарат не собран. Соберите все 6 деталей.')

        if BrewingSession.objects.filter(player=player).exists():
            raise ValueError('У вас уже есть активная варка.')

        # Проверяем ингредиенты в инвентаре
        for slug, qty in recipe.required_ingredients.items():
            _, have = self._get_ingredient_item(player, slug)
            if have < qty:
                raise ValueError(
                    f'Недостаточно ингредиента ({slug}). Нужно: {qty}, есть: {have}.',
                )

        # Списываем ингредиенты из инвентаря
        for slug, qty in recipe.required_ingredients.items():
            inv, _ = self._get_ingredient_item(player, slug)
            inv.quantity -= qty
            if inv.quantity <= 0:
                inv.delete()
            else:
                inv.save(update_fields=['quantity'])

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
