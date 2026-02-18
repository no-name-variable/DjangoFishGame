"""Use case: получение активных заказов кафе."""

from django.db.models import IntegerField, OuterRef, Subquery
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.cafe.models import CafeDelivery, CafeOrder


class GetCafeOrdersUseCase:
    """Возвращает активные заказы кафе для базы игрока с прогрессом."""

    def execute(self, player):
        """Возвращает QuerySet заказов с аннотацией quantity_delivered."""
        now = timezone.now()

        delivered_subquery = Subquery(
            CafeDelivery.objects.filter(
                order=OuterRef('pk'),
                player=player,
            ).values('quantity_delivered')[:1],
            output_field=IntegerField(),
        )

        return CafeOrder.objects.filter(
            location__base=player.current_base,
            is_active=True,
            expires_at__gt=now,
        ).select_related(
            'species', 'location',
        ).annotate(
            quantity_delivered=Coalesce(delivered_subquery, 0),
        ).order_by('location__name', 'species__name_ru')
