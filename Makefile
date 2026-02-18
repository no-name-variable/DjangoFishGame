# ═══════════════════════════════════════════════════════════
# Русская Рыбалка 3 — Makefile
# ═══════════════════════════════════════════════════════════

DC = docker compose
BACK = $(DC) exec backend
FRONT = $(DC) exec frontend

# ─────────────── Запуск / остановка ───────────────

.PHONY: up down restart build logs

up:                ## Запустить весь стек
	$(DC) up -d

down:              ## Остановить весь стек
	$(DC) down

restart:           ## Перезапустить всё
	$(DC) restart

build:             ## Пересобрать все контейнеры
	$(DC) build

logs:              ## Логи всех сервисов (follow)
	$(DC) logs -f

logs-back:         ## Логи бэкенда
	$(DC) logs -f backend

logs-front:        ## Логи фронтенда
	$(DC) logs -f frontend

# ─────────────── Инициализация проекта ───────────────

.PHONY: init migrate fixtures loaddata static superuser

init: up migrate loaddata static  ## Полная инициализация: up + migrate + fixtures + static
	@echo "Проект инициализирован."

migrate:           ## Применить миграции
	$(BACK) python manage.py migrate

makemigrations:    ## Создать миграции
	$(BACK) python manage.py makemigrations

fixtures:          ## Загрузить все фикстуры (синоним loaddata)
	$(MAKE) loaddata

loaddata:          ## Загрузить фикстуры + картинки
	$(BACK) python manage.py loaddata \
		fixtures/fish_species.json \
		fixtures/fish_species_expansion.json \
		fixtures/tackle.json \
		fixtures/groundbaits.json \
		fixtures/world.json \
		fixtures/world_expansion.json \
		fixtures/quests.json \
		fixtures/achievements.json \
		fixtures/potions.json \
		fixtures/bar.json
	$(BACK) python manage.py load_images

static:            ## Собрать статику Django (для админки)
	$(BACK) python manage.py collectstatic --noinput

superuser:         ## Создать суперпользователя
	$(BACK) python manage.py createsuperuser

# ─────────────── Разработка: бэкенд ───────────────

.PHONY: shell dbshell test test-fishing lint-back

shell:             ## Django shell
	$(BACK) python manage.py shell

dbshell:           ## Подключение к PostgreSQL
	$(DC) exec db psql -U postgres -d russian_fishing

test:              ## Запустить все тесты бэкенда
	$(BACK) python -m pytest -v

test-fishing:      ## Тесты модуля fishing
	$(BACK) python -m pytest apps/fishing/tests.py -v

lint-back:         ## Проверка кода бэкенда (ruff)
	$(BACK) python -m ruff check .

# ─────────────── Разработка: фронтенд ───────────────

.PHONY: tsc lint-front build-front

tsc:               ## Проверка типов TypeScript
	$(FRONT) npx tsc --noEmit

lint-front:        ## Lint фронтенда (eslint)
	$(FRONT) npx eslint src/

build-front:       ## Продакшен-сборка фронтенда
	$(FRONT) npm run build

# ─────────────── Пересборка контейнеров ───────────────

.PHONY: rebuild-back rebuild-front

rebuild-back:      ## Пересобрать бэкенд (после изменения requirements)
	$(DC) build backend celery celery-beat
	$(DC) up -d backend celery celery-beat

rebuild-front:     ## Пересобрать фронтенд (после добавления npm-пакетов)
	$(DC) build frontend
	$(DC) up -d frontend

# ─────────────── База данных ───────────────

.PHONY: resetdb

resetdb:           ## Сбросить БД и загрузить заново (ОСТОРОЖНО!)
	$(DC) down -v
	$(DC) up -d db redis
	@echo "Ожидание запуска PostgreSQL..."
	@sleep 3
	$(DC) up -d backend celery celery-beat frontend
	@sleep 5
	$(MAKE) loaddata static
	@echo "БД пересоздана, фикстуры загружены."

# ─────────────── Помощь ───────────────

.PHONY: help
help:              ## Показать эту справку
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
