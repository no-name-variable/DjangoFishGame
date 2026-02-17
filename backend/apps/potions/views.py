"""Views зелий."""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PlayerPotion, PlayerStar, Potion
from .serializers import (
    CraftPotionSerializer,
    PlayerPotionSerializer,
    PlayerStarSerializer,
    PotionSerializer,
)
from .use_cases.craft_potion import CraftPotionUseCase


def _resolve(use_case_cls):
    """Резолвит use case из DI-контейнера."""
    from config.container import container
    return container.resolve(use_case_cls)


class PotionListView(APIView):
    """Список всех зелий с информацией о возможности крафта."""

    def get(self, request):
        potions = Potion.objects.all()
        serializer = PotionSerializer(potions, many=True, context={'request': request})
        return Response(serializer.data)


class MyStarsView(APIView):
    """Морские звёзды игрока."""

    def get(self, request):
        stars = PlayerStar.objects.filter(player=request.user.player).select_related('star')
        return Response(PlayerStarSerializer(stars, many=True).data)


class ActivePotionsView(APIView):
    """Активные зелья игрока."""

    def get(self, request):
        potions = PlayerPotion.objects.filter(player=request.user.player).select_related('potion')
        active = [p for p in potions if p.is_active()]
        return Response(PlayerPotionSerializer(active, many=True).data)


class CraftPotionView(APIView):
    """Скрафтить зелье из морских звёзд."""

    def post(self, request):
        serializer = CraftPotionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uc = _resolve(CraftPotionUseCase)
        try:
            result = uc.execute(request.user.player, serializer.validated_data['potion_id'])
        except Potion.DoesNotExist:
            return Response({'error': 'Зелье не найдено.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        data = {'message': result.message}
        if result.effect:
            data['effect'] = result.effect
            data['duration_hours'] = result.duration_hours
        if result.new_rank is not None:
            data['new_rank'] = result.new_rank
        return Response(data)
