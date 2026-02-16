from django.urls import path

from .views import JoinTournamentView, TournamentDetailView, TournamentListView, TournamentResultsView

urlpatterns = [
    path('tournaments/', TournamentListView.as_view(), name='tournaments'),
    path('tournaments/<int:pk>/', TournamentDetailView.as_view(), name='tournament-detail'),
    path('tournaments/join/', JoinTournamentView.as_view(), name='tournament-join'),
    path('tournaments/<int:pk>/results/', TournamentResultsView.as_view(), name='tournament-results'),
]
