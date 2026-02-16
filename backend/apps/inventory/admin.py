from django.contrib import admin

from .models import CaughtFish, InventoryItem, PlayerRod


@admin.register(PlayerRod)
class PlayerRodAdmin(admin.ModelAdmin):
    list_display = ('player', 'rod_type', 'custom_name', 'is_assembled', 'durability_current')
    list_filter = ('is_assembled',)


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ('player', 'content_type', 'object_id', 'quantity')


@admin.register(CaughtFish)
class CaughtFishAdmin(admin.ModelAdmin):
    list_display = ('player', 'species', 'weight', 'length', 'location', 'caught_at', 'is_sold', 'is_released')
    list_filter = ('is_sold', 'is_released', 'is_record')
