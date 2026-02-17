from django.urls import re_path

from .consumers import FishingConsumer

websocket_urlpatterns = [
    re_path(r'ws/fishing/$', FishingConsumer.as_asgi()),
]
