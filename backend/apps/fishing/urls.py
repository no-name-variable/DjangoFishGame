from django.urls import path

from .views import (
    CastView, ChangeBaitView, FishingStatusView, GameTimeView, GroundbaitView, KeepFishView,
    PullRodView, ReelInView, ReleaseFishView, RetrieveRodView, StrikeView,
)

urlpatterns = [
    path('fishing/cast/', CastView.as_view(), name='fishing-cast'),
    path('fishing/status/', FishingStatusView.as_view(), name='fishing-status'),
    path('fishing/strike/', StrikeView.as_view(), name='fishing-strike'),
    path('fishing/reel-in/', ReelInView.as_view(), name='fishing-reel-in'),
    path('fishing/pull/', PullRodView.as_view(), name='fishing-pull'),
    path('fishing/keep/', KeepFishView.as_view(), name='fishing-keep'),
    path('fishing/release/', ReleaseFishView.as_view(), name='fishing-release'),
    path('fishing/retrieve/', RetrieveRodView.as_view(), name='fishing-retrieve'),
    path('fishing/change-bait/', ChangeBaitView.as_view(), name='fishing-change-bait'),
    path('fishing/groundbait/', GroundbaitView.as_view(), name='fishing-groundbait'),
    path('fishing/time/', GameTimeView.as_view(), name='game-time'),
]
