from django.contrib import admin

from .models import Team, TeamMembership


class TeamMembershipInline(admin.TabularInline):
    model = TeamMembership
    extra = 0


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'leader', 'member_count', 'created_at')
    inlines = [TeamMembershipInline]


@admin.register(TeamMembership)
class TeamMembershipAdmin(admin.ModelAdmin):
    list_display = ('player', 'team', 'role', 'joined_at')
    list_filter = ('role',)
