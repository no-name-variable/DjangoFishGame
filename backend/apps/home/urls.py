"""URL-маршруты дома рыбака."""

from django.urls import path

from .views import (
    BuffsView,
    BrewingStatusView,
    CollectMoonshineView,
    PartsView,
    RecipesView,
    StartBrewingView,
)

urlpatterns = [
    path('home/parts/', PartsView.as_view(), name='home-parts'),
    path('home/recipes/', RecipesView.as_view(), name='home-recipes'),
    path('home/brew/', StartBrewingView.as_view(), name='home-brew'),
    path('home/brewing/', BrewingStatusView.as_view(), name='home-brewing'),
    path('home/collect/', CollectMoonshineView.as_view(), name='home-collect'),
    path('home/buffs/', BuffsView.as_view(), name='home-buffs'),
]
