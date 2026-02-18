"""Загрузка изображений из статических файлов в ImageField моделей."""

import os

from django.core.files import File
from django.core.management.base import BaseCommand

from apps.tackle.models import (
    Bait, FishSpecies, Flavoring, FloatTackle, Food,
    Groundbait, Hook, Line, Reel, RodType,
)
from apps.world.models import Base, Location

# Путь к статическим изображениям
IMAGES_DIR = '/app/public_images'


class Command(BaseCommand):
    help = 'Загрузка изображений из public/images/ в ImageField моделей'

    def add_arguments(self, parser):
        parser.add_argument(
            '--images-dir', default=IMAGES_DIR,
            help='Путь к директории с изображениями',
        )

    def handle(self, *args, **options):
        images_dir = options['images_dir']
        if not os.path.isdir(images_dir):
            self.stderr.write(f'Директория не найдена: {images_dir}')
            return

        total = 0

        # Рыбы
        total += self._load_by_pk(FishSpecies, os.path.join(images_dir, 'fish'), 'png')

        # Снасти
        total += self._load_by_pk(RodType, os.path.join(images_dir, 'rods'), 'jpg')
        total += self._load_by_pk(Reel, os.path.join(images_dir, 'reels'), 'png')
        total += self._load_by_pk(Line, os.path.join(images_dir, 'lines'), 'png')
        total += self._load_by_pk(Hook, os.path.join(images_dir, 'hooks'), 'png')
        total += self._load_by_pk(FloatTackle, os.path.join(images_dir, 'floats'), 'bmp')

        # Наживки — смешанные расширения
        total += self._load_baits(os.path.join(images_dir, 'baits'))

        total += self._load_by_pk(Groundbait, os.path.join(images_dir, 'groundbaits'), 'jpg')
        total += self._load_by_pk(Flavoring, os.path.join(images_dir, 'flavorings'), 'jpg')
        total += self._load_by_pk(Food, os.path.join(images_dir, 'food'), 'png')

        # Локации (image_day)
        total += self._load_locations(os.path.join(images_dir, 'locations'))

        # Базы
        total += self._load_bases(os.path.join(images_dir, 'locations'))

        self.stdout.write(self.style.SUCCESS(f'Загружено {total} изображений'))

    def _load_by_pk(self, model, directory, ext):
        """Загружает файлы {pk}.{ext} в image поле модели."""
        if not os.path.isdir(directory):
            self.stderr.write(f'  Пропуск: {directory} не найден')
            return 0

        count = 0
        model_name = model.__name__
        for obj in model.objects.all():
            filepath = os.path.join(directory, f'{obj.pk}.{ext}')
            if os.path.isfile(filepath):
                with open(filepath, 'rb') as f:
                    obj.image.save(f'{obj.pk}.{ext}', File(f), save=True)
                count += 1
                self.stdout.write(f'  {model_name} pk={obj.pk}: загружено')
            else:
                self.stdout.write(f'  {model_name} pk={obj.pk}: файл не найден ({filepath})')
        return count

    def _load_baits(self, directory):
        """Наживки имеют смешанные расширения (png и jpg)."""
        if not os.path.isdir(directory):
            return 0

        count = 0
        for obj in Bait.objects.all():
            for ext in ('png', 'jpg'):
                filepath = os.path.join(directory, f'{obj.pk}.{ext}')
                if os.path.isfile(filepath):
                    with open(filepath, 'rb') as f:
                        obj.image.save(f'{obj.pk}.{ext}', File(f), save=True)
                    count += 1
                    self.stdout.write(f'  Bait pk={obj.pk}: загружено')
                    break
        return count

    def _load_locations(self, directory):
        """Загружает {location_pk}.jpg в image_day поле Location."""
        if not os.path.isdir(directory):
            return 0

        count = 0
        for loc in Location.objects.all():
            filepath = os.path.join(directory, f'{loc.pk}.jpg')
            if os.path.isfile(filepath):
                with open(filepath, 'rb') as f:
                    loc.image_day.save(f'loc_{loc.pk}.jpg', File(f), save=True)
                count += 1
                self.stdout.write(f'  Location pk={loc.pk}: загружено')
        return count

    def _load_bases(self, directory):
        """Загружает base_{base_pk}.jpg в image поле Base."""
        if not os.path.isdir(directory):
            return 0

        count = 0
        for base in Base.objects.all():
            filepath = os.path.join(directory, f'base_{base.pk}.jpg')
            if os.path.isfile(filepath):
                with open(filepath, 'rb') as f:
                    base.image.save(f'base_{base.pk}.jpg', File(f), save=True)
                count += 1
                self.stdout.write(f'  Base pk={base.pk}: загружено')
        return count
