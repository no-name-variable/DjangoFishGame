"""Use case: сдача рыбы в заказ кафе."""

from dataclasses import dataclass
from decimal import Decimal

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.cafe.models import CafeDelivery, CafeOrder
from apps.inventory.models import CaughtFish


@dataclass
class DeliverFishResult:
    """Результат сдачи рыбы."""

    order_id: int
    fish_delivered: int
    money_earned: float
    money_total: float
    quantity_delivered: int
    quantity_required: int


class DeliverFishUseCase:
    """Сдача рыбы из садка в заказ кафе."""

    def execute(self, player, order_id: int, fish_ids: list[int]) -> DeliverFishResult:
        """
        Сдаёт подходящую рыбу в заказ кафе.

        Raises: ValueError, CafeOrder.DoesNotExist.
        """
        now = timezone.now()

        order = CafeOrder.objects.select_related('species', 'location').get(pk=order_id)

        if not order.is_active or order.expires_at <= now:
            raise ValueError('Заказ неактивен или истёк.')

        if order.location.base_id != player.current_base_id:
            raise ValueError('Заказ не на вашей базе.')

        delivery, _ = CafeDelivery.objects.get_or_create(
            order=order, player=player,
        )
        remaining = delivery.remaining
        if remaining <= 0:
            raise ValueError('Заказ уже выполнен.')

        min_weight_kg = order.min_weight_grams / 1000.0
        suitable_fish = CaughtFish.objects.filter(
            player=player,
            pk__in=fish_ids,
            species=order.species,
            weight__gte=min_weight_kg,
            is_sold=False,
            is_released=False,
        )

        fish_list = list(suitable_fish[:remaining])
        if not fish_list:
            raise ValueError('Нет подходящей рыбы в садке.')

        count = len(fish_list)
        reward = order.reward_per_fish * count

        with transaction.atomic():
            CaughtFish.objects.filter(
                pk__in=[f.pk for f in fish_list],
            ).update(is_sold=True)

            player.money = F('money') + reward
            player.save(update_fields=['money'])

            CafeDelivery.objects.filter(pk=delivery.pk).update(
                quantity_delivered=F('quantity_delivered') + count,
            )

        player.refresh_from_db(fields=['money'])
        delivery.refresh_from_db()

        return DeliverFishResult(
            order_id=order.pk,
            fish_delivered=count,
            money_earned=float(reward),
            money_total=float(player.money),
            quantity_delivered=delivery.quantity_delivered,
            quantity_required=order.quantity_required,
        )
