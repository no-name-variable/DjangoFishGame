from django.urls import path

from .views import AcceptQuestView, AvailableQuestsView, ClaimQuestRewardView, PlayerQuestsView

urlpatterns = [
    path('quests/', AvailableQuestsView.as_view(), name='available-quests'),
    path('quests/my/', PlayerQuestsView.as_view(), name='player-quests'),
    path('quests/accept/', AcceptQuestView.as_view(), name='accept-quest'),
    path('quests/<int:pk>/claim/', ClaimQuestRewardView.as_view(), name='claim-quest-reward'),
]
