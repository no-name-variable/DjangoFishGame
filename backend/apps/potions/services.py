"""Сервисы зелий — дроп звёзд, проверка эффектов."""

import random


class PotionService:
    """Сервис зелий: дроп звёзд, проверка активных эффектов."""

    def drop_marine_star(self, player):
        """Попытка дропа морской звезды при поимке рыбы. Возвращает dict или None."""
        from .models import MarineStar, PlayerStar

        stars = list(MarineStar.objects.all())
        for star in stars:
            if random.random() < star.drop_chance:
                ps, _ = PlayerStar.objects.get_or_create(player=player, star=star)
                ps.quantity += 1
                ps.save(update_fields=['quantity'])
                return {'star_color': star.color, 'star_name': star.name}
        return None

    def has_active_potion(self, player, effect_type):
        """Проверяет, есть ли у игрока активное зелье нужного типа."""
        from .models import PlayerPotion

        potions = PlayerPotion.objects.filter(
            player=player, potion__effect_type=effect_type,
        ).select_related('potion')
        for p in potions:
            if p.is_active():
                return p.potion
        return None

    def get_potion_effect_value(self, player, effect_type):
        """Возвращает значение эффекта зелья или None."""
        potion = self.has_active_potion(player, effect_type)
        return potion.effect_value if potion else None
