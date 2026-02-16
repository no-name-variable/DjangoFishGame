# Промпт для разработки браузерного аналога «Русская Рыбалка 3»

## Контекст и цель

Разработай полнофункциональный браузерный аналог культовой игры «Русская Рыбалка 3» (Russian Fishing 3) — 2D-симулятора рыбной ловли. Бэкенд на Django (Python), фронтенд — SPA на React (или Vue), общение через REST API + WebSocket (django-channels) для реалтайм-механик (чат, мультиплеер на локации, турниры). Визуально и по механикам игра должна максимально воспроизводить оригинал.

---

## 1. АРХИТЕКТУРА

### 1.1 Backend (Django)
- **Django 5.x** + Django REST Framework для API
- **django-channels** + Redis для WebSocket (чат, реалтайм на локациях, таймеры)
- **Celery + Redis** для фоновых задач (смена времени суток, обновление турниров, начисление наград, расчёт рыбинспекции)
- **PostgreSQL** — основная БД
- **Django-allauth** или JWT-аутентификация
- **django-admin** — панель администратора для управления контентом (рыбы, снасти, водоёмы, квесты)

### 1.2 Frontend (SPA)
- **React 18** (или Vue 3) + TypeScript
- **Canvas API** (HTML5 Canvas) или **PixiJS** для отрисовки игровых сцен (водоём, поплавок, вываживание, анимации)
- **Zustand / Redux** для стейт-менеджмента
- **Socket.IO / native WebSocket** — клиентская часть реалтайма
- Адаптивная вёрстка (desktop-first, но работает на планшетах)

### 1.3 Статика и медиа
- **AWS S3 / MinIO** для хранения изображений (рыбы, локации, снасти, карты)
- **Nginx** — reverse proxy + статика
- **Docker + docker-compose** — деплой всего стека

---

## 2. ВИЗУАЛЬНЫЙ СТИЛЬ И ИНТЕРФЕЙС (как в оригинале РР3)

РР3 — это **2D-игра** с фотореалистичными фонами (реальные фотографии водоёмов). Интерфейс состоит из нескольких ключевых экранов:

### 2.1 Главное меню (База)
На базе отображаются кнопки/пункты:
- **На рыбалку** (карта локаций) — маленькая карта с отмеченными точками-локациями
- **Рыболовный магазин** — покупка снастей, наживок, блёсен, прикормок, ароматизаторов
- **Продуктовый магазин** — еда для рыбака (хлеб, колбаса, напитки, алкоголь)
- **Рюкзак / Инвентарь** — 4 вкладки: снасти, еда, садок (улов), разное
- **Продать рыбу** — продажа улова за игровую валюту
- **Газета** — рекорды недели, новости, топ рыбаков
- **Турниры** — список доступных турниров (индивидуальные, командные)
- **Квесты** — задания на ловлю определённых рыб
- **Команды** — создание/вступление в команду
- **Достижения** — медали, кубки, разряд, карма
- **Настройки** — звук, графика, управление
- **Карта мира** — переезд между базами (разные регионы/страны)
- **Чат** — общий онлайн-чат

Визуально: тёмно-зелёная / древесная цветовая палитра, стилизация под рыболовный журнал. Верхняя панель: имя игрока, уровень/разряд, деньги, карма, иконка рюкзака.

### 2.2 Экран локации (Рыбалка)
- **Основной фон** — фотореалистичная картинка водоёма (озеро, река, море) с разным временем суток (день, ночь, утро, вечер — 4 состояния)
- **Панель управления внизу** — кнопки:
  - Заброс (клик по водоёму = выбор точки заброса)
  - Подсечка / Подмотка / Подтяжка (клавиши G, H)
  - Сменить снасть
  - Прикорм (бросить в точку ловли)
  - Настроить снасть (глубина, скорость проводки)
  - Садок (посмотреть улов)
  - Назад на базу
- **Левый верхний угол** — индикатор наживки (сколько осталось)
- **Бегущая строка сообщений** — события: «У игрока X клюёт!», «Игрок Y поймал щуку 3.2 кг!»
- **Индикатор поклёвки**:
  - Поплавочная снасть: анимация поплавка (подёргивание → уход под воду)
  - Донная снасть: звук колокольчика
  - Спиннинг: удар по блесне при проводке
- **Полоса вываживания** — горизонтальный индикатор нагрузки (зелёная → жёлтая → красная зона). Если ползунок в красной зоне — рыба сходит или рвётся леска.

### 2.3 Окно пойманной рыбы
Модальное окно с:
- Фото рыбы (реалистичное изображение)
- Название вида
- Вес (кг / г)
- Длина
- Краткое описание вида
- Кнопки: «В садок» / «Отпустить» (отпускание даёт +карму)
- Если рекорд — показать «НОВЫЙ РЕКОРД!» с фанфарами

### 2.4 Рюкзак (Инвентарь)
Разбит на 4 вкладки (иконки внизу):
1. **Снасти** — собранные удочки, запасные компоненты
2. **Еда** — продукты, напитки
3. **Садок** — пойманная рыба (с весом, видом, иконкой)
4. **Разное** — путёвки, лицензии, клады, отвары, морские звёзды

### 2.5 Магазин снастей
Категории товаров (вертикальное меню слева):
- Удилища (поплавочные, спиннинговые, донные/фидерные)
- Катушки
- Лески
- Крючки
- Поплавки
- Грузила
- Блёсны / воблеры / приманки
- Наживки (черви, опарыш, кукуруза, тесто, живец и др.)
- Прикормки
- Ароматизаторы

Каждый товар: картинка, название, характеристики (тест удилища, прочность лески, размер крючка), цена.

---

## 3. ИГРОВЫЕ МЕХАНИКИ (полный список из оригинала)

### 3.1 Система прогрессии персонажа
- **Разряд** (уровень): от 1-го до 100+. Растёт от набора опыта. Формула: каждый разряд требует больше опыта. После 50-го разряда — 200,000 опыта за уровень.
- **Опыт**: начисляется за каждую пойманную рыбу. Зависит от: вида, веса рыбы, редкости. Более ценная рыба = больше опыта.
- **Карма**: положительная/отрицательная. Растёт при отпускании рыбы (+1..+5), выигрыше турниров, выполнении квестов. Падает при нарушениях (штрафы рыбинспекции). Карма нужна для доступа к некоторым локациям и для приготовления отваров.
- **Деньги (серебро)**: зарабатываются продажей рыбы, выполнением квестов, нахождением кладов. Тратятся на снасти, еду, путёвки, транспорт.
- **Голд (премиум-валюта)**: опционально, для монетизации.

### 3.2 Снасти и их сборка
Три типа снастей:
1. **Поплавочная удочка**: удилище + катушка + леска + крючок + наживка + поплавок. Настраивается глубина.
2. **Донная снасть (донка/фидер)**: удилище + кормушка/грузило + леска + крючок + наживка. Не требует настройки глубины. Сигнал поклёвки — колокольчик.
3. **Спиннинг**: спиннинговое удилище + катушка + леска + блесна/воблер. Настраивается скорость проводки.

Каждый компонент имеет характеристики:
- **Удилище**: тест (мин/макс вес рыбы), прочность (износ), длина
- **Катушка**: тяга, вместимость лески, прочность
- **Леска**: прочность (на разрыв), толщина
- **Крючок**: размер (влияет на то, какая рыба клюёт)
- **Поплавок**: грузоподъёмность, чувствительность
- **Блесна/воблер**: тип, размер, глубина проводки, привлекательность для разных видов

**Износ снастей**: каждое вываживание изнашивает удилище, катушку, леску. При полном износе — ломается. Можно чинить ремнабором.

### 3.3 Процесс ловли (core gameplay loop)
```
1. Выбрать локацию на карте
2. Собрать/настроить снасть в рюкзаке
3. Сделать заброс (клик по водоёму = выбор дистанции и точки)
4. Ожидание поклёвки (время зависит от: вида рыбы, наживки, времени суток, прикорма, погоды, «клёвости» локации)
5. При поклёвке — подсечка (таймер, нужно успеть)
6. Вываживание — мини-игра:
   - Индикатор нагрузки (не дать уйти в красную зону)
   - Подмотка (G) — наматывать леску
   - Подтяжка (H) — потянуть удилищем
   - Если рыба крупная — она делает рывки (нагрузка скачет)
   - Фрикцион катушки — автоматический стравливание при перегрузке
7. Успех → рыба в садке / Неудача → обрыв лески, сход рыбы
8. Посмотреть рыбу → в садок или отпустить
```

### 3.4 Система рыб
- **1000+ видов** (в нашем MVP — минимум 50-100, потом расширять)
- Каждый вид:
  - Название (русское, латинское)
  - Фото / иллюстрация
  - Описание
  - Минимальный / максимальный вес
  - Минимальный / максимальный размер
  - Ареал обитания (в каких водоёмах и локациях встречается)
  - Глубина обитания
  - Время активности (утро/день/вечер/ночь)
  - Предпочитаемые наживки
  - Редкость (обычная, редкая, трофейная, легендарная)
  - Стоимость (цена продажи)
  - Опыт за поимку
- Вес рыбы генерируется случайно в пределах диапазона (с весовой кривой — больше мелких, меньше крупных)
- Вероятность поклёвки зависит от: наживки, глубины, времени суток, прикорма, разряда игрока, кармы, погоды

### 3.5 Водоёмы и локации
- **Базы** — крупные регионы (Озеро, Ахтуба, Волга, Ладога, Байкал, Амазонка, Конго и т.д.)
- Каждая база содержит несколько **локаций** (конкретных мест для рыбалки)
- Каждая локация:
  - Фоновое изображение (день/ночь/утро/вечер)
  - Карта глубин (влияет на заброс)
  - Набор обитающих рыб с вероятностями
  - Требования доступа (минимальный разряд, карма, путёвка)
- Переезд между базами стоит денег (билет на транспорт)
- Некоторые базы доступны только при наличии вездехода/автомобиля (покупается в магазине)

### 3.6 Время суток и погода
- Игровое время идёт ускоренно (1 игровой час = N реальных минут, настраивается)
- 4 фазы суток: утро (5:00–10:00), день (10:00–18:00), вечер (18:00–22:00), ночь (22:00–5:00)
- Каждая фаза влияет на клёв разных видов рыб
- Погода (опционально): ясно, облачно, дождь, гроза — влияет на активность рыбы

### 3.7 Прикормка и ароматизаторы
- **Прикормки**: готовятся из ингредиентов или покупаются. Бросаются в точку ловли. Привлекают рыбу на N игровых часов.
- **Ароматизаторы**: добавляются к наживке, повышают привлекательность для определённых видов.
- Комбинации прикорм + ароматизатор + наживка дают синергию.

### 3.8 Еда и голод
- У рыбака есть **шкала сытости**. Падает со временем.
- Если голоден — штраф к ловле (медленнее вываживание, хуже клёв).
- Еда покупается в продуктовом магазине.
- **Алкоголь** (пиво, водка, коньяк) — даёт временные бонусы (например, коньяк увеличивает опыт за рыбу), но вызывает «опьянение» (штрафы к точности).
- **Уха** — готовится из пойманной рыбы, даёт бонусы к сытости и клёву.

### 3.9 Турниры
Два типа:
1. **Индивидуальные**: кто поймает больше/крупнее рыбу определённого вида за время. Награда: деньги, опыт, карма, медали.
2. **Командные**: суммарный результат команды. Награда делится.

Виды турниров:
- По весу (самая тяжёлая рыба)
- По количеству (больше всех поймал)
- Квестовые турниры (поймай определённую рыбу)
- Speed Fishing (за минимальное время)

### 3.10 Квесты
- Задания на ловлю определённых рыб (например: «Поймай 5 щук от 3 кг на Ахтубе»)
- Цепочки квестов с нарастающей сложностью
- Награды: деньги, уникальные снасти, опыт, доступ к новым локациям
- Квесты на поиск **кладов** и **сокровищ** (артефакты викингов, пиратские клады)

### 3.11 Отвары (зелья)
Крафтятся из **морских звёзд** (выпадают при ловле). Виды:
- **Отвар удачи** (-50 кармы): облегчает вываживание, снимает лимит садка
- **Отвар невидимости** (-200 кармы): скрывает от других игроков
- **Отвар клада** (-40 кармы): повышает шанс найти клад
- **Отвар редкости** (-1000 кармы): шанс на редкую рыбу (одноразовый)
- **Отвар разряда** (-5000 кармы): +1 разряд
- **Отвар трофея** (-300 кармы): приманивает крупную рыбу

### 3.12 Рыбинспекция
- Случайные проверки (рандомное событие)
- Если в садке запрещённая рыба или превышен лимит — штраф (деньги + карма)
- Мотивация отпускать мелкую / редкую рыбу

### 3.13 Рекорды и таблицы
- **Таблица рекордов**: по каждому виду рыбы — самый крупный экземпляр
- **Рекордсмен недели**: подсчёт в конце недели, награждение
- **Личный журнал рыбака**: все пойманные виды, максимальные веса

### 3.14 Достижения и медали
- Медали за: первую рыбу, 100 рыб, трофей определённого вида, выигрыш турнира, максимальный разряд, прохождение квеста
- Кубки: бронза, серебро, золото за турниры
- Значки на профиле

### 3.15 Барахолка / Аукцион (опционально)
- Торговля между игроками: снасти, наживки, редкие предметы
- Торговый билет (разрешение торговать)

### 3.16 Команды / Клубы
- Создание команды (название, логотип)
- Приглашение игроков
- Командный чат
- Командные турниры
- Командный рейтинг

---

## 4. МОДЕЛИ ДАННЫХ (Django Models — ключевые)

```python
# === Игрок ===
Player:
    user (FK → User)
    nickname (str)
    rank (int)  # разряд
    experience (int)
    karma (int)
    money (decimal)
    gold (int)  # премиум
    hunger (int, 0-100)
    current_base (FK → Base)
    current_location (FK → Location, nullable)
    created_at, updated_at

# === Снасти ===
RodType:  # Тип удилища
    name, description, image
    rod_class (enum: spinning, float, bottom)
    test_min, test_max (float, кг)
    durability_max (int)
    length (float, м)
    price (decimal)
    min_rank (int)

Reel:  # Катушка
    name, description, image
    drag_power (float)
    line_capacity (int)
    durability_max (int)
    price (decimal)

Line:  # Леска
    name, description, image
    breaking_strength (float, кг)
    thickness (float, мм)
    length (int, м)
    price (decimal)

Hook:  # Крючок
    name, size (int), price

Lure:  # Блесна/приманка
    name, image, lure_type (enum: spoon, wobbler, jig, soft)
    depth_min, depth_max
    target_species (M2M → FishSpecies)
    price

Bait:  # Наживка
    name, image
    target_species (M2M → FishSpecies)
    quantity_per_pack (int)
    price

Float:  # Поплавок
    name, image, capacity (float), sensitivity (int)
    price

Groundbait:  # Прикормка
    name, image, effectiveness (int)
    target_species (M2M → FishSpecies)
    duration_hours (int, игровых)
    price

Flavoring:  # Ароматизатор
    name, image
    target_species (M2M → FishSpecies)
    bonus_multiplier (float)
    price

# === Собранная снасть игрока ===
PlayerRod:
    player (FK → Player)
    rod_type (FK → RodType)
    reel (FK → Reel, nullable)
    line (FK → Line, nullable)
    hook (FK → Hook, nullable)
    float (FK → Float, nullable)
    lure (FK → Lure, nullable)
    bait (FK → Bait, nullable)
    bait_remaining (int)
    durability_current (int)
    is_assembled (bool)
    depth_setting (float)  # для поплавочной
    retrieve_speed (int)  # для спиннинга

# === Инвентарь ===
InventoryItem:
    player (FK → Player)
    item_type (enum: rod, reel, line, hook, float, lure, bait, food, ticket, misc)
    item_id (int)  # generic FK
    quantity (int)

# === Рыбы ===
FishSpecies:
    name_ru, name_latin
    description (text)
    image
    weight_min, weight_max (float, кг)
    length_min, length_max (float, см)
    rarity (enum: common, uncommon, rare, trophy, legendary)
    sell_price_per_kg (decimal)
    experience_per_kg (int)
    active_time (json: {morning: 0.8, day: 0.3, evening: 0.9, night: 0.5})
    preferred_depth_min, preferred_depth_max (float)
    preferred_baits (M2M → Bait)
    preferred_lures (M2M → Lure)

# === Водоёмы ===
Base:  # Рыболовная база (регион)
    name, description, image
    world_map_x, world_map_y (координаты на карте мира)
    min_rank (int)
    min_karma (int)
    travel_cost (decimal)
    requires_vehicle (bool)

Location:  # Конкретная локация
    base (FK → Base)
    name, description
    image_morning, image_day, image_evening, image_night
    depth_map (json)  # карта глубин
    min_rank (int)
    requires_ticket (bool)

LocationFish:  # Рыба на локации (M2M с доп. полями)
    location (FK → Location)
    fish (FK → FishSpecies)
    spawn_weight (float, 0-1)  # вероятность относительная
    depth_preference (float)

# === Улов / Садок ===
CaughtFish:
    player (FK → Player)
    species (FK → FishSpecies)
    weight (float)
    length (float)
    location (FK → Location)
    caught_at (datetime)
    is_sold (bool)
    is_released (bool)
    is_record (bool)

# === Турниры ===
Tournament:
    name, description
    tournament_type (enum: individual, team)
    scoring (enum: weight, count, specific_fish)
    target_species (FK → FishSpecies, nullable)
    start_time, end_time
    entry_fee (decimal)
    prize_money (decimal)
    prize_experience (int)
    prize_karma (int)
    min_rank (int)
    max_participants (int)

TournamentEntry:
    tournament (FK)
    player (FK)
    team (FK, nullable)
    score (float)
    rank_position (int)

# === Квесты ===
Quest:
    name, description
    quest_type (enum: catch_fish, find_treasure, catch_weight)
    target_species (FK, nullable)
    target_count (int)
    target_weight (float)
    target_location (FK, nullable)
    reward_money, reward_exp, reward_karma
    reward_item (FK, nullable)
    prerequisite_quest (FK, nullable)
    min_rank (int)

PlayerQuest:
    player (FK), quest (FK)
    progress (int)
    status (enum: active, completed, claimed)

# === Рекорды ===
FishRecord:
    species (FK → FishSpecies)
    player (FK → Player)
    weight (float)
    location (FK → Location)
    caught_at (datetime)
    is_weekly_champion (bool)

# === Команды ===
Team:
    name, logo_image
    leader (FK → Player)
    created_at

TeamMembership:
    team (FK), player (FK)
    role (enum: leader, officer, member)
    joined_at

# === Чат ===
ChatMessage:
    player (FK → Player)
    channel (enum: global, location, team)
    text (str)
    timestamp (datetime)

# === Отвары ===
Potion:
    name, description, image
    karma_cost (int)
    effect_type (str)
    effect_value (float)
    duration_hours (int)
    required_stars (json)  # {red: 8, orange: 4, ...}

PlayerPotion:
    player (FK), potion (FK)
    activated_at (datetime)
    expires_at (datetime)
```

---

## 5. API ENDPOINTS (основные)

```
# Auth
POST   /api/auth/register/
POST   /api/auth/login/
POST   /api/auth/logout/

# Player
GET    /api/player/profile/
GET    /api/player/inventory/
GET    /api/player/creel/          # садок
POST   /api/player/eat/            # покормить рыбака
GET    /api/player/achievements/
GET    /api/player/journal/         # журнал рыбака

# Map & Locations
GET    /api/bases/                  # список баз
GET    /api/bases/{id}/locations/   # локации базы
POST   /api/bases/{id}/travel/      # переезд на базу
POST   /api/locations/{id}/enter/   # зайти на локацию
POST   /api/locations/{id}/leave/

# Shop
GET    /api/shop/rods/
GET    /api/shop/reels/
GET    /api/shop/lines/
GET    /api/shop/hooks/
GET    /api/shop/baits/
GET    /api/shop/lures/
GET    /api/shop/groundbaits/
GET    /api/shop/food/
POST   /api/shop/buy/

# Fishing (core)
POST   /api/fishing/assemble-rod/    # собрать удочку
POST   /api/fishing/cast/            # заброс {point_x, point_y, rod_id}
POST   /api/fishing/strike/          # подсечка
POST   /api/fishing/reel-in/         # подмотка (вываживание шаг)
POST   /api/fishing/pull/            # подтяжка удилищем
GET    /api/fishing/status/          # текущий статус (ожидание / поклёвка / вываживание)
POST   /api/fishing/keep/            # рыбу в садок
POST   /api/fishing/release/         # отпустить рыбу
POST   /api/fishing/groundbait/      # бросить прикормку
POST   /api/fishing/sell-fish/       # продать улов

# Tournaments
GET    /api/tournaments/
POST   /api/tournaments/{id}/join/
GET    /api/tournaments/{id}/results/

# Quests
GET    /api/quests/available/
POST   /api/quests/{id}/accept/
GET    /api/quests/active/
POST   /api/quests/{id}/claim/       # забрать награду

# Records
GET    /api/records/                  # таблица рекордов
GET    /api/records/weekly/

# Teams
POST   /api/teams/create/
POST   /api/teams/{id}/join/
GET    /api/teams/{id}/

# Chat (WebSocket)
WS     /ws/chat/global/
WS     /ws/chat/location/{id}/
WS     /ws/chat/team/{id}/

# Realtime fishing (WebSocket)
WS     /ws/fishing/{location_id}/    # поклёвки, события на локации
```

---

## 6. АЛГОРИТМ ПОКЛЁВКИ И ВЫВАЖИВАНИЯ

### 6.1 Расчёт поклёвки (серверная сторона)
```python
def calculate_bite(player, location, rod_setup):
    """
    Вызывается каждые N секунд после заброса.
    Возвращает: None (нет поклёвки) или FishSpecies + weight.
    """
    base_chance = 0.05  # 5% за тик

    # Модификаторы
    modifiers = 1.0
    modifiers *= get_time_of_day_modifier(location, game_time)  # 0.3 - 1.5
    modifiers *= get_bait_modifier(rod_setup.bait, available_fish)  # 0.5 - 2.0
    modifiers *= get_groundbait_modifier(location, player)  # 1.0 - 1.5
    modifiers *= get_depth_modifier(rod_setup.depth, available_fish)  # 0.5 - 1.5
    modifiers *= get_rank_modifier(player.rank)  # 1.0 - 1.3
    modifiers *= get_karma_modifier(player.karma)  # 0.8 - 1.2
    modifiers *= get_hunger_modifier(player.hunger)  # 0.7 - 1.0
    modifiers *= get_potion_modifier(player)  # 1.0 - 2.0

    final_chance = base_chance * modifiers

    if random.random() < final_chance:
        # Выбрать вид рыбы (weighted random по spawn_weight и совместимости наживки)
        species = weighted_fish_selection(location, rod_setup, game_time)
        weight = generate_fish_weight(species, player.rank)
        return species, weight
    return None
```

### 6.2 Вываживание (серверная мини-игра)
```python
class FightSession:
    fish_weight: float
    fish_strength: float  # базовая сила = f(weight, species)
    line_tension: float  # 0-100, >80 = красная зона, 100 = обрыв
    distance: float  # расстояние до берега
    rod_durability: float

    def reel_in(self):
        """Подмотка — приближает рыбу, увеличивает натяжение"""
        self.distance -= calculate_pull(self.rod, self.reel)
        self.line_tension += self.fish_strength * random.uniform(0.5, 1.5)

    def pull_rod(self):
        """Подтяжка — сильнее приближает, но больше нагрузка на удилище"""
        self.distance -= calculate_pull(self.rod, self.reel) * 1.5
        self.line_tension += self.fish_strength * random.uniform(0.8, 2.0)
        self.rod_durability -= 1

    def fish_action(self):
        """Рывок рыбы (автоматический, каждый тик)"""
        if random.random() < 0.3:  # шанс рывка
            self.distance += self.fish_strength * random.uniform(1, 3)
            self.line_tension += 15

        # Естественное снижение натяжения
        self.line_tension = max(0, self.line_tension - 2)

    def check_result(self):
        if self.line_tension >= 100:
            return 'line_break'
        if self.distance <= 0:
            return 'caught'
        if self.rod_durability <= 0:
            return 'rod_break'
        return 'fighting'
```

---

## 7. CELERY-ЗАДАЧИ (фоновые процессы)

```python
# Смена игрового времени
@shared_task
def advance_game_time():
    """Каждые 30 реальных секунд = 1 игровой час"""

# Рыбинспекция
@shared_task
def fish_inspection():
    """Случайная проверка активных рыбаков"""

# Подсчёт турниров
@shared_task
def finalize_tournament(tournament_id):
    """По окончании турнира — подсчёт, награждение"""

# Еженедельные рекорды
@shared_task
def calculate_weekly_records():
    """Каждый понедельник — подсчёт рекордсменов недели"""

# Истечение отваров
@shared_task
def expire_potions():
    """Проверка и удаление истёкших эффектов"""

# Деградация голода
@shared_task
def hunger_tick():
    """Снижение сытости у активных игроков"""
```

---

## 8. ФРОНТЕНД — КЛЮЧЕВЫЕ КОМПОНЕНТЫ

```
src/
├── pages/
│   ├── LoginPage.tsx
│   ├── BasePage.tsx           # Главное меню базы
│   ├── MapPage.tsx            # Карта мира (выбор базы)
│   ├── LocationMapPage.tsx    # Карта локаций текущей базы
│   ├── FishingPage.tsx        # ОСНОВНОЙ экран рыбалки
│   ├── ShopPage.tsx           # Магазин снастей
│   ├── FoodShopPage.tsx       # Продуктовый магазин
│   ├── InventoryPage.tsx      # Рюкзак
│   ├── TournamentsPage.tsx    # Турниры
│   ├── QuestsPage.tsx         # Квесты
│   ├── RecordsPage.tsx        # Таблица рекордов
│   ├── ProfilePage.tsx        # Профиль, достижения
│   ├── TeamPage.tsx           # Команда
│   └── NewspaperPage.tsx      # Газета
├── components/
│   ├── fishing/
│   │   ├── WaterCanvas.tsx        # Canvas-компонент с водоёмом
│   │   ├── FloatAnimation.tsx     # Анимация поплавка
│   │   ├── FightBar.tsx           # Полоса вываживания
│   │   ├── CastIndicator.tsx      # Индикатор точки заброса
│   │   ├── BiteNotification.tsx   # Уведомление о поклёвке
│   │   ├── CaughtFishModal.tsx    # Модальное окно пойманной рыбы
│   │   └── ControlPanel.tsx       # Нижняя панель управления
│   ├── inventory/
│   │   ├── BackpackTabs.tsx       # Вкладки рюкзака
│   │   ├── RodAssembly.tsx        # Сборка удочки (drag & drop)
│   │   ├── CreelView.tsx          # Садок
│   │   └── ItemCard.tsx           # Карточка предмета
│   ├── shop/
│   │   ├── ShopSidebar.tsx        # Категории слева
│   │   ├── ProductGrid.tsx        # Сетка товаров
│   │   └── ProductCard.tsx        # Карточка товара
│   ├── ui/
│   │   ├── TopBar.tsx             # Верхняя панель (имя, деньги, разряд, карма)
│   │   ├── ChatWindow.tsx         # Чат
│   │   ├── Ticker.tsx             # Бегущая строка событий
│   │   ├── TimeOfDayIndicator.tsx # Индикатор времени суток
│   │   └── ProgressBar.tsx        # Универсальный прогресс-бар
│   ├── map/
│   │   ├── WorldMap.tsx           # Карта мира с базами
│   │   └── LocationMap.tsx        # Карта локаций базы
│   └── tournaments/
│       ├── TournamentCard.tsx
│       └── Leaderboard.tsx
├── hooks/
│   ├── useFishing.ts          # Логика рыбалки (состояния, таймеры)
│   ├── useWebSocket.ts        # WebSocket-подключение
│   ├── useGameTime.ts         # Игровое время
│   └── useInventory.ts
├── store/
│   ├── playerStore.ts
│   ├── fishingStore.ts
│   ├── inventoryStore.ts
│   └── chatStore.ts
├── api/
│   ├── auth.ts
│   ├── fishing.ts
│   ├── shop.ts
│   ├── player.ts
│   └── tournaments.ts
└── assets/
    ├── images/
    │   ├── fish/              # Фото рыб
    │   ├── locations/         # Фоны локаций (day/night/morning/evening)
    │   ├── tackle/            # Снасти
    │   ├── maps/              # Карты
    │   ├── ui/                # UI-элементы
    │   └── baits/             # Наживки
    └── sounds/
        ├── splash.mp3         # Заброс
        ├── reel.mp3           # Подмотка
        ├── bell.mp3           # Колокольчик донки
        ├── bite.mp3           # Поклёвка
        ├── catch.mp3          # Пойманная рыба
        ├── birds.mp3          # Фон — птицы
        └── water.mp3          # Фон — вода
```

---

## 9. СТИЛИЗАЦИЯ (CSS / Tailwind)

Ориентируйся на визуальный стиль РР3:
- **Цветовая палитра**: тёмно-зелёный (#1a3a1a), коричневый (#5c3d1e), бежевый (#d4c5a9), тёмно-синий (#1a2a4a) для ночных сцен
- **Шрифты**: Georgia или PT Serif для заголовков (ощущение «рыболовного журнала»), система sans-serif для UI
- **Кнопки**: стилизованы под деревянные таблички или металлические элементы
- **Фоны панелей**: текстура дерева или холщовая ткань
- **Иконки**: реалистичные маленькие изображения (не flat-icons)
- **Границы окон**: рамки с закруглёнными углами, лёгкий drop-shadow, имитация «окна» в рыбацком домике

---

## 10. MVP (минимально жизнеспособный продукт)

### Фаза 1 — Core (4-6 недель)
1. Регистрация / авторизация
2. Одна база с 3-5 локациями
3. 20-30 видов рыб
4. Магазин с базовыми снастями (поплавочная удочка, донка)
5. Сборка снасти, заброс, ожидание, поклёвка, вываживание
6. Садок, продажа рыбы, покупка снастей
7. Система опыта и разрядов
8. Смена времени суток

### Фаза 2 — Social (2-3 недели)
1. Онлайн-чат
2. Таблица рекордов
3. Базовые квесты (5-10)
4. Профиль и достижения

### Фаза 3 — Expansion (3-4 недели)
1. Спиннинговая ловля
2. Ещё 2-3 базы
3. Турниры (индивидуальные)
4. Команды
5. Газета
6. Прикормки и ароматизаторы

### Фаза 4 — Polish (2-3 недели)
1. Отвары и морские звёзды
2. Карта мира с переездами
3. Рыбинспекция
4. Командные турниры
5. Барахолка
6. Звуковое оформление
7. Мобильная адаптация

---

## 11. ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ

- **Тестирование**: pytest (backend), Jest/Vitest (frontend), Playwright (e2e)
- **CI/CD**: GitHub Actions → Docker → деплой
- **Мониторинг**: Sentry (ошибки), простые метрики (Django-prometheus или аналог)
- **Кэширование**: Redis (сессии, лидерборды, состояние рыбалки)
- **Безопасность**: все расчёты поклёвок и вываживания ТОЛЬКО на сервере (античит). Клиент отправляет только команды (заброс, подсечка, подмотка). Сервер валидирует и возвращает результат.
- **Rate limiting**: защита API от спама запросов
- **Масштабируемость**: stateless Django-воркеры за Nginx, Channels-воркеры отдельно, Celery-воркеры отдельно

---

## 12. ДОПОЛНИТЕЛЬНЫЕ УКАЗАНИЯ ДЛЯ ИИ-АССИСТЕНТА

При генерации кода:
1. Начинай с моделей Django и миграций
2. Затем — сериализаторы DRF и views
3. Затем — WebSocket consumers (channels)
4. Затем — Celery tasks
5. Затем — фронтенд (начни с FishingPage как core-экрана)
6. Используй TypeScript строго
7. Каждый файл — не более 300 строк, разбивай на модули
8. Пиши docstrings и комментарии на русском
9. Предусмотри Django admin для всех моделей (для наполнения контентом)
10. Используй фикстуры (JSON) для начального набора рыб, снастей, локаций
