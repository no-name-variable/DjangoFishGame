"""Сериализаторы снастей."""

from rest_framework import serializers

from .models import Bait, FishSpecies, Flavoring, FloatTackle, Food, Groundbait, Hook, Line, Reel, RodType

ROD_CLASS_LABELS = {'float': 'Поплавочное', 'bottom': 'Донное'}


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



class BaitSerializer(serializers.ModelSerializer):
    specs = serializers.SerializerMethodField()

    class Meta:
        model = Bait
        fields = '__all__'

    def get_specs(self, obj):
        species = list(obj.target_species.values_list('name_ru', flat=True))
        return [
            {'label': 'В упаковке', 'value': f'{obj.quantity_per_pack} шт.'},
            {'label': 'Целевая рыба', 'value': ', '.join(species) if species else 'Универсальная'},
        ]


class GroundbaitSerializer(serializers.ModelSerializer):
    specs = serializers.SerializerMethodField()

    class Meta:
        model = Groundbait
        fields = '__all__'

    def get_specs(self, obj):
        species = list(obj.target_species.values_list('name_ru', flat=True))
        return [
            {'label': 'Эффективность', 'value': f'{obj.effectiveness}/10'},
            {'label': 'Длительность', 'value': f'{obj.duration_hours} ч.'},
            {'label': 'Целевая рыба', 'value': ', '.join(species) if species else 'Универсальная'},
        ]


class FlavoringSerializer(serializers.ModelSerializer):
    specs = serializers.SerializerMethodField()

    class Meta:
        model = Flavoring
        fields = '__all__'

    def get_specs(self, obj):
        species = list(obj.target_species.values_list('name_ru', flat=True))
        return [
            {'label': 'Бонус', 'value': f'x{obj.bonus_multiplier}'},
            {'label': 'Целевая рыба', 'value': ', '.join(species) if species else 'Универсальная'},
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
