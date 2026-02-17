"""Views мира — базы и локации."""

from rest_framework import generics, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Player

from .models import Base, Location
from .serializers import BaseSerializer, LocationDetailSerializer, LocationSerializer


class LocationPlayerSerializer(serializers.ModelSerializer):
    """Краткая информация об игроке на локации."""

    rank_title = serializers.ReadOnlyField()

    class Meta:
        model = Player
        fields = ['id', 'nickname', 'rank', 'rank_title']


class BaseListView(generics.ListAPIView):
    """Список рыболовных баз."""

    queryset = Base.objects.all()
    serializer_class = BaseSerializer


class BaseLocationsView(generics.ListAPIView):
    """Локации конкретной базы."""

    serializer_class = LocationSerializer

    def get_queryset(self):
        return Location.objects.filter(base_id=self.kwargs['base_id'])


class LocationEnterView(APIView):
    """Зайти на локацию."""

    def post(self, request, location_id):
        player = request.user.player
        try:
            location = Location.objects.select_related('base').get(pk=location_id)
        except Location.DoesNotExist:
            return Response({'error': 'Локация не найдена.'}, status=status.HTTP_404_NOT_FOUND)

        if player.rank < location.min_rank:
            return Response(
                {'error': f'Требуется разряд {location.min_rank}. Ваш: {player.rank}.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if player.current_base_id != location.base_id:
            return Response({'error': 'Вы на другой базе.'}, status=status.HTTP_400_BAD_REQUEST)

        if location.travel_cost > 0 and player.money < location.travel_cost:
            return Response(
                {'error': f'Недостаточно денег. Вход стоит {location.travel_cost:.0f} монет.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if location.travel_cost > 0:
            player.money -= location.travel_cost
            player.current_location = location
            player.save(update_fields=['money', 'current_location'])
        else:
            player.current_location = location
            player.save(update_fields=['current_location'])

        return Response(LocationDetailSerializer(location).data)


class LocationLeaveView(APIView):
    """Уйти с локации."""

    def post(self, request, location_id):
        player = request.user.player
        player.current_location = None
        player.save(update_fields=['current_location'])
        return Response({'status': 'ok'})


class BaseTravelView(APIView):
    """Переехать на другую базу."""

    def post(self, request, base_id):
        player = request.user.player
        try:
            base = Base.objects.get(pk=base_id)
        except Base.DoesNotExist:
            return Response({'error': 'База не найдена.'}, status=status.HTTP_404_NOT_FOUND)

        if player.rank < base.min_rank:
            return Response(
                {'error': f'Требуется разряд {base.min_rank}.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if player.karma < base.min_karma:
            return Response(
                {'error': f'Требуется карма {base.min_karma}.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if player.money < base.travel_cost:
            return Response({'error': 'Недостаточно денег.'}, status=status.HTTP_400_BAD_REQUEST)

        player.money -= base.travel_cost
        player.current_base = base
        player.current_location = None
        player.save(update_fields=['money', 'current_base', 'current_location'])

        return Response(BaseSerializer(base).data)


class LocationPlayersView(generics.ListAPIView):
    """Список игроков на локации."""

    serializer_class = LocationPlayerSerializer
    pagination_class = None

    def get_queryset(self):
        return Player.objects.filter(current_location_id=self.kwargs['location_id'])
