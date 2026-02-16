# Фоновые задачи (Celery)

Проект использует Celery для выполнения фоновых периодических задач. Все задачи настроены на автоматический запуск при инициализации проекта.

## Архитектура

- **Celery Worker** - выполняет асинхронные задачи
- **Celery Beat** - планировщик периодических задач (с хранением расписания в БД через `django-celery-beat`)
- **Redis** - брокер сообщений и результатов

## Периодические задачи

Все задачи настроены в `config/celery.py` в `app.conf.beat_schedule`:

### 1. Игровое время (`advance_game_time`)

**Файл**: `apps/fishing/tasks.py`
**Расписание**: Каждые 30 секунд
**Описание**: Продвигает игровое время на 1 час. 30 реальных секунд = 1 игровой час.

```python
@shared_task
def advance_game_time():
    """Продвинуть игровое время на 1 час."""
    gt = GameTime.get_instance()
    gt.current_hour += 1
    if gt.current_hour >= 24:
        gt.current_hour = 0
        gt.current_day += 1
    gt.last_tick = timezone.now()
    gt.save()
```

### 2. Голод игроков (`hunger_tick`)

**Файл**: `apps/fishing/tasks.py`
**Расписание**: Каждые 5 минут
**Описание**: Снижает сытость у всех активных игроков (находящихся на локации) на 2 единицы.

```python
@shared_task
def hunger_tick():
    """Снизить сытость у активных игроков."""
    decrease = settings.GAME_SETTINGS['HUNGER_DECREASE']
    Player.objects.filter(
        current_location__isnull=False, hunger__gt=0,
    ).update(hunger=F('hunger') - decrease)
    Player.objects.filter(hunger__lt=0).update(hunger=0)
```

### 3. Очистка прикормки (`cleanup_expired_groundbait`)

**Файл**: `apps/fishing/tasks.py`
**Расписание**: Каждый час
**Описание**: Удаляет истёкшие прикормочные пятна на основе игрового времени.

```python
@shared_task
def cleanup_expired_groundbait():
    """Удалить истёкшие прикормочные пятна."""
    gt = GameTime.get_instance()
    expired = GroundbaitSpot.objects.filter(
        expires_at_day__lt=gt.current_day,
    ) | GroundbaitSpot.objects.filter(
        expires_at_day=gt.current_day,
        expires_at_hour__lte=gt.current_hour,
    )
    count = expired.count()
    expired.delete()
    return f'Удалено {count} истёкших прикормочных пятен.'
```

### 4. Истечение зелий (`expire_potions`)

**Файл**: `apps/potions/tasks.py`
**Расписание**: Каждый час
**Описание**: Удаляет зелья у игроков, у которых истёк срок действия (на основе игрового времени).

```python
@shared_task
def expire_potions():
    """Удаляет истёкшие зелья."""
    gt = GameTime.get_instance()
    expired = PlayerPotion.objects.filter(
        expires_at_day__lt=gt.current_day,
    ) | PlayerPotion.objects.filter(
        expires_at_day=gt.current_day,
        expires_at_hour__lte=gt.current_hour,
    )
    count = expired.count()
    expired.delete()
    return f'Удалено {count} истёкших зелий.'
```

### 5. Завершение турниров (`check_and_finalize_tournaments`)

**Файл**: `apps/tournaments/tasks.py`
**Расписание**: Каждые 10 минут
**Описание**: Проверяет турниры с истёкшим временем и автоматически подводит итоги, распределяет призы.

```python
@shared_task
def check_and_finalize_tournaments():
    """
    Находит турниры, у которых истёк срок окончания,
    но итоги ещё не подведены, и завершает их.
    """
    pending = Tournament.objects.filter(
        is_finished=False,
        end_time__lte=timezone.now(),
    )
    for tournament in pending:
        finalize_tournament(tournament.pk)
```

### 6. Рыбнадзор (`fish_inspection`)

**Файл**: `apps/inspection/tasks.py`
**Расписание**: Каждые 30 минут
**Описание**: Выбирает всех активных игроков и с вероятностью 10% проводит проверку каждого на нарушения (запрещённые виды, размеры, лимит садка).

```python
@shared_task
def fish_inspection():
    """
    Периодическая проверка рыбнадзора.
    Выбирает всех активных игроков и с вероятностью 10%
    проводит проверку каждого.
    """
    active_players = Player.objects.filter(
        current_location__isnull=False,
    )
    for player in active_players:
        if random.random() < 0.10:
            inspect_player(player)
```

## Инициализация игрового времени

При первом запуске проекта автоматически создаётся объект `GameTime` (singleton) через management команду:

```bash
python manage.py init_game_time
```

Эта команда запускается автоматически в `docker-compose.yml` при старте backend-контейнера.

## Настройки

Параметры задач настраиваются в `config/settings.py`:

```python
GAME_SETTINGS = {
    'GAME_TICK_SECONDS': 30,       # 30 реальных секунд = 1 игровой час
    'HUNGER_TICK_MINUTES': 5,      # снижение сытости каждые 5 минут
    'HUNGER_DECREASE': 2,          # на сколько снижается сытость за тик
    'STARTING_MONEY': 500.00,
    'STARTING_RANK': 1,
    'MAX_CREEL_SIZE': 30,
    'MAX_ACTIVE_RODS': 3,
}
```

## Запуск в Docker

Все сервисы Celery запускаются автоматически через `docker-compose up`:

```yaml
celery:
  command: celery -A config worker -l info

celery-beat:
  command: celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

## Мониторинг задач

Для мониторинга Celery можно использовать:

1. **Django Admin** - `/admin/django_celery_beat/` для управления расписанием
2. **Логи Celery** - `docker-compose logs celery` и `docker-compose logs celery-beat`
3. **Flower** (опционально) - веб-интерфейс для мониторинга Celery

## Ручной запуск задач

Для тестирования можно запустить задачи вручную:

```python
# В Django shell
from apps.fishing.tasks import advance_game_time, hunger_tick
from apps.potions.tasks import expire_potions

# Запуск синхронно
advance_game_time()

# Запуск асинхронно через Celery
advance_game_time.delay()
```

## Добавление новых периодических задач

1. Создайте задачу в соответствующем `tasks.py` с декоратором `@shared_task`
2. Добавьте расписание в `config/celery.py` в `app.conf.beat_schedule`
3. Перезапустите `celery-beat`: `docker-compose restart celery-beat`

Пример:

```python
# В config/celery.py
app.conf.beat_schedule = {
    # ... существующие задачи
    'my-new-task': {
        'task': 'apps.myapp.tasks.my_task',
        'schedule': 3600.0,  # каждый час
    },
}
```
