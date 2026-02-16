from django.urls import path

from .views import (
    BuyListingView,
    CancelListingView,
    CreateListingView,
    MarketListView,
    MyListingsView,
)

urlpatterns = [
    path('bazaar/', MarketListView.as_view(), name='bazaar-list'),
    path('bazaar/my/', MyListingsView.as_view(), name='bazaar-my'),
    path('bazaar/create/', CreateListingView.as_view(), name='bazaar-create'),
    path('bazaar/<int:pk>/buy/', BuyListingView.as_view(), name='bazaar-buy'),
    path('bazaar/<int:pk>/cancel/', CancelListingView.as_view(), name='bazaar-cancel'),
]
