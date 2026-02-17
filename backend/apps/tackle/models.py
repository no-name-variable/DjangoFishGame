"""Модели снастей и рыб."""

from django.db import models


class FishSpecies(models.Model):
    """Вид рыбы."""

    class Rarity(models.TextChoices):
        COMMON = 'common', 'Обычная'
        UNCOMMON = 'uncommon', 'Необычная'
        RARE = 'rare', 'Редкая'
        TROPHY = 'trophy', 'Трофейная'
        LEGENDARY = 'legendary', 'Легендарная'

    name_ru = models.CharField('Название (рус)', max_length=100)
    name_latin = models.CharField('Название (лат)', max_length=100, blank=True)
    description = models.TextField('Описание', blank=True)
    image = models.ImageField('Изображение', upload_to='fish/', blank=True)
    weight_min = models.FloatField('Мин. вес (кг)')
    weight_max = models.FloatField('Макс. вес (кг)')
    length_min = models.FloatField('Мин. длина (см)')
    length_max = models.FloatField('Макс. длина (см)')
    rarity = models.CharField('Редкость', max_length=20, choices=Rarity.choices, default=Rarity.COMMON)
    sell_price_per_kg = models.DecimalField('Цена за кг', max_digits=10, decimal_places=2)
    experience_per_kg = models.IntegerField('Опыт за кг', default=10)
    active_time = models.JSONField(
        'Активность по времени суток',
        default=dict,
        help_text='{"morning": 0.8, "day": 0.3, "evening": 0.9, "night": 0.5}',
    )
    preferred_depth_min = models.FloatField('Мин. глубина обитания (м)', default=0.5)
    preferred_depth_max = models.FloatField('Макс. глубина обитания (м)', default=5.0)

    class Meta:
        verbose_name = 'Вид рыбы'
        verbose_name_plural = 'Виды рыб'
        ordering = ['name_ru']

    def __str__(self):
        return self.name_ru


class FishPriceDynamic(models.Model):
    """
    Динамическая цена рыбы по локации.
    Цена падает при массовых продажах и восстанавливается каждый игровой день.
    """

    species = models.ForeignKey(
        FishSpecies, on_delete=models.CASCADE,
        related_name='price_dynamics', verbose_name='Вид рыбы',
    )
    location = models.ForeignKey(
        'world.Location', on_delete=models.CASCADE,
        related_name='price_dynamics', verbose_name='Локация',
    )
    sold_weight_today = models.FloatField('Продано кг сегодня', default=0.0)

    class Meta:
        verbose_name = 'Динамика цены рыбы'
        verbose_name_plural = 'Динамика цен рыбы'
        unique_together = ('species', 'location')

    def __str__(self):
        return f'{self.species.name_ru} @ {self.location} — {self.current_modifier:.2f}x'

    @property
    def current_modifier(self) -> float:
        """
        Модификатор цены: снижается на 1% за каждые 5 кг проданной рыбы.
        Минимум 50% от базовой цены.
        """
        return max(0.50, 1.0 - self.sold_weight_today * 0.002)

    @classmethod
    def get_modifier(cls, species, location) -> float:
        """Вернуть текущий модификатор цены. Без записи — полная цена."""
        if not location:
            return 1.0
        try:
            record = cls.objects.get(species=species, location=location)
            return record.current_modifier
        except cls.DoesNotExist:
            return 1.0

    @classmethod
    def record_sale(cls, species, location, weight: float) -> None:
        """Зарегистрировать продажу рыбы — увеличить sold_weight_today."""
        if not location:
            return
        cls.objects.update_or_create(
            species=species, location=location,
            defaults={},
        )
        cls.objects.filter(species=species, location=location).update(
            sold_weight_today=models.F('sold_weight_today') + weight,
        )


class RodType(models.Model):
    """Тип удилища."""

    class RodClass(models.TextChoices):
        FLOAT = 'float', 'Поплавочное'
        SPINNING = 'spinning', 'Спиннинговое'
        BOTTOM = 'bottom', 'Донное'

    name = models.CharField('Название', max_length=100)
    description = models.TextField('Описание', blank=True)
    image = models.ImageField('Изображение', upload_to='tackle/rods/', blank=True)
    rod_class = models.CharField('Класс', max_length=20, choices=RodClass.choices)
    test_min = models.FloatField('Тест мин (кг)')
    test_max = models.FloatField('Тест макс (кг)')
    durability_max = models.IntegerField('Прочность', default=100)
    length = models.FloatField('Длина (м)')
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2)
    min_rank = models.IntegerField('Мин. разряд', default=1)

    class Meta:
        verbose_name = 'Удилище'
        verbose_name_plural = 'Удилища'
        ordering = ['price']

    def __str__(self):
        return self.name


class Reel(models.Model):
    """Катушка."""

    name = models.CharField('Название', max_length=100)
    description = models.TextField('Описание', blank=True)
    image = models.ImageField('Изображение', upload_to='tackle/reels/', blank=True)
    drag_power = models.FloatField('Тяга (кг)')
    line_capacity = models.IntegerField('Вместимость лески (м)')
    durability_max = models.IntegerField('Прочность', default=100)
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Катушка'
        verbose_name_plural = 'Катушки'
        ordering = ['price']

    def __str__(self):
        return self.name


class Line(models.Model):
    """Леска."""

    name = models.CharField('Название', max_length=100)
    description = models.TextField('Описание', blank=True)
    image = models.ImageField('Изображение', upload_to='tackle/lines/', blank=True)
    breaking_strength = models.FloatField('Прочность на разрыв (кг)')
    thickness = models.FloatField('Толщина (мм)')
    length = models.IntegerField('Длина (м)', default=100)
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Леска'
        verbose_name_plural = 'Лески'
        ordering = ['price']

    def __str__(self):
        return self.name


class Hook(models.Model):
    """Крючок."""

    name = models.CharField('Название', max_length=100)
    image = models.ImageField('Изображение', upload_to='tackle/hooks/', blank=True)
    size = models.IntegerField('Размер')
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Крючок'
        verbose_name_plural = 'Крючки'
        ordering = ['size']

    def __str__(self):
        return f'{self.name} #{self.size}'


class FloatTackle(models.Model):
    """Поплавок."""

    name = models.CharField('Название', max_length=100)
    image = models.ImageField('Изображение', upload_to='tackle/floats/', blank=True)
    capacity = models.FloatField('Грузоподъёмность (г)')
    sensitivity = models.IntegerField('Чувствительность (1-10)', default=5)
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Поплавок'
        verbose_name_plural = 'Поплавки'
        ordering = ['price']

    def __str__(self):
        return self.name


class Lure(models.Model):
    """Блесна / приманка."""

    class LureType(models.TextChoices):
        SPOON = 'spoon', 'Колебалка'
        WOBBLER = 'wobbler', 'Воблер'
        JIG = 'jig', 'Джиг'
        SOFT = 'soft', 'Силикон'

    name = models.CharField('Название', max_length=100)
    image = models.ImageField('Изображение', upload_to='tackle/lures/', blank=True)
    lure_type = models.CharField('Тип', max_length=20, choices=LureType.choices)
    depth_min = models.FloatField('Мин. глубина проводки (м)', default=0.5)
    depth_max = models.FloatField('Макс. глубина проводки (м)', default=3.0)
    target_species = models.ManyToManyField(FishSpecies, verbose_name='Целевые виды', blank=True)
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Приманка'
        verbose_name_plural = 'Приманки'
        ordering = ['price']

    def __str__(self):
        return self.name


class Bait(models.Model):
    """Наживка."""

    name = models.CharField('Название', max_length=100)
    image = models.ImageField('Изображение', upload_to='tackle/baits/', blank=True)
    target_species = models.ManyToManyField(FishSpecies, verbose_name='Целевые виды', blank=True)
    quantity_per_pack = models.IntegerField('Кол-во в упаковке', default=20)
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Наживка'
        verbose_name_plural = 'Наживки'
        ordering = ['price']

    def __str__(self):
        return self.name


class Groundbait(models.Model):
    """Прикормка."""

    name = models.CharField('Название', max_length=100)
    image = models.ImageField('Изображение', upload_to='tackle/groundbaits/', blank=True)
    effectiveness = models.IntegerField('Эффективность (1-10)', default=5)
    target_species = models.ManyToManyField(FishSpecies, verbose_name='Целевые виды', blank=True)
    duration_hours = models.IntegerField('Длительность (игр. часов)', default=3)
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Прикормка'
        verbose_name_plural = 'Прикормки'
        ordering = ['price']

    def __str__(self):
        return self.name


class Flavoring(models.Model):
    """Ароматизатор."""

    name = models.CharField('Название', max_length=100)
    image = models.ImageField('Изображение', upload_to='tackle/flavorings/', blank=True)
    target_species = models.ManyToManyField(FishSpecies, verbose_name='Целевые виды', blank=True)
    bonus_multiplier = models.FloatField('Множитель бонуса', default=1.2)
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Ароматизатор'
        verbose_name_plural = 'Ароматизаторы'
        ordering = ['price']

    def __str__(self):
        return self.name


class Food(models.Model):
    """Еда для рыбака."""

    name = models.CharField('Название', max_length=100)
    image = models.ImageField('Изображение', upload_to='food/', blank=True)
    satiety = models.IntegerField('Сытость', default=20)
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Еда'
        verbose_name_plural = 'Еда'
        ordering = ['price']

    def __str__(self):
        return self.name
