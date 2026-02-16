"""URL-маршруты рыбнадзора."""

from django.urls import path

from .views import InspectionHistoryView

urlpatterns = [
    path('inspections/', InspectionHistoryView.as_view(), name='inspection-history'),
]
