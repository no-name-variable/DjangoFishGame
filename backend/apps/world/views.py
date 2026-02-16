"""Views мира — базы и локации."""

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Base, Location
from .serializers import BaseSerializer, LocationDetailSerializer, LocationSerializer


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
