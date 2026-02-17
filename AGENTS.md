# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: Django 5 + DRF API. Core folders: `apps/` domain modules (fishing, quests, tournaments, bazaar, etc.), `config/` settings/Celery/Channels, `fixtures/` seed data, `media/` uploads, `staticfiles/` collected static.
- `frontend/`: React 18 + TypeScript (Vite). Main folders: `src/api`, `src/pages`, `src/components`, `src/store`; static assets in `public/`. Build configs: `vite.config.ts`, `tailwind.config.js`.
- Root: `docker-compose.yml` for the stack, `Makefile` for common tasks, plus env files (not committed).

## Build, Test, and Development Commands
- Docker flow: `make up` (start), `make down` (stop), `make logs` (follow), `make migrate` + `make loaddata` (migrations + fixtures), `make static` (collect Django static), `make rebuild-front/back` after dependency changes.
- Backend local: `cd backend && pip install -r requirements.txt && python manage.py migrate && python manage.py runserver`. Frontend local: `cd frontend && npm install && npm run dev`; `npm run build` for production.
- Lint/type checks: `make lint-back` (ruff), `make tsc` (TypeScript), `make lint-front` (eslint). Backend tests: `make test` or `docker-compose exec backend pytest`.

## Coding Style & Naming Conventions
- Python: PEP8 with 4-space indent; prefer type hints and DRF serializers/views. Use `snake_case` for functions/fields, `CamelCase` for classes, `UPPER_SNAKE_CASE` for constants. Keep domain logic under `backend/apps/<domain>/`.
- TypeScript/React: 2-space indent, functional components, `PascalCase` component files, `camelCase` hooks/store keys, colocate styles/assets with components. Favor explicit types over `any`; keep API calls in `src/api`.

## Testing Guidelines
- Backend uses pytest + pytest-django. Tests live beside apps (`backend/apps/*/tests.py` and `tests_services.py`). Reuse fixtures from `backend/conftest.py` instead of manual setup.
- Typical runs: `pytest` for full suite, `pytest apps/fishing/tests_services.py` for a module, `pytest --cov=apps --cov-report=html` for coverage, `pytest -n auto` for parallel runs.
- Frontend tests are not yet present; add Vitest/RTL under `frontend/src/__tests__` when introducing UI logic and wire into `npm test`.

## Commit & Pull Request Guidelines
- Keep commits focused; use short imperative messages with prefixes seen in history (`feat:`, `fix:`, `chore:`). Note migrations or fixture updates in the body.
- PRs should explain scope and risks, list verification commands, and link issues. Include screenshots/GIFs for UI changes. Ensure lint and tests above are clean before requesting review.

## Security & Configuration Tips
- Keep secrets in local `.env` files; never commit them. Required vars include backend `DJANGO_SECRET_KEY`, DB/Redis URLs; frontend `VITE_API_URL` and `VITE_WS_URL`.
- When touching background tasks, coordinate with Celery settings under `backend/config` and confirm schedules in compose files before deployment.
