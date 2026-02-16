"""Management команда для инициализации игрового времени."""

from django.core.management.base import BaseCommand

from apps.fishing.models import GameTime


class Command(BaseCommand):
    """Инициализирует игровое время, если оно ещё не создано."""

    help = 'Инициализирует глобальное игровое время (singleton)'

    def handle(self, *args, **options):
        gt, created = GameTime.objects.get_or_create(pk=1, defaults={
            'current_hour': 8,
            'current_day': 1,
        })

        if created:
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Игровое время инициализировано: {gt}'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'⚠ Игровое время уже существует: {gt}'
                )
            )
