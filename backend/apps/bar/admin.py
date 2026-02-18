"""Админка бара."""

from django.contrib import admin

from .models import BarDrink, BarDrinkOrder, BarSnackOrder


@admin.register(BarDrink)
class BarDrinkAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'satiety')


@admin.register(BarDrinkOrder)
class BarDrinkOrderAdmin(admin.ModelAdmin):
    list_display = ('player', 'drink', 'created_at')
    list_filter = ('drink',)


@admin.register(BarSnackOrder)
class BarSnackOrderAdmin(admin.ModelAdmin):
    list_display = ('player', 'fish', 'preparation', 'satiety_gained', 'created_at')
    list_filter = ('preparation',)
