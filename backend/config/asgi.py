"""ASGI-конфигурация с поддержкой WebSocket (django-channels)."""

import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django_asgi_app = get_asgi_application()

from apps.chat.middleware import JWTAuthMiddleware
from apps.chat.routing import websocket_urlpatterns as chat_ws
from apps.fishing.routing import websocket_urlpatterns as fishing_ws

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': JWTAuthMiddleware(
        URLRouter(chat_ws + fishing_ws)
    ),
})
