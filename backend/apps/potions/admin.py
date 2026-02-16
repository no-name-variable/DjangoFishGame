"""Админка зелий."""

from django.contrib import admin

from .models import MarineStar, PlayerPotion, PlayerStar, Potion


@admin.register(MarineStar)
class MarineStarAdmin(admin.ModelAdmin):
    list_display = ('name', 'color', 'drop_chance')


@admin.register(PlayerStar)
class PlayerStarAdmin(admin.ModelAdmin):
    list_display = ('player', 'star', 'quantity')
    list_filter = ('star',)


@admin.register(Potion)
class PotionAdmin(admin.ModelAdmin):
    list_display = ('name', 'effect_type', 'karma_cost', 'duration_hours', 'is_one_time')
    list_filter = ('effect_type', 'is_one_time')


@admin.register(PlayerPotion)
class PlayerPotionAdmin(admin.ModelAdmin):
    list_display = ('player', 'potion', 'activated_at_day', 'activated_at_hour', 'expires_at_day', 'expires_at_hour')
    list_filter = ('potion',)
