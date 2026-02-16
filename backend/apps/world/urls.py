from django.urls import path

from .views import BaseListView, BaseLocationsView, BaseTravelView, LocationEnterView, LocationLeaveView

urlpatterns = [
    path('bases/', BaseListView.as_view(), name='base-list'),
    path('bases/<int:base_id>/locations/', BaseLocationsView.as_view(), name='base-locations'),
    path('bases/<int:base_id>/travel/', BaseTravelView.as_view(), name='base-travel'),
    path('locations/<int:location_id>/enter/', LocationEnterView.as_view(), name='location-enter'),
    path('locations/<int:location_id>/leave/', LocationLeaveView.as_view(), name='location-leave'),
]
