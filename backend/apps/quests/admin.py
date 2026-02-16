from django.contrib import admin

from .models import PlayerQuest, Quest


@admin.register(Quest)
class QuestAdmin(admin.ModelAdmin):
    list_display = ('name', 'quest_type', 'target_species', 'target_count', 'min_rank', 'reward_money', 'reward_experience')
    list_filter = ('quest_type', 'min_rank')


@admin.register(PlayerQuest)
class PlayerQuestAdmin(admin.ModelAdmin):
    list_display = ('player', 'quest', 'progress', 'status', 'started_at')
    list_filter = ('status',)
