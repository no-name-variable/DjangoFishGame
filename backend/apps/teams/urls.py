from django.urls import path

from .views import CreateTeamView, JoinTeamView, LeaveTeamView, MyTeamView, TeamDetailView, TeamListView

urlpatterns = [
    path('teams/', TeamListView.as_view(), name='team-list'),
    path('teams/create/', CreateTeamView.as_view(), name='team-create'),
    path('teams/my/', MyTeamView.as_view(), name='my-team'),
    path('teams/leave/', LeaveTeamView.as_view(), name='team-leave'),
    path('teams/<int:pk>/', TeamDetailView.as_view(), name='team-detail'),
    path('teams/<int:pk>/join/', JoinTeamView.as_view(), name='team-join'),
]
