"""Management-команда: начальная генерация заказов кафе."""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Генерирует начальные заказы кафе для всех локаций'

    def handle(self, *args, **options):
        from apps.cafe.tasks import refresh_cafe_orders

        self.stdout.write('Генерация заказов кафе...')
        refresh_cafe_orders()
        self.stdout.write(self.style.SUCCESS('Заказы кафе сгенерированы.'))
