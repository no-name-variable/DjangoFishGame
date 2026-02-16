from django.urls import path

from .views import (
    AssembleRodView, ChangeTackleView, CreelView, EatView,
    InventoryView, PlayerRodsView, RenameRodView, RodSettingsView,
)

urlpatterns = [
    path('player/inventory/', InventoryView.as_view(), name='inventory'),
    path('player/rods/', PlayerRodsView.as_view(), name='player-rods'),
    path('player/rods/<int:rod_id>/rename/', RenameRodView.as_view(), name='rename-rod'),
    path('player/rods/<int:rod_id>/settings/', RodSettingsView.as_view(), name='rod-settings'),
    path('player/rods/<int:rod_id>/tackle/', ChangeTackleView.as_view(), name='change-tackle'),
    path('player/creel/', CreelView.as_view(), name='creel'),
    path('player/eat/', EatView.as_view(), name='eat'),
    path('fishing/assemble-rod/', AssembleRodView.as_view(), name='assemble-rod'),
]
