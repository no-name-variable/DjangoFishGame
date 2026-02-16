from django.contrib import admin

from .models import Tournament, TournamentEntry


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'tournament_type', 'scoring', 'start_time', 'end_time',
        'entry_fee', 'prize_money', 'max_participants', 'is_active', 'is_finished',
    )
    list_filter = ('tournament_type', 'scoring', 'is_active', 'is_finished')
    search_fields = ('name',)


@admin.register(TournamentEntry)
class TournamentEntryAdmin(admin.ModelAdmin):
    list_display = ('tournament', 'player', 'score', 'fish_count', 'rank_position', 'joined_at')
    list_filter = ('tournament',)
    search_fields = ('player__nickname',)
