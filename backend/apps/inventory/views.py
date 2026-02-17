"""Views инвентаря."""

from django.contrib.contenttypes.models import ContentType
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.fishing.models import FishingSession
from apps.tackle.models import Bait, FloatTackle, Hook, Line, Lure, Reel, RodType

from .models import CaughtFish, InventoryItem, PlayerRod
from .serializers import (
    AssembleRodSerializer, CaughtFishSerializer, InventoryItemSerializer,
    PlayerRodSerializer, RenameRodSerializer,
)


class InventoryView(generics.ListAPIView):
    """Инвентарь игрока."""

    serializer_class = InventoryItemSerializer

    def get_queryset(self):
        return InventoryItem.objects.filter(player=self.request.user.player)


class PlayerRodsView(generics.ListAPIView):
    """Снасти игрока."""

    serializer_class = PlayerRodSerializer

    def get_queryset(self):
        return PlayerRod.objects.filter(
            player=self.request.user.player,
        ).select_related('rod_type', 'reel', 'line', 'hook', 'float_tackle', 'lure', 'bait')


class CreelView(generics.ListAPIView):
    """Садок (пойманная рыба)."""

    serializer_class = CaughtFishSerializer

    def get_queryset(self):
        return CaughtFish.objects.filter(
            player=self.request.user.player, is_sold=False, is_released=False,
        ).select_related('species')


class AssembleRodView(APIView):
    """Собрать удочку из компонентов инвентаря."""

    def post(self, request):
        serializer = AssembleRodSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        player = request.user.player

        # Проверяем наличие удилища в инвентаре
        try:
            rod_type = RodType.objects.get(pk=data['rod_type_id'])
        except RodType.DoesNotExist:
            return Response({'error': 'Удилище не найдено.'}, status=status.HTTP_404_NOT_FOUND)

        ct = ContentType.objects.get_for_model(rod_type)
        rod_type_inv = InventoryItem.objects.filter(
            player=player, content_type=ct, object_id=rod_type.pk, quantity__gte=1,
        ).first()
        if not rod_type_inv:
            return Response({'error': 'Удилища нет в инвентаре.'}, status=status.HTTP_400_BAD_REQUEST)

        # Создаём снасть
        rod = PlayerRod(player=player, rod_type=rod_type)

        # Опционально прикрепляем компоненты, собираем список для списания из инвентаря
        component_map = {
            'reel_id': ('reel', Reel),
            'line_id': ('line', Line),
            'hook_id': ('hook', Hook),
            'float_tackle_id': ('float_tackle', FloatTackle),
            'lure_id': ('lure', Lure),
            'bait_id': ('bait', Bait),
        }

        # Список (InventoryItem, component) для списания после создания
        to_deduct = [(rod_type_inv, rod_type)]

        for key, (field, model) in component_map.items():
            if key in data and data[key]:
                try:
                    component = model.objects.get(pk=data[key])
                    setattr(rod, field, component)
                    if field == 'bait':
                        rod.bait_remaining = component.quantity_per_pack
                    # Ищем предмет в инвентаре для списания
                    comp_ct = ContentType.objects.get_for_model(component)
                    comp_inv = InventoryItem.objects.filter(
                        player=player, content_type=comp_ct, object_id=component.pk, quantity__gte=1,
                    ).first()
                    if comp_inv:
                        to_deduct.append((comp_inv, component))
                except model.DoesNotExist:
                    return Response(
                        {'error': f'{model.__name__} не найден.'},
                        status=status.HTTP_404_NOT_FOUND,
                    )

        rod.depth_setting = data.get('depth_setting', 1.5)
        rod.retrieve_speed = data.get('retrieve_speed', 5)
        rod.is_assembled = True
        rod.save()

        # Списываем компоненты из инвентаря
        for inv_item, _ in to_deduct:
            inv_item.quantity -= 1
            if inv_item.quantity <= 0:
                inv_item.delete()
            else:
                inv_item.save(update_fields=['quantity'])

        return Response(PlayerRodSerializer(rod).data, status=status.HTTP_201_CREATED)


class RenameRodView(APIView):
    """Переименовать сборку."""

    def patch(self, request, rod_id):
        serializer = RenameRodSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            rod = PlayerRod.objects.get(pk=rod_id, player=request.user.player)
        except PlayerRod.DoesNotExist:
            return Response({'error': 'Снасть не найдена.'}, status=status.HTTP_404_NOT_FOUND)

        rod.custom_name = serializer.validated_data['custom_name'].strip()
        rod.save(update_fields=['custom_name'])

        return Response(PlayerRodSerializer(rod).data)


class EatView(APIView):
    """Покормить рыбака."""

    def post(self, request):
        from apps.tackle.models import Food

        player = request.user.player
        food_id = request.data.get('food_id')
        if not food_id:
            return Response({'error': 'Укажите food_id.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            food = Food.objects.get(pk=food_id)
        except Food.DoesNotExist:
            return Response({'error': 'Еда не найдена.'}, status=status.HTTP_404_NOT_FOUND)

        ct = ContentType.objects.get_for_model(food)
        inv = InventoryItem.objects.filter(player=player, content_type=ct, object_id=food.pk, quantity__gte=1).first()
        if not inv:
            return Response({'error': 'Нет такой еды в инвентаре.'}, status=status.HTTP_400_BAD_REQUEST)

        inv.quantity -= 1
        if inv.quantity <= 0:
            inv.delete()
        else:
            inv.save(update_fields=['quantity'])

        player.hunger = min(100, player.hunger + food.satiety)
        player.save(update_fields=['hunger'])

        return Response({'hunger': player.hunger})


class RodSettingsView(APIView):
    """Изменить глубину и скорость проводки удочки."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, rod_id):
        rod = get_object_or_404(PlayerRod, pk=rod_id, player=request.user.player)

        # Нельзя менять во время bite/fighting/caught
        session = FishingSession.objects.filter(rod=rod).first()
        if session and session.state in ('bite', 'fighting', 'caught'):
            return Response(
                {'error': 'Нельзя менять настройки во время вываживания.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if 'depth_setting' in request.data:
            rod.depth_setting = max(0.1, min(10.0, float(request.data['depth_setting'])))
        if 'retrieve_speed' in request.data:
            rod.retrieve_speed = max(1, min(10, int(request.data['retrieve_speed'])))
        rod.save(update_fields=['depth_setting', 'retrieve_speed'])
        return Response(PlayerRodSerializer(rod).data)


class ChangeTackleView(APIView):
    """Сменить компоненты снасти (наживка, приманка, крючок, поплавок)."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, rod_id):
        player = request.user.player
        rod = get_object_or_404(PlayerRod, pk=rod_id, player=player)

        # Удочка НЕ должна быть в воде
        if FishingSession.objects.filter(rod=rod).exists():
            return Response(
                {'error': 'Вытащите удочку перед сменой снасти.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        component_map = {
            'hook_id': ('hook', Hook),
            'float_tackle_id': ('float_tackle', FloatTackle),
            'lure_id': ('lure', Lure),
            'bait_id': ('bait', Bait),
        }

        for key, (field, model) in component_map.items():
            if key not in request.data:
                continue
            value = request.data[key]
            if value is None:
                setattr(rod, field, None)
                if field == 'bait':
                    rod.bait_remaining = 0
            else:
                component = get_object_or_404(model, pk=value)
                ct = ContentType.objects.get_for_model(component)
                if not InventoryItem.objects.filter(
                    player=player, content_type=ct, object_id=component.pk, quantity__gte=1,
                ).exists():
                    return Response(
                        {'error': f'{component.name} нет в инвентаре.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                setattr(rod, field, component)
                if field == 'bait':
                    rod.bait_remaining = component.quantity_per_pack

        rod.save()
        return Response(PlayerRodSerializer(rod).data)


class DisassembleRodView(APIView):
    """Разобрать удочку (возврат компонентов в инвентарь)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, rod_id):
        player = request.user.player
        rod = get_object_or_404(PlayerRod, pk=rod_id, player=player)

        # Нельзя разобрать удочку в слоте или в воде
        if FishingSession.objects.filter(rod=rod).exists():
            return Response(
                {'error': 'Вытащите удочку перед разборкой.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Проверка, не в слоте ли удочка
        if player.rod_slot_1 == rod or player.rod_slot_2 == rod or player.rod_slot_3 == rod:
            return Response(
                {'error': 'Снимите удочку из слота перед разборкой.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Возвращаем компоненты в инвентарь (кроме наживки - она расходник)
        components = [
            ('rod_type', rod.rod_type),
            ('reel', rod.reel),
            ('line', rod.line),
            ('hook', rod.hook),
            ('float_tackle', rod.float_tackle),
            ('lure', rod.lure),
        ]

        for _, component in components:
            if component:
                ct = ContentType.objects.get_for_model(component)
                inv, created = InventoryItem.objects.get_or_create(
                    player=player,
                    content_type=ct,
                    object_id=component.pk,
                    defaults={'quantity': 0},
                )
                inv.quantity += 1
                inv.save(update_fields=['quantity'])

        # Удаляем удочку
        rod.delete()

        return Response({'status': 'disassembled'}, status=status.HTTP_200_OK)


class DeleteRodView(APIView):
    """Удалить удочку без возврата компонентов."""

    permission_classes = [IsAuthenticated]

    def delete(self, request, rod_id):
        player = request.user.player
        rod = get_object_or_404(PlayerRod, pk=rod_id, player=player)

        # Нельзя удалить удочку в воде
        if FishingSession.objects.filter(rod=rod).exists():
            return Response(
                {'error': 'Вытащите удочку перед удалением.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Удаляем из слота если там
        if player.rod_slot_1 == rod:
            player.rod_slot_1 = None
        if player.rod_slot_2 == rod:
            player.rod_slot_2 = None
        if player.rod_slot_3 == rod:
            player.rod_slot_3 = None
        player.save(update_fields=['rod_slot_1', 'rod_slot_2', 'rod_slot_3'])

        rod.delete()

        return Response({'status': 'deleted'}, status=status.HTTP_200_OK)


class EquipRodView(APIView):
    """Экипировать удочку в слот (1, 2 или 3)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, rod_id):
        player = request.user.player
        rod = get_object_or_404(PlayerRod, pk=rod_id, player=player)

        slot = request.data.get('slot')
        if slot not in [1, 2, 3]:
            return Response(
                {'error': 'Укажите слот 1, 2 или 3.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Проверяем, что удочка готова к использованию
        if not rod.is_ready:
            return Response(
                {'error': 'Снасть не собрана или некомплектна.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Проверяем, не занята ли удочка уже в другом слоте
        if player.rod_slot_1 == rod or player.rod_slot_2 == rod or player.rod_slot_3 == rod:
            return Response(
                {'error': 'Удочка уже экипирована в другой слот.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Экипируем в указанный слот
        slot_field = f'rod_slot_{slot}'
        setattr(player, slot_field, rod)
        player.save(update_fields=[slot_field])

        return Response({
            'status': 'equipped',
            'slot': slot,
            'rod': PlayerRodSerializer(rod).data,
        })


class UnequipRodView(APIView):
    """Снять удочку из слота."""

    permission_classes = [IsAuthenticated]

    def post(self, request, rod_id):
        player = request.user.player
        rod = get_object_or_404(PlayerRod, pk=rod_id, player=player)

        # Нельзя снять удочку, которая в воде
        if FishingSession.objects.filter(rod=rod).exists():
            return Response(
                {'error': 'Вытащите удочку перед снятием из слота.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Находим и очищаем слот
        unequipped = False
        if player.rod_slot_1 == rod:
            player.rod_slot_1 = None
            unequipped = True
        if player.rod_slot_2 == rod:
            player.rod_slot_2 = None
            unequipped = True
        if player.rod_slot_3 == rod:
            player.rod_slot_3 = None
            unequipped = True

        if not unequipped:
            return Response(
                {'error': 'Удочка не экипирована.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        player.save(update_fields=['rod_slot_1', 'rod_slot_2', 'rod_slot_3'])

        return Response({'status': 'unequipped'})
