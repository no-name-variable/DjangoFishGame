"""Админка кафе."""

from django.contrib import admin

from .models import CafeDelivery, CafeOrder


@admin.register(CafeOrder)
class CafeOrderAdmin(admin.ModelAdmin):
    list_display = (
        'location', 'species', 'quantity_required',
        'min_weight_grams', 'reward_per_fish', 'is_active', 'expires_at',
    )
    list_filter = ('is_active', 'location__base', 'location')
    search_fields = ('species__name_ru',)


@admin.register(CafeDelivery)
class CafeDeliveryAdmin(admin.ModelAdmin):
    list_display = ('player', 'order', 'quantity_delivered')
    list_filter = ('order__location__base',)
