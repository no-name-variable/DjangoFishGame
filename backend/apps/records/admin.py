from django.contrib import admin

from .models import Achievement, FishRecord, PlayerAchievement


@admin.register(FishRecord)
class FishRecordAdmin(admin.ModelAdmin):
    list_display = ('species', 'player', 'weight', 'length', 'location', 'caught_at', 'is_weekly_champion')
    list_filter = ('is_weekly_champion', 'species')
    search_fields = ('player__nickname',)


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'icon', 'condition_type', 'condition_value', 'reward_money', 'reward_experience')
    list_filter = ('category',)


@admin.register(PlayerAchievement)
class PlayerAchievementAdmin(admin.ModelAdmin):
    list_display = ('player', 'achievement', 'unlocked_at')
    list_filter = ('achievement__category',)
