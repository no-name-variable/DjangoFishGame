from django.urls import path

from .views import (
    AchievementListView, FishRecordBySpeciesView, FishRecordListView,
    NewspaperView, PlayerAchievementsView, PlayerJournalView,
)

urlpatterns = [
    path('records/', FishRecordListView.as_view(), name='records'),
    path('records/species/<int:species_id>/', FishRecordBySpeciesView.as_view(), name='records-by-species'),
    path('achievements/', AchievementListView.as_view(), name='achievements'),
    path('player/achievements/', PlayerAchievementsView.as_view(), name='player-achievements'),
    path('player/journal/', PlayerJournalView.as_view(), name='player-journal'),
    path('newspaper/', NewspaperView.as_view(), name='newspaper'),
]
