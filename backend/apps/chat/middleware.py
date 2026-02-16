"""JWT-авторизация для WebSocket."""

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken


@database_sync_to_async
def get_user(token_key):
    from django.contrib.auth.models import User
    try:
        token = AccessToken(token_key)
        return User.objects.get(pk=token['user_id'])
    except Exception:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """Извлекает JWT-токен из query string и устанавливает user в scope."""

    async def __call__(self, scope, receive, send):
        from urllib.parse import parse_qs
        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token = params.get('token', [None])[0]

        if token:
            scope['user'] = await get_user(token)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
