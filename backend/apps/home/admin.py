"""Админка дома рыбака."""

from django.contrib import admin

from .models import (
    ApparatusPart,
    BrewingSession,
    MoonshineIngredient,
    MoonshineRecipe,
    PlayerApparatusPart,
    PlayerIngredient,
    PlayerMoonshineBuff,
)


@admin.register(ApparatusPart)
class ApparatusPartAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'order')


@admin.register(PlayerApparatusPart)
class PlayerApparatusPartAdmin(admin.ModelAdmin):
    list_display = ('player', 'part')
    list_filter = ('part',)


@admin.register(MoonshineIngredient)
class MoonshineIngredientAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'price')


@admin.register(PlayerIngredient)
class PlayerIngredientAdmin(admin.ModelAdmin):
    list_display = ('player', 'ingredient', 'quantity')
    list_filter = ('ingredient',)


@admin.register(MoonshineRecipe)
class MoonshineRecipeAdmin(admin.ModelAdmin):
    list_display = ('name', 'effect_type', 'effect_value', 'duration_hours', 'crafting_time_hours')
    list_filter = ('effect_type',)


@admin.register(BrewingSession)
class BrewingSessionAdmin(admin.ModelAdmin):
    list_display = ('player', 'recipe', 'status', 'started_at_day', 'started_at_hour', 'ready_at_day', 'ready_at_hour')
    list_filter = ('status', 'recipe')


@admin.register(PlayerMoonshineBuff)
class PlayerMoonshineBuffAdmin(admin.ModelAdmin):
    list_display = ('player', 'recipe', 'activated_at_day', 'activated_at_hour', 'expires_at_day', 'expires_at_hour')
    list_filter = ('recipe',)
