from django.contrib import admin

from .models import FightState, FishingSession, GameTime


@admin.register(FishingSession)
class FishingSessionAdmin(admin.ModelAdmin):
    list_display = ('player', 'location', 'slot', 'state', 'rod', 'cast_time')
    list_filter = ('state', 'slot')


@admin.register(FightState)
class FightStateAdmin(admin.ModelAdmin):
    list_display = ('session', 'line_tension', 'distance', 'rod_durability')


@admin.register(GameTime)
class GameTimeAdmin(admin.ModelAdmin):
    list_display = ('current_hour', 'current_day', 'time_of_day', 'last_tick')
