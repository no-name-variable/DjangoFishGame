"""Сериализаторы снастей."""

from rest_framework import serializers

from .models import Bait, FishSpecies, Flavoring, FloatTackle, Food, Groundbait, Hook, Line, Lure, Reel, RodType

ROD_CLASS_LABELS = {'float': 'Поплавочное', 'spinning': 'Спиннинговое', 'bottom': 'Донное'}
LURE_TYPE_LABELS = {'spoon': 'Колебалка', 'wobbler': 'Воблер', 'jig': 'Джиг', 'soft': 'Силикон'}


class FishSpeciesSerializer(serializers.ModelSerializer):
    class Meta:
        model = FishSpecies
        fields = [
            'id', 'name_ru', 'name_latin', 'description', 'image',
            'weight_min', 'weight_max', 'length_min', 'length_max',
            'rarity', 'sell_price_per_kg', 'experience_per_kg',
        ]


class RodTypeSerializer(serializers.ModelSerializer):
    rod_class_display = serializers.SerializerMethodField()
    specs = serializers.SerializerMethodField()

    class Meta:
        model = RodType
        fields = '__all__'

    def get_rod_class_display(self, obj):
        return ROD_CLASS_LABELS.get(obj.rod_class, obj.rod_class)

    def get_specs(self, obj):
        return [
            {'label': 'Класс', 'value': ROD_CLASS_LABELS.get(obj.rod_class, obj.rod_class)},
            {'label': 'Тест', 'value': f'{obj.test_min}–{obj.test_max} кг'},
            {'label': 'Длина', 'value': f'{obj.length} м'},
            {'label': 'Прочность', 'value': str(obj.durability_max)},
            {'label': 'Мин. разряд', 'value': str(obj.min_rank)},
        ]


class ReelSerializer(serializers.ModelSerializer):
    specs = serializers.SerializerMethodField()

    class Meta:
        model = Reel
        fields = '__all__'

    def get_specs(self, obj):
        return [
            {'label': 'Тяга', 'value': f'{obj.drag_power} кг'},
            {'label': 'Вместимость', 'value': f'{obj.line_capacity} м'},
            {'label': 'Прочность', 'value': str(obj.durability_max)},
        ]


class LineSerializer(serializers.ModelSerializer):
    specs = serializers.SerializerMethodField()

    class Meta:
        model = Line
        fields = '__all__'

    def get_specs(self, obj):
        return [
            {'label': 'Прочность на разрыв', 'value': f'{obj.breaking_strength} кг'},
            {'label': 'Толщина', 'value': f'{obj.thickness} мм'},
            {'label': 'Длина', 'value': f'{obj.length} м'},
        ]


class HookSerializer(serializers.ModelSerializer):
    specs = serializers.SerializerMethodField()

    class Meta:
        model = Hook
        fields = '__all__'

    def get_specs(self, obj):
        return [
            {'label': 'Размер', 'value': f'#{obj.size}'},
        ]


class FloatTackleSerializer(serializers.ModelSerializer):
    specs = serializers.SerializerMethodField()

    class Meta:
        model = FloatTackle
        fields = '__all__'

    def get_specs(self, obj):
        return [
            {'label': 'Грузоподъёмность', 'value': f'{obj.capacity} г'},
            {'label': 'Чувствительность', 'value': f'{obj.sensitivity}/10'},
        ]


class LureSerializer(serializers.ModelSerializer):
    lure_type_display = serializers.SerializerMethodField()
    specs = serializers.SerializerMethodField()

    class Meta:
        model = Lure
        fields = '__all__'

    def get_lure_type_display(self, obj):
        return LURE_TYPE_LABELS.get(obj.lure_type, obj.lure_type)

    def get_specs(self, obj):
        return [
            {'label': 'Тип', 'value': LURE_TYPE_LABELS.get(obj.lure_type, obj.lure_type)},
            {'label': 'Глубина проводки', 'value': f'{obj.depth_min}–{obj.depth_max} м'},
        ]


class BaitSerializer(serializers.ModelSerializer):
    specs = serializers.SerializerMethodField()

    class Meta:
        model = Bait
        fields = '__all__'

    def get_specs(self, obj):
        return [
            {'label': 'В упаковке', 'value': f'{obj.quantity_per_pack} шт.'},
        ]


class GroundbaitSerializer(serializers.ModelSerializer):
    specs = serializers.SerializerMethodField()

    class Meta:
        model = Groundbait
        fields = '__all__'

    def get_specs(self, obj):
        return [
            {'label': 'Эффективность', 'value': f'{obj.effectiveness}/10'},
            {'label': 'Длительность', 'value': f'{obj.duration_hours} ч.'},
        ]


class FlavoringSerializer(serializers.ModelSerializer):
    specs = serializers.SerializerMethodField()

    class Meta:
        model = Flavoring
        fields = '__all__'

    def get_specs(self, obj):
        return [
            {'label': 'Бонус', 'value': f'x{obj.bonus_multiplier}'},
        ]


class FoodSerializer(serializers.ModelSerializer):
    specs = serializers.SerializerMethodField()

    class Meta:
        model = Food
        fields = '__all__'

    def get_specs(self, obj):
        return [
            {'label': 'Сытость', 'value': f'+{obj.satiety}'},
        ]
