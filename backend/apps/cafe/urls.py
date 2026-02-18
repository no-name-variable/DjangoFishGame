from django.urls import path

from .views import CafeDeliverView, CafeOrderListView

urlpatterns = [
    path('cafe/orders/', CafeOrderListView.as_view(), name='cafe-orders'),
    path('cafe/deliver/', CafeDeliverView.as_view(), name='cafe-deliver'),
]
