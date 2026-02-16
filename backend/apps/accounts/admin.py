from django.contrib import admin

from .models import Player


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ('nickname', 'user', 'rank', 'experience', 'karma', 'money', 'hunger')
    search_fields = ('nickname', 'user__username')
    list_filter = ('rank',)
