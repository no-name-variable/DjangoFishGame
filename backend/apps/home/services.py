"""Сервисы дома рыбака — проверка баффов самогона."""


class MoonshineService:
    """Сервис самогона: проверка активных баффов."""

    def has_active_buff(self, player, effect_type):
        """Проверяет, есть ли у игрока активный бафф нужного типа."""
        from .models import PlayerMoonshineBuff

        buffs = PlayerMoonshineBuff.objects.filter(
            player=player, recipe__effect_type=effect_type,
        ).select_related('recipe')
        for b in buffs:
            if b.is_active():
                return b.recipe
        return None

    def get_buff_effect_value(self, player, effect_type):
        """Возвращает значение эффекта баффа или None."""
        recipe = self.has_active_buff(player, effect_type)
        return recipe.effect_value if recipe else None

    def is_apparatus_complete(self, player):
        """Проверяет, собран ли аппарат полностью (все 6 деталей)."""
        from .models import ApparatusPart, PlayerApparatusPart
        total = ApparatusPart.objects.count()
        collected = PlayerApparatusPart.objects.filter(player=player).count()
        return collected >= total
