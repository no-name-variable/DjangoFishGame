from django.urls import path

from .views import ShopBuyView, ShopCategoryView, SellFishView, RepairRodView

urlpatterns = [
    path('shop/buy/', ShopBuyView.as_view(), name='shop-buy'),
    path('shop/sell-fish/', SellFishView.as_view(), name='sell-fish'),
    path('shop/repair-rod/', RepairRodView.as_view(), name='repair-rod'),
    path('shop/<str:category>/', ShopCategoryView.as_view(), name='shop-category'),
]
