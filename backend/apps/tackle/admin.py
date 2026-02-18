from django.contrib import admin

from .models import Bait, FishPriceDynamic, FishSpecies, Flavoring, FloatTackle, Food, Groundbait, Hook, Line, Reel, RodType


@admin.register(FishSpecies)
class FishSpeciesAdmin(admin.ModelAdmin):
    list_display = ('name_ru', 'name_latin', 'rarity', 'weight_min', 'weight_max', 'sell_price_per_kg')
    list_filter = ('rarity',)
    search_fields = ('name_ru', 'name_latin')


@admin.register(RodType)
class RodTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'rod_class', 'test_min', 'test_max', 'price', 'min_rank')
    list_filter = ('rod_class',)


@admin.register(Reel)
class ReelAdmin(admin.ModelAdmin):
    list_display = ('name', 'drag_power', 'line_capacity', 'price')


@admin.register(Line)
class LineAdmin(admin.ModelAdmin):
    list_display = ('name', 'breaking_strength', 'thickness', 'price')


@admin.register(Hook)
class HookAdmin(admin.ModelAdmin):
    list_display = ('name', 'size', 'price')


@admin.register(FloatTackle)
class FloatTackleAdmin(admin.ModelAdmin):
    list_display = ('name', 'capacity', 'sensitivity', 'price')



@admin.register(Bait)
class BaitAdmin(admin.ModelAdmin):
    list_display = ('name', 'quantity_per_pack', 'price')


@admin.register(Groundbait)
class GroundbaitAdmin(admin.ModelAdmin):
    list_display = ('name', 'effectiveness', 'duration_hours', 'price')


@admin.register(Flavoring)
class FlavoringAdmin(admin.ModelAdmin):
    list_display = ('name', 'bonus_multiplier', 'price')


@admin.register(Food)
class FoodAdmin(admin.ModelAdmin):
    list_display = ('name', 'satiety', 'price')


@admin.register(FishPriceDynamic)
class FishPriceDynamicAdmin(admin.ModelAdmin):
    list_display = ('species', 'location', 'sold_weight_today', 'current_modifier')
    list_filter = ('location',)
    readonly_fields = ('current_modifier',)

    def current_modifier(self, obj):
        return f'{obj.current_modifier:.2f}x'
    current_modifier.short_description = 'Модификатор цены'
