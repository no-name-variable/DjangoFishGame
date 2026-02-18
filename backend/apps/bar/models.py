"""Модели бара — напитки и заказы закусок из рыбы."""

from django.db import models


class BarDrink(models.Model):
    """Напиток в баре."""

    name = models.CharField('Название', max_length=100)
    description = models.TextField('Описание', blank=True, default='')
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2)
    satiety = models.IntegerField('Сытость')
    image = models.ImageField('Изображение', upload_to='bar/', blank=True)

    class Meta:
        verbose_name = 'Напиток'
        verbose_name_plural = 'Напитки'

    def __str__(self):
        return f'{self.name} ({self.price}$)'


class BarDrinkOrder(models.Model):
    """Заказ напитка (для трекинга выпитого)."""

    player = models.ForeignKey(
        'accounts.Player', on_delete=models.CASCADE,
        related_name='bar_drinks_ordered', verbose_name='Игрок',
    )
    drink = models.ForeignKey(
        BarDrink, on_delete=models.CASCADE, verbose_name='Напиток',
    )
    created_at = models.DateTimeField('Время', auto_now_add=True)

    class Meta:
        verbose_name = 'Заказ напитка'
        verbose_name_plural = 'Заказы напитков'

    def __str__(self):
        return f'{self.player.nickname}: {self.drink.name}'


class BarSnackOrder(models.Model):
    """Заказ закуски из пойманной рыбы."""

    class Preparation(models.TextChoices):
        DRIED = 'dried', 'Сушёная'
        SMOKED = 'smoked', 'Вяленая'
        FRIED = 'fried', 'Жареная'

    player = models.ForeignKey(
        'accounts.Player', on_delete=models.CASCADE,
        related_name='bar_snacks', verbose_name='Игрок',
    )
    fish = models.ForeignKey(
        'inventory.CaughtFish', on_delete=models.CASCADE,
        verbose_name='Рыба',
    )
    preparation = models.CharField(
        'Способ приготовления', max_length=10,
        choices=Preparation.choices,
    )
    satiety_gained = models.IntegerField('Восстановлено сытости')
    created_at = models.DateTimeField('Время', auto_now_add=True)

    class Meta:
        verbose_name = 'Закуска из рыбы'
        verbose_name_plural = 'Закуски из рыбы'

    def __str__(self):
        return f'{self.player.nickname}: {self.get_preparation_display()} рыба +{self.satiety_gained}'
