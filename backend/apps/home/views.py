"""Views дома рыбака."""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    ApparatusPart,
    BrewingSession,
    MoonshineIngredient,
    MoonshineRecipe,
    PlayerMoonshineBuff,
)
from .serializers import (
    ApparatusPartSerializer,
    BrewingSessionSerializer,
    BuyIngredientSerializer,
    CollectBrewingSerializer,
    IngredientSerializer,
    PlayerBuffSerializer,
    RecipeSerializer,
    StartBrewingSerializer,
)
from .use_cases.buy_ingredient import BuyIngredientUseCase
from .use_cases.collect_moonshine import CollectMoonshineUseCase
from .use_cases.start_brewing import StartBrewingUseCase


def _resolve(use_case_cls):
    """Резолвит use case из DI-контейнера."""
    from config.container import container
    return container.resolve(use_case_cls)


class PartsView(APIView):
    """Детали аппарата + статус сборки."""

    def get(self, request):
        parts = ApparatusPart.objects.all()
        serializer = ApparatusPartSerializer(parts, many=True, context={'request': request})
        total = parts.count()
        from .models import PlayerApparatusPart
        collected = PlayerApparatusPart.objects.filter(player=request.user.player).count()
        return Response({
            'parts': serializer.data,
            'collected': collected,
            'total': total,
            'is_complete': collected >= total,
        })


class IngredientsView(APIView):
    """Список ингредиентов + количество у игрока."""

    def get(self, request):
        ingredients = MoonshineIngredient.objects.all()
        serializer = IngredientSerializer(ingredients, many=True, context={'request': request})
        return Response(serializer.data)


class BuyIngredientView(APIView):
    """Купить ингредиент."""

    def post(self, request):
        serializer = BuyIngredientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uc = _resolve(BuyIngredientUseCase)
        try:
            result = uc.execute(
                request.user.player,
                serializer.validated_data['ingredient_id'],
                serializer.validated_data.get('quantity', 1),
            )
        except MoonshineIngredient.DoesNotExist:
            return Response({'error': 'Ингредиент не найден.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'message': f'Куплено: {result.ingredient_name} x{result.quantity}',
            'total_cost': result.total_cost,
            'player_money': result.player_money,
        })


class RecipesView(APIView):
    """Список рецептов самогона."""

    def get(self, request):
        recipes = MoonshineRecipe.objects.all()
        serializer = RecipeSerializer(recipes, many=True, context={'request': request})
        return Response(serializer.data)


class StartBrewingView(APIView):
    """Начать варку."""

    def post(self, request):
        serializer = StartBrewingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uc = _resolve(StartBrewingUseCase)
        try:
            result = uc.execute(request.user.player, serializer.validated_data['recipe_id'])
        except MoonshineRecipe.DoesNotExist:
            return Response({'error': 'Рецепт не найден.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'message': f'Варка "{result.recipe_name}" начата!',
            'ready_at_hour': result.ready_at_hour,
            'ready_at_day': result.ready_at_day,
        })


class BrewingStatusView(APIView):
    """Текущие сессии варки."""

    def get(self, request):
        sessions = BrewingSession.objects.filter(
            player=request.user.player,
        ).select_related('recipe')
        return Response(BrewingSessionSerializer(sessions, many=True).data)


class CollectMoonshineView(APIView):
    """Забрать готовый самогон."""

    def post(self, request):
        serializer = CollectBrewingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uc = _resolve(CollectMoonshineUseCase)
        try:
            result = uc.execute(request.user.player, serializer.validated_data['session_id'])
        except BrewingSession.DoesNotExist:
            return Response({'error': 'Сессия не найдена.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        data = {'message': result.message, 'effect_type': result.effect_type}
        if result.duration_hours:
            data['duration_hours'] = result.duration_hours
        if result.hunger_restored:
            data['hunger_restored'] = result.hunger_restored
        return Response(data)


class BuffsView(APIView):
    """Активные баффы самогона."""

    def get(self, request):
        buffs = PlayerMoonshineBuff.objects.filter(
            player=request.user.player,
        ).select_related('recipe')
        active = [b for b in buffs if b.is_active()]
        return Response(PlayerBuffSerializer(active, many=True).data)
