from django.contrib import admin

from .models import ChatMessage


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('player', 'channel', 'channel_id', 'text', 'created_at')
    list_filter = ('channel',)
