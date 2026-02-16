"""Views рыбнадзора."""

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import FishInspection
from .serializers import FishInspectionSerializer


class InspectionHistoryView(generics.ListAPIView):
    """История проверок рыбнадзора для текущего игрока."""

    serializer_class = FishInspectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return FishInspection.objects.filter(
            player=self.request.user.player,
        ).select_related('location')
