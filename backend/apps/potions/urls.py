"""URL-маршруты зелий."""

from django.urls import path

from .views import ActivePotionsView, CraftPotionView, MyStarsView, PotionListView

urlpatterns = [
    path('potions/', PotionListView.as_view(), name='potion-list'),
    path('potions/craft/', CraftPotionView.as_view(), name='potion-craft'),
    path('potions/active/', ActivePotionsView.as_view(), name='potion-active'),
    path('potions/stars/', MyStarsView.as_view(), name='potion-stars'),
]
