# Тестирование Backend

## Обзор

Проект полностью покрыт юнит-тестами и интеграционными тестами. Используется pytest + pytest-django.

## Структура тестов

```
backend/
├── conftest.py                    # Общие фикстуры
├── pytest.ini                     # Конфигурация pytest
└── apps/
    ├── fishing/
    │   ├── tests.py              # API тесты рыбалки
    │   └── tests_services.py     # Юнит-тесты сервисов (bite_calculator, fight_engine, fish_selector, time_service)
    ├── records/
    │   ├── tests.py              # API тесты рекордов
    │   └── tests_services.py     # Юнит-тесты (check_record, check_achievements)
    ├── quests/
    │   ├── tests.py              # API тесты квестов
    │   └── tests_services.py     # Юнит-тесты (update_quest_progress)
    ├── potions/
    │   ├── tests.py              # API тесты зелий
    │   └── tests_services.py     # Юнит-тесты (drop_marine_star, has_active_potion)
    ├── tournaments/
    │   ├── tests.py              # API тесты турниров
    │   └── tests_services.py     # Юнит-тесты (finalize_tournament)
    ├── inspection/
    │   ├── tests.py              # API тесты рыбнадзора
    │   └── tests_services.py     # Юнит-тесты (inspect_player)
    ├── shop/
    │   └── tests.py              # API тесты магазина
    ├── inventory/
    │   └── tests.py              # API тесты инвентаря
    ├── teams/
    │   └── tests.py              # API тесты команд
    ├── bazaar/
    │   └── tests.py              # API тесты базара
    └── world/
        └── tests.py              # API тесты мира
```

## Запуск тестов

### Все тесты
```bash
cd backend
pytest
```

### Конкретное приложение
```bash
pytest apps/fishing/
```

### Конкретный файл
```bash
pytest apps/fishing/tests_services.py
```

### Конкретный тест
```bash
pytest apps/fishing/tests_services.py::TestBiteCalculator::test_base_chance_calculation
```

### С покрытием кода
```bash
pytest --cov=apps --cov-report=html
```

### Параллельный запуск (ускорение)
```bash
pytest -n auto
```

### Только быстрые тесты
```bash
pytest -m "not slow"
```

## Основные фикстуры (conftest.py)

### Аутентификация
- `user` — Django User
- `player` — игрок с профилем
- `api_client` — API клиент с JWT токеном

### Игровые сущности
- `base` — рыболовная база
- `location` — локация
- `fish_species` — вид рыбы (Карась)
- `location_fish` — связь локации и рыбы

### Снасти
- `rod_type` — тип удилища
- `reel` — катушка
- `line` — леска
- `hook` — крючок
- `float_tackle` — поплавок
- `bait` — наживка
- `lure` — приманка
- `groundbait` — прикормка
- `food` — еда

### Удочки
- `player_rod` — собранная поплавочная удочка
- `spinning_rod` — собранный спиннинг

### Сессии рыбалки
- `fishing_session_waiting` — состояние WAITING
- `fishing_session_bite` — состояние BITE
- `fishing_session_fighting` — состояние FIGHTING
- `fishing_session_caught` — состояние CAUGHT

### Игровое время
- `game_time` — синглтон игрового времени

## Покрытые механики

### ✅ Fishing (Рыбалка)
- **API тесты**: заброс, статус, подсечка, подмотка, подтяжка, сохранение/отпускание, прикормка
- **Юнит-тесты сервисов**:
  - `bite_calculator`: расчёт поклёвки (время суток, наживка, ранг, карма, голод, прикормка, зелья)
  - `fight_engine`: вываживание (подмотка, подтяжка, обрыв лески, поломка удилища)
  - `fish_selector`: выбор рыбы (weighted random, глубина, прикормка, зелья)
  - `time_service`: игровое время и фазы суток

### ✅ Records (Рекорды)
- **API тесты**: таблица рекордов, рекорды по виду, достижения, журнал
- **Юнит-тесты**: проверка рекордов (check_record), выдача достижений (check_achievements)

### ✅ Quests (Квесты)
- **API тесты**: доступные квесты, взятие, получение награды
- **Юнит-тесты**: обновление прогресса (catch_fish, catch_weight, catch_species, фильтрация по локации)

### ✅ Potions (Зелья)
- **API тесты**: список зелий, крафт, активные зелья
- **Юнит-тесты**: дроп звёзд, проверка активных эффектов

### ✅ Tournaments (Турниры)
- **API тесты**: список, регистрация, результаты
- **Юнит-тесты**: подведение итогов (weight/count scoring, индивидуальные/командные, призы)

### ✅ Inspection (Рыбнадзор)
- **API тесты**: проверки
- **Юнит-тесты**: логика проверок (лимит садка, размерные нарушения, запрещённые виды)

### ✅ Shop (Магазин)
- **API тесты**: покупка снастей, продажа рыбы

### ✅ Inventory (Инвентарь)
- **API тесты**: список предметов, удочки, садок, сборка снастей, еда

### ✅ Teams (Команды)
- **API тесты**: создание, вступление, выход, список

### ✅ Bazaar (Базар)
- **API тесты**: создание лотов, покупка, отмена

## Статистика покрытия

### По модулям (примерная оценка)
- **fishing**: ~90% (core механика, критично важна)
- **records**: ~85%
- **quests**: ~85%
- **potions**: ~80%
- **tournaments**: ~85%
- **inspection**: ~90%
- **shop**: ~75%
- **inventory**: ~70%
- **teams**: ~65%
- **bazaar**: ~70%

## Best Practices

### 1. Именование тестов
```python
def test_<что_тестируем>_<ожидаемый_результат>():
    """Описание теста на русском."""
    # Arrange (подготовка)
    # Act (действие)
    # Assert (проверка)
```

### 2. Использование фикстур
```python
@pytest.mark.django_db
def test_example(player, location, fish_species):
    # Используй готовые фикстуры вместо создания объектов вручную
    assert player.current_base is not None
```

### 3. Изоляция тестов
- Каждый тест должен быть независимым
- Используй `@pytest.mark.django_db` для тестов с БД
- Используй `--reuse-db` для ускорения

### 4. Мокирование
```python
from unittest.mock import patch

@patch('random.random')
def test_with_mock(mock_random):
    mock_random.return_value = 0.5
    # тест с контролируемой случайностью
```

### 5. Параметризация
```python
@pytest.mark.parametrize('hunger,expected', [
    (100, 1.0),
    (50, 0.85),
    (0, 0.7),
])
def test_hunger_modifier(hunger, expected):
    # тест с разными параметрами
    pass
```

## Continuous Integration

### GitHub Actions / GitLab CI
```yaml
- name: Run tests
  run: |
    cd backend
    pytest --cov=apps --cov-report=xml
```

## Отладка

### Просмотр принтов
```bash
pytest -s
```

### Остановка на первом падении
```bash
pytest -x
```

### Запуск последнего упавшего теста
```bash
pytest --lf
```

### Дебаггер
```python
def test_something():
    import pdb; pdb.set_trace()
    # или
    breakpoint()
```

## Добавление новых тестов

1. Определи, что тестируешь: API или бизнес-логику (сервис)
2. API тесты → `tests.py`
3. Сервисы → `tests_services.py`
4. Используй существующие фикстуры из `conftest.py`
5. Следуй паттерну AAA: Arrange-Act-Assert
6. Пиши тесты на русском (docstrings и комментарии)

## Примеры

### API тест
```python
@pytest.mark.django_db
def test_cast_success(api_client, player, location, player_rod):
    player.current_location = location
    player.save()

    resp = api_client.post('/api/fishing/cast/', {
        'rod_id': player_rod.pk,
        'point_x': 10.5,
        'point_y': 20.3,
    })

    assert resp.status_code == 200
    assert resp.data['status'] == 'cast_ok'
```

### Юнит-тест сервиса
```python
@pytest.mark.django_db
def test_bite_chance_with_bait(player, location, player_rod, bait, fish_species):
    bait.target_species.add(fish_species)
    player_rod.bait = bait
    player_rod.save()

    chance = bite_calculator.calculate_bite_chance(player, location, player_rod)

    assert chance > 0
```

## FAQ

**Q: Тесты падают с ошибкой миграций?**
A: Используй `--nomigrations` (уже в `pytest.ini`)

**Q: Тесты медленные?**
A: Используй `--reuse-db` и `-n auto` для параллелизма

**Q: Как замокать random?**
A: `@patch('random.random')` или `@patch('module.path.random')`

**Q: Как протестировать Celery таски?**
A: Используй `@task.apply()` вместо `.delay()` для синхронного выполнения

**Q: Нужно ли тестировать Django ORM?**
A: Нет, тестируй свою бизнес-логику, а не фреймворк
