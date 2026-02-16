# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Проект

Браузерный аналог «Русская Рыбалка 3» — 2D-симулятор рыбной ловли. Django backend + React frontend SPA.

## Стек

- **Backend**: Django 5 + DRF + SimpleJWT, PostgreSQL, Redis, Celery, django-channels (WebSocket)
- **Frontend**: React 18 + TypeScript + Zustand + Tailwind CSS (Vite)
- **Инфраструктура**: Docker Compose (postgres, redis, backend, celery, celery-beat, frontend)

## Команды

```bash
# Запуск всего стека
docker-compose up

# Backend отдельно (из /backend)
pip install -r requirements.txt
python manage.py migrate
python manage.py loaddata fixtures/fish_species.json fixtures/fish_species_expansion.json fixtures/tackle.json fixtures/groundbaits.json fixtures/world.json fixtures/world_expansion.json fixtures/quests.json fixtures/achievements.json fixtures/potions.json
python manage.py runserver

# Frontend отдельно (из /frontend)
npm install
npm run dev

# Celery
celery -A config worker -l info
celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

## Архитектура Backend

Монолит Django с 14 apps в `backend/apps/`:

- **accounts** — Player модель (профиль игрока: rank, experience, karma, money, hunger), JWT auth
- **tackle** — Все снасти и рыбы: FishSpecies, RodType, Reel, Line, Hook, FloatTackle, Lure, Bait, Groundbait, Flavoring, Food
- **world** — Base (рыболовная база/регион), Location, LocationFish (M2M с вероятностями)
- **inventory** — PlayerRod (собранная снасть), InventoryItem (Generic FK), CaughtFish (садок)
- **fishing** — FishingSession (состояния: idle→waiting→bite→fighting→caught), FightState, GameTime (singleton), GroundbaitSpot (прикормочное место с истечением по игровому времени). Сервисный слой в `services/`:
  - `bite_calculator.py` — расчёт шанса поклёвки с модификаторами (время суток, наживка, спиннинг, прикормка, зелья)
  - `fight_engine.py` — движок вываживания (tension/distance)
  - `fish_selector.py` — weighted random выбор рыбы (спиннинг: глубина по скорости проводки; прикормка: бонус целевых видов; зелья: rarity/trophy модификаторы)
  - `time_service.py` — игровое время и фазы суток
- **shop** — покупка/продажа через tackle + inventory
- **records** — FishRecord (рекорды по виду рыбы), Achievement, PlayerAchievement. Сервис: `check_record()`, `check_achievements()`
- **quests** — Quest (типы: catch_fish, catch_weight, catch_species), PlayerQuest (active→completed→claimed). Сервис: `update_quest_progress()`
- **chat** — ChatMessage + WebSocket consumer (django-channels). Каналы: location, base, global. JWT-авторизация через query string
- **tournaments** — Tournament (individual/team, scoring: weight/count/specific_fish), TournamentEntry. Сервис: `finalize_tournament()` с распределением призов. Celery-таск: `check_and_finalize_tournaments()`
- **teams** — Team, TeamMembership (role: leader/officer/member). Автоперенос лидерства при выходе лидера
- **potions** — MarineStar (6 цветов, дроп при ловле), Potion (6 типов: luck/invisibility/treasure/rarity/rank_boost/trophy), PlayerStar, PlayerPotion. Крафт из звёзд за карму. Celery: `expire_potions()`
- **inspection** — FishInspection (рыбнадзор). Celery-таск: random 10% проверка активных игроков. Нарушения: forbidden_species, size_limit, creel_limit
- **bazaar** — MarketListing (GenericFK). Торговля между игроками: create/buy/cancel лоты

Конфигурация Django: `backend/config/` (settings, urls, celery, asgi).

Игровые параметры: `settings.GAME_SETTINGS` (тик времени, голод, начальные деньги, лимит садка).

## Архитектура Frontend

SPA в `frontend/src/`:

- **store/** — Zustand: playerStore (auth + профиль), fishingStore (сессия рыбалки), inventoryStore
- **api/** — Axios client с JWT interceptor + модули: auth, fishing, shop, player, records, quests, tournaments, teams, potions, bazaar, world
- **pages/** — LoginPage, BasePage, LocationMapPage, FishingPage (core), ShopPage, InventoryPage, QuestsPage, RecordsPage, ProfilePage, TournamentsPage, TeamPage, NewspaperPage, PotionsPage, WorldMapPage, BazaarPage
- **components/** — fishing/ (FightBar, CaughtFishModal, ControlPanel), chat/ (ChatWindow), ui/ (TopBar)

## Core Gameplay Loop (API)

```
POST /api/fishing/cast/    → состояние WAITING
GET  /api/fishing/status/  → polling, сервер рассчитывает поклёвку → BITE
POST /api/fishing/strike/  → FIGHTING (создаётся FightState)
POST /api/fishing/reel-in/ → подмотка (tension↑, distance↓)
POST /api/fishing/pull/    → подтяжка (сильнее, но рискованнее)
POST /api/fishing/keep/    → рыба в садок + опыт
POST /api/fishing/release/ → +карма
```

## Фоновые задачи (Celery)

Автоматические периодические задачи настроены в `config/celery.py`:

- **advance_game_time** (30 сек) — продвигает игровое время на 1 час
- **hunger_tick** (5 мин) — уменьшает голод у активных игроков на 2 единицы
- **cleanup_expired_groundbait** (1 час) — удаляет истёкшие прикормочные пятна
- **expire_potions** (1 час) — удаляет истёкшие зелья у игроков
- **check_and_finalize_tournaments** (10 мин) — завершает турниры и распределяет призы
- **fish_inspection** (30 мин) — рыбнадзор проверяет 10% активных игроков

GameTime (singleton) инициализируется автоматически при старте через `python manage.py init_game_time`.

Подробнее: `backend/BACKGROUND_TASKS.md`

## Фикстуры

`backend/fixtures/` — JSON: 45 видов рыб, снасти, 3 базы + 8 локаций + 60 связей, 10 квестов, 12 достижений, 6 морских звёзд + 6 зелий.

## Конвенции

- Docstrings и комментарии на русском
- Файл не более 300 строк — разбивать на модули
- Все расчёты поклёвок/вываживания только на сервере (античит)
- Django admin для всех моделей
- TypeScript strict mode на фронтенде
