from django.contrib import admin

from .models import Base, Location, LocationFish


class LocationFishInline(admin.TabularInline):
    model = LocationFish
    extra = 1


@admin.register(Base)
class BaseAdmin(admin.ModelAdmin):
    list_display = ('name', 'min_rank', 'min_karma', 'travel_cost', 'requires_vehicle')


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'base', 'min_rank', 'requires_ticket')
    list_filter = ('base',)
    inlines = [LocationFishInline]
