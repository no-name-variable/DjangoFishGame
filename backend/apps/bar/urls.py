from django.urls import path

from .views import BarDrinkListView, OrderDrinkView, PrepareSnackView

urlpatterns = [
    path('bar/drinks/', BarDrinkListView.as_view(), name='bar-drinks'),
    path('bar/order/', OrderDrinkView.as_view(), name='bar-order'),
    path('bar/snack/', PrepareSnackView.as_view(), name='bar-snack'),
]
