"""Админка рыбнадзора."""

from django.contrib import admin

from .models import FishInspection


@admin.register(FishInspection)
class FishInspectionAdmin(admin.ModelAdmin):
    """Админ-панель проверок рыбнадзора."""

    list_display = [
        'player', 'location', 'checked_at',
        'violation_found', 'violation_type', 'fine_amount', 'karma_penalty',
    ]
    list_filter = ['violation_found', 'violation_type', 'checked_at']
    search_fields = ['player__nickname']
    readonly_fields = ['checked_at']
