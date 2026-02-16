"""Админка барахолки."""

from django.contrib import admin

from .models import MarketListing


@admin.register(MarketListing)
class MarketListingAdmin(admin.ModelAdmin):
    list_display = ('seller', 'item', 'quantity', 'price', 'is_active', 'created_at')
    list_filter = ('is_active', 'content_type')
