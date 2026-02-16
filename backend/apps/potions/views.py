"""Views зелий."""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.fishing.models import GameTime

from .models import PlayerPotion, PlayerStar, Potion
from .serializers import (
    CraftPotionSerializer,
    PlayerPotionSerializer,
    PlayerStarSerializer,
    PotionSerializer,
)


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

        player = request.user.player
        try:
            potion = Potion.objects.get(pk=serializer.validated_data['potion_id'])
        except Potion.DoesNotExist:
            return Response({'error': 'Зелье не найдено.'}, status=status.HTTP_404_NOT_FOUND)

        # Проверка кармы
        if player.karma < potion.karma_cost:
            return Response(
                {'error': f'Недостаточно кармы. Нужно: {potion.karma_cost}, есть: {player.karma}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Проверка звёзд
        for color, qty in potion.required_stars.items():
            ps = PlayerStar.objects.filter(player=player, star__color=color).first()
            if not ps or ps.quantity < qty:
                have = ps.quantity if ps else 0
                return Response(
                    {'error': f'Недостаточно звёзд ({color}). Нужно: {qty}, есть: {have}.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Списываем ресурсы
        player.karma -= potion.karma_cost
        player.save(update_fields=['karma'])

        for color, qty in potion.required_stars.items():
            ps = PlayerStar.objects.get(player=player, star__color=color)
            ps.quantity -= qty
            if ps.quantity <= 0:
                ps.delete()
            else:
                ps.save(update_fields=['quantity'])

        # Одноразовые зелья — мгновенный эффект
        if potion.is_one_time:
            result = self._apply_instant(player, potion)
            return Response(result)

        # Длительные — создаём активное зелье
        gt = GameTime.get_instance()
        expire_hour = gt.current_hour + potion.duration_hours
        expire_day = gt.current_day + expire_hour // 24
        expire_hour = expire_hour % 24

        active = PlayerPotion.objects.create(
            player=player,
            potion=potion,
            activated_at_hour=gt.current_hour,
            activated_at_day=gt.current_day,
            expires_at_hour=expire_hour,
            expires_at_day=expire_day,
        )

        return Response({
            'message': f'Зелье "{potion.name}" активировано!',
            'effect': potion.effect_type,
            'duration_hours': potion.duration_hours,
        })

    def _apply_instant(self, player, potion):
        """Мгновенный эффект одноразового зелья."""
        if potion.effect_type == 'rank_boost':
            player.rank += int(potion.effect_value)
            player.save(update_fields=['rank'])
            return {'message': f'Разряд повышен до {player.rank}!', 'new_rank': player.rank}
        return {'message': f'Зелье "{potion.name}" использовано!'}
