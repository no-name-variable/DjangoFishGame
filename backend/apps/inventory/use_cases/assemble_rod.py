"""Use case: собрать удочку из компонентов инвентаря."""

from django.contrib.contenttypes.models import ContentType

from apps.tackle.models import Bait, FloatTackle, Hook, Line, Lure, Reel, RodType

from ..models import InventoryItem, PlayerRod


COMPONENT_MAP = {
    'reel_id': ('reel', Reel),
    'line_id': ('line', Line),
    'hook_id': ('hook', Hook),
    'float_tackle_id': ('float_tackle', FloatTackle),
    'lure_id': ('lure', Lure),
    'bait_id': ('bait', Bait),
}


class AssembleRodUseCase:
    """Собрать удочку из компонентов инвентаря."""

    def execute(self, player, data: dict) -> PlayerRod:
        """Raises: RodType.DoesNotExist, ValueError."""
        try:
            rod_type = RodType.objects.get(pk=data['rod_type_id'])
        except RodType.DoesNotExist:
            raise RodType.DoesNotExist('Удилище не найдено.')

        ct = ContentType.objects.get_for_model(rod_type)
        rod_type_inv = InventoryItem.objects.filter(
            player=player, content_type=ct, object_id=rod_type.pk, quantity__gte=1,
        ).first()
        if not rod_type_inv:
            raise ValueError('Удилища нет в инвентаре.')

        rod = PlayerRod(player=player, rod_type=rod_type)

        to_deduct = [(rod_type_inv, rod_type)]

        for key, (field, model) in COMPONENT_MAP.items():
            if key in data and data[key]:
                try:
                    component = model.objects.get(pk=data[key])
                    setattr(rod, field, component)
                    if field == 'bait':
                        rod.bait_remaining = component.quantity_per_pack
                    comp_ct = ContentType.objects.get_for_model(component)
                    comp_inv = InventoryItem.objects.filter(
                        player=player, content_type=comp_ct,
                        object_id=component.pk, quantity__gte=1,
                    ).first()
                    if comp_inv:
                        to_deduct.append((comp_inv, component))
                except model.DoesNotExist:
                    raise model.DoesNotExist(f'{model.__name__} не найден.')

        rod.depth_setting = data.get('depth_setting', 1.5)
        rod.retrieve_speed = data.get('retrieve_speed', 5)
        rod.is_assembled = True
        rod.save()

        for inv_item, _ in to_deduct:
            inv_item.quantity -= 1
            if inv_item.quantity <= 0:
                inv_item.delete()
            else:
                inv_item.save(update_fields=['quantity'])

        return rod
