"""Views аккаунтов."""

from rest_framework import generics, permissions, status
from rest_framework.response import Response

from .models import Player
from .serializers import PlayerSerializer, RegisterSerializer


class RegisterView(generics.CreateAPIView):
    """Регистрация нового игрока."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        player = serializer.save()
        return Response(
            PlayerSerializer(player).data,
            status=status.HTTP_201_CREATED,
        )


class ProfileView(generics.RetrieveAPIView):
    """Профиль текущего игрока."""

    serializer_class = PlayerSerializer

    def get_object(self):
        return self.request.user.player
