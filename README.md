# PEP Monorepo

Monorepo for local and self-hosted development:

- `apps/web` - Next.js frontend
- `apps/api` - NestJS API with Prisma
- `postgres` - PostgreSQL in Docker
- `n8n` - n8n in Docker
- `infra/caddy` - reverse proxy for Docker-routed modes

## Overview

The project supports three explicit runtime modes:

1. `backend-devmode`
   `web` and `api` run locally with hot reload, `postgres` and `caddy` run in Docker, and the frontend reaches the local API through `http://api.localhost`.
2. `frontend-devmode`
   `web` runs locally, while `api`, `postgres`, `n8n`, `gotenberg`, and `caddy` run in Docker. The web app talks to Docker through `http://api.localhost`.
3. `production`
   The full stack runs in Docker, including `web`, `api`, `postgres`, `n8n`, `gotenberg`, and `caddy`.

## Requirements

Make sure these are installed:

- Node.js `20+`
- `pnpm` `10+`
- Docker Desktop or Docker Engine with `docker compose`

Check versions:

```bash
node -v
pnpm -v
docker --version
docker compose version
```

## Environment Files

The project uses different env files for different modes:

- [`.env`](/mnt/c/Users/maxim/Documents/pep/.env)
  Used by Docker Compose
- [apps/api/.env](/mnt/c/Users/maxim/Documents/pep/apps/api/.env)
  Used by the local NestJS API and Prisma CLI when running inside `apps/api`
- [apps/web/.env.local](/mnt/c/Users/maxim/Documents/pep/apps/web/.env.local)
  Used by the local Next.js app

Templates:

- [`.env.example`](/mnt/c/Users/maxim/Documents/pep/.env.example)
- [apps/api/.env.example](/mnt/c/Users/maxim/Documents/pep/apps/api/.env.example)
- [apps/web/.env.local.example](/mnt/c/Users/maxim/Documents/pep/apps/web/.env.local.example)

Mode-specific env knobs used by the runtime scripts:

- `APP_MODE`: `backend-devmode`, `frontend-devmode`, `production`
- `MOCK_MODE`: `true` or `false`; when set, it overrides the pipeline mode
- `APPLICATION_PIPELINE_MODE`: `mock` or `live`; kept as a legacy fallback when `MOCK_MODE` is not set
- `WEB_HIDE_API_ENDPOINTS`: hides the UI endpoint chips; defaults to `true` in `production`
- `WEB_ENABLE_STATUS_PAGE`: controls the web `/status` route and nav item; defaults to `false` in `production`
- `NEXT_PUBLIC_API_URL`: the single API base URL used by the web app in both browser and SSR

## Initial Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create the root env file for Docker:

```bash
cp .env.example .env
```

3. Create the local API env file:

```bash
cp apps/api/.env.example apps/api/.env
```

4. Create the local Web env file:

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

5. Adjust values if needed.

Important:

- `pnpm install` automatically runs `prisma generate`
- for local API development, `DATABASE_URL` should point to `localhost:5432`
- for Docker-based modes, `DATABASE_URL` in the root `.env` should point to `postgres:5432`

## Runtime Modes

Before the first run of any mode, apply Prisma migrations if the database is empty:

```bash
cd apps/api
pnpm prisma:migrate
cd ../..
```

### 1. backend-devmode

Recommended for day-to-day backend and UI work when the real pipeline is not needed.

```bash
pnpm dev:backend
```

This mode starts Docker `postgres` and `caddy` first and then runs local `web` plus local `api` with:

- `APP_MODE=backend-devmode`
- `MOCK_MODE=true`
- `NEXT_PUBLIC_API_URL=http://api.localhost`

URLs:

- app through Caddy: `http://localhost`
- direct Next.js dev server: `http://localhost:3000`
- landing through Caddy: `http://land.localhost`
- api through Caddy: `http://api.localhost`

Pipeline behavior:

- `POST /api/v1/applications` still creates a `processing` ticket
- the API returns the saved base CV as the generated CV, locks the role brief and base CV, and auto-completes the rest with mock pipeline data
- `n8n` is not required in this mode

Infra helpers:

```bash
pnpm dev:backend:infra:up
pnpm dev:backend:infra:logs
pnpm dev:backend:infra:down
```

### 2. frontend-devmode

Use this mode when the frontend stays local, but the backend-side stack should run in Docker.

```bash
pnpm dev:frontend
```

This mode starts Docker `api`, `postgres`, `n8n`, `gotenberg`, and `caddy`, then runs local `web` with:

- `APP_MODE=frontend-devmode`
- `MOCK_MODE=false` by default, with optional override from the root `.env`
- `NEXT_PUBLIC_API_URL=http://api.localhost`

URLs:

- app through Caddy: `http://localhost`
- direct Next.js dev server: `http://localhost:3000`
- landing through Caddy: `http://land.localhost`
- api through Caddy: `http://api.localhost`
- n8n through Caddy: `http://n8n.localhost`

Infra helpers:

```bash
pnpm dev:frontend:infra:up
pnpm dev:frontend:infra:logs
pnpm dev:frontend:infra:down
```

### 3. production

Run the whole stack in Docker:

```bash
pnpm prod:up
```

Stop or inspect it with:

```bash
pnpm prod:logs
pnpm prod:down
```

Backward-compatible aliases:

```bash
pnpm docker:up
pnpm docker:down
```

URLs:

- `http://localhost`
- `http://land.localhost`
- `http://api.localhost`
- `http://n8n.localhost`

Production UI defaults:

- the web app hides API endpoint chips
- the web `/status` page and `Status` nav item are disabled unless `WEB_ENABLE_STATUS_PAGE=true`

## Local Hosts for frontend-devmode and production

If your system does not resolve `*.localhost` automatically, add these entries to your hosts file:

```text
127.0.0.1 land.localhost
127.0.0.1 api.localhost
127.0.0.1 n8n.localhost
```

Google OAuth for local development:

- Authorized JavaScript origin: `http://localhost`
- Authorized redirect URI: `http://localhost/api/auth/callback/google`

## Project Commands

Root commands:

```bash
pnpm install
pnpm dev
pnpm dev:backend
pnpm dev:backend:infra:up
pnpm dev:backend:infra:down
pnpm dev:backend:infra:logs
pnpm dev:frontend
pnpm dev:frontend:infra:up
pnpm dev:frontend:infra:down
pnpm dev:frontend:infra:logs
pnpm prod:up
pnpm prod:logs
pnpm prod:down
pnpm docker:up
pnpm docker:down
pnpm build
pnpm lint
pnpm test
```

Notes:

- `pnpm dev` is the low-level raw `turbo run dev --parallel` helper
- `backend-devmode` is the fastest mode when the real workflow does not matter
- `frontend-devmode` is the closest local setup to the Docker backend routing used in production

API commands:

```bash
cd apps/api
pnpm dev
pnpm build
pnpm prisma:generate
pnpm prisma:migrate
```

Web commands:

```bash
cd apps/web
pnpm dev
pnpm build
```

## Prisma and Database

Prisma schema:

- [schema.prisma](/mnt/c/Users/maxim/Documents/pep/apps/api/prisma/schema.prisma)

Prisma migrations:

- [prisma/migrations](/mnt/c/Users/maxim/Documents/pep/apps/api/prisma/migrations)

Useful commands:

```bash
cd apps/api
pnpm prisma:generate
pnpm prisma:migrate
```

If Prisma complains about `DATABASE_URL`, the most common reasons are:

- `apps/api/.env` does not exist
- Prisma is being run outside `apps/api`
- the database host in `apps/api/.env` is incorrect

For local development it should look like:

```env
DATABASE_URL=postgresql://pep:change-me-postgres@localhost:5432/pep?schema=public
```

## Useful URLs

API healthcheck:

- `GET /health`
- example: `http://localhost:3001/health`

API status endpoint:

- `GET /api/v1/status`
- example: `http://localhost:3001/api/v1/status`

Web status page:

- `GET /status`
- hidden by default in `production`; re-enable with `WEB_ENABLE_STATUS_PAGE=true`

Application trigger endpoint:

- `POST /api/v1/applications`
- example: `http://localhost:3001/api/v1/applications`

## n8n

The project includes n8n bootstrap logic, a seed workflow, and env-driven credential import.

Files:

- [infra/n8n/Dockerfile](/mnt/c/Users/maxim/Documents/pep/infra/n8n/Dockerfile)
- [bootstrap.sh](/mnt/c/Users/maxim/Documents/pep/infra/n8n/scripts/bootstrap.sh)
- [workflow.seed.json](/mnt/c/Users/maxim/Documents/pep/infra/n8n/workflows/workflow.seed.json)

Imported automatically on `n8n` startup:

- Gemini credential from `GOOGLE_GEMINI_API_KEY`
- Google Docs credential from a Google service account in the root [`.env`](/mnt/c/Users/maxim/Documents/pep/.env)

Required env values for Google Docs automation:

```env
N8N_GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
N8N_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

Optional:

```env
N8N_GOOGLE_SERVICE_ACCOUNT_IMPERSONATE=false
N8N_GOOGLE_SERVICE_ACCOUNT_DELEGATED_EMAIL=
```

Notes:

- keep `N8N_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` on one line and escape line breaks as `\n`
- share the source Google Docs with the service account email, or enable domain-wide delegation and set `N8N_GOOGLE_SERVICE_ACCOUNT_DELEGATED_EMAIL`
- `GOOGLE_DOCS_CLIENT_ID` and `GOOGLE_DOCS_CLIENT_SECRET` are no longer needed for automated bootstrap

n8n variables come from the root [`.env`](/mnt/c/Users/maxim/Documents/pep/.env).

Backend-to-n8n trigger:

- set `N8N_WORKFLOW_WEBHOOK_URL` for the API
- local dev default in [apps/api/.env.example](/mnt/c/Users/maxim/Documents/pep/apps/api/.env.example): `http://localhost:5678/webhook/generate-cv`
- Docker default in [docker-compose.yaml](/mnt/c/Users/maxim/Documents/pep/docker-compose.yaml): `http://n8n:5678/webhook/generate-cv`
- the seed workflow expects a JSON `POST` body with `ticketId`, `fullName`, `vacancyDescription`, `baseCv`, and `workTasks`
- activate the workflow once in n8n so the production webhook keeps listening

Application profile text is stored in PostgreSQL via `AppMetadata`:

- `key = 'baseCv'`
- `key = 'workTasks'`

Example seed:

```sql
INSERT INTO "AppMetadata" ("key", "value", "updatedAt")
VALUES
  ('baseCv', 'Base CV markdown/text here', NOW()),
  ('workTasks', 'Work tasks text here', NOW())
ON CONFLICT ("key") DO UPDATE SET
  "value" = EXCLUDED."value",
  "updatedAt" = NOW();
```

## Typical Workflow

For most cases, this is enough:

```bash
pnpm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
cd apps/api && pnpm prisma:migrate && cd ../..
pnpm dev:backend
```

## Common Issues

### `@prisma/client` is not visible in the IDE

Try:

```bash
pnpm install
cd apps/api
pnpm prisma:generate
```

Then in VS Code:

- `TypeScript: Restart TS Server`
- or `Developer: Reload Window`

### Prisma cannot find `DATABASE_URL`

Check:

- whether `apps/api/.env` exists
- whether you are running Prisma inside `apps/api`
- whether PostgreSQL is available on `localhost:5432`

### Docker infra is up, but API cannot connect to the database

Check `apps/api/.env`:

```env
DATABASE_URL=postgresql://pep:change-me-postgres@localhost:5432/pep?schema=public
```

### Docker-routed mode does not open on `*.localhost`

Check:

- whether hosts entries were added
- whether port `80` is already in use
- whether `caddy` started successfully

## Notes

- `backend-devmode` is best for daily development when you do not need `n8n`
- `frontend-devmode` and `production` are useful for integration checks
- `pnpm install` already includes Prisma Client generation through `postinstall`

---

# PEP Monorepo

Монорепозиторий для локальной и self-hosted разработки:

- `apps/web` - Next.js фронтенд
- `apps/api` - NestJS API с Prisma
- `postgres` - PostgreSQL в Docker
- `n8n` - n8n в Docker
- `infra/caddy` - reverse proxy для Docker-маршрутизации

## Что внутри

Проект поддерживает три явных режима запуска:

1. `backend-devmode`
   `web` и `api` работают локально с hot reload, `postgres` и `caddy` поднимаются в Docker, а фронтенд ходит к локальному API через `http://api.localhost`.
2. `frontend-devmode`
   `web` работает локально, а `api`, `postgres`, `n8n`, `gotenberg` и `caddy` работают в Docker. Всё web-приложение ходит в Docker через `http://api.localhost`.
3. `production`
   весь стек запускается в Docker, включая `web`, `api`, `postgres`, `n8n`, `gotenberg` и `caddy`.

## Требования

Перед началом убедись, что установлены:

- Node.js `20+`
- `pnpm` `10+`
- Docker Desktop или Docker Engine с `docker compose`

Проверить можно так:

```bash
node -v
pnpm -v
docker --version
docker compose version
```

## Структура env-файлов

В проекте используются разные env-файлы для разных режимов:

- корневой [`.env`](/mnt/c/Users/maxim/Documents/pep/.env)
  Используется Docker Compose стеком
- [apps/api/.env](/mnt/c/Users/maxim/Documents/pep/apps/api/.env)
  Используется локальным NestJS API и Prisma CLI при запуске из `apps/api`
- [apps/web/.env.local](/mnt/c/Users/maxim/Documents/pep/apps/web/.env.local)
  Используется локальным Next.js приложением

Шаблоны уже есть:

- [`.env.example`](/mnt/c/Users/maxim/Documents/pep/.env.example)
- [apps/api/.env.example](/mnt/c/Users/maxim/Documents/pep/apps/api/.env.example)
- [apps/web/.env.local.example](/mnt/c/Users/maxim/Documents/pep/apps/web/.env.local.example)

Mode-specific переменные, которые используют runtime-скрипты:

- `APP_MODE`: `backend-devmode`, `frontend-devmode`, `production`
- `MOCK_MODE`: `true` или `false`; если задан, имеет приоритет над режимом pipeline
- `APPLICATION_PIPELINE_MODE`: `mock` или `live`; оставлен как legacy fallback, если `MOCK_MODE` не задан
- `WEB_HIDE_API_ENDPOINTS`: скрывает UI-плашки с endpoint; по умолчанию `true` в `production`
- `WEB_ENABLE_STATUS_PAGE`: управляет web-маршрутом `/status` и пунктом меню; по умолчанию `false` в `production`
- `NEXT_PUBLIC_API_URL`: единый базовый URL API для web-приложения и в браузере, и в SSR

## Первая установка

1. Установить зависимости:

```bash
pnpm install
```

2. Создать корневой env для Docker:

```bash
cp .env.example .env
```

3. Создать env для локального API:

```bash
cp apps/api/.env.example apps/api/.env
```

4. Создать env для локального Web:

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

5. При необходимости скорректировать значения в этих файлах.

Важно:

- `pnpm install` автоматически запускает `prisma generate`
- для локального API `DATABASE_URL` должен смотреть на `localhost:5432`
- для Docker-режимов `DATABASE_URL` в корневом `.env` должен смотреть на `postgres:5432`

## Режимы запуска

Перед первым запуском любого режима примени Prisma-миграции, если база пустая:

```bash
cd apps/api
pnpm prisma:migrate
cd ../..
```

### 1. backend-devmode

Это основной режим для ежедневной разработки, когда реальный pipeline не нужен.

```bash
pnpm dev:backend
```

Команда сначала поднимает Docker `postgres` и `caddy`, а потом запускает локальные `web` и `api` с:

- `APP_MODE=backend-devmode`
- `MOCK_MODE=true`
- `NEXT_PUBLIC_API_URL=http://api.localhost`

Адреса:

- app через Caddy: `http://localhost`
- прямой Next.js dev server: `http://localhost:3000`
- лендинг через Caddy: `http://land.localhost`
- api через Caddy: `http://api.localhost`

Поведение pipeline:

- `POST /api/v1/applications` всё так же создаёт `processing` ticket
- API возвращает сохранённый base CV как итоговый CV, блокирует изменение vacancy/base CV и автоматически завершает остальное mock-ответом pipeline
- `n8n` в этом режиме не нужен

Команды для infra:

```bash
pnpm dev:backend:infra:up
pnpm dev:backend:infra:logs
pnpm dev:backend:infra:down
```

### 2. frontend-devmode

Используй этот режим, когда фронтенд нужен локально, а весь backend-side стек должен работать в Docker.

```bash
pnpm dev:frontend
```

Команда поднимает Docker `api`, `postgres`, `n8n`, `gotenberg` и `caddy`, а затем запускает локальный `web` с:

- `APP_MODE=frontend-devmode`
- `MOCK_MODE=false` по умолчанию, с возможностью переопределить через корневой `.env`
- `NEXT_PUBLIC_API_URL=http://api.localhost`

Адреса:

- app через Caddy: `http://localhost`
- прямой Next.js dev server: `http://localhost:3000`
- лендинг через Caddy: `http://land.localhost`
- api через Caddy: `http://api.localhost`
- n8n через Caddy: `http://n8n.localhost`

Команды для infra:

```bash
pnpm dev:frontend:infra:up
pnpm dev:frontend:infra:logs
pnpm dev:frontend:infra:down
```

### 3. production

Если нужен production-like сценарий со всем стеком в контейнерах:

```bash
pnpm prod:up
```

Логи и остановка:

```bash
pnpm prod:logs
pnpm prod:down
```

Старые алиасы сохранены:

```bash
pnpm docker:up
pnpm docker:down
```

Адреса:

- `http://localhost`
- `http://land.localhost`
- `http://api.localhost`
- `http://n8n.localhost`

UI-поведение production по умолчанию:

- web-приложение скрывает плашки с API endpoint
- web-страница `/status` и пункт меню `Status` отключены, пока не задан `WEB_ENABLE_STATUS_PAGE=true`

## Локальные хосты для frontend-devmode и production

Если твоя система не резолвит `*.localhost` автоматически, добавь в `hosts`:

```text
127.0.0.1 land.localhost
127.0.0.1 api.localhost
127.0.0.1 n8n.localhost
```

Google OAuth для локальной разработки:

- Authorized JavaScript origin: `http://localhost`
- Authorized redirect URI: `http://localhost/api/auth/callback/google`

## Команды проекта

Корневые команды:

```bash
pnpm install
pnpm dev
pnpm dev:backend
pnpm dev:backend:infra:up
pnpm dev:backend:infra:down
pnpm dev:backend:infra:logs
pnpm dev:frontend
pnpm dev:frontend:infra:up
pnpm dev:frontend:infra:down
pnpm dev:frontend:infra:logs
pnpm prod:up
pnpm prod:logs
pnpm prod:down
pnpm docker:up
pnpm docker:down
pnpm build
pnpm lint
pnpm test
```

Примечания:

- `pnpm dev` оставлен как низкоуровневый `turbo run dev --parallel`
- `backend-devmode` самый быстрый режим, если реальный workflow сейчас не важен
- `frontend-devmode` ближе всего к production-маршрутизации Docker backend-а

Команды API:

```bash
cd apps/api
pnpm dev
pnpm build
pnpm prisma:generate
pnpm prisma:migrate
```

Команды Web:

```bash
cd apps/web
pnpm dev
pnpm build
```

## Prisma и база данных

Схема Prisma находится в:

- [schema.prisma](/mnt/c/Users/maxim/Documents/pep/apps/api/prisma/schema.prisma)

Миграции лежат в:

- [prisma/migrations](/mnt/c/Users/maxim/Documents/pep/apps/api/prisma/migrations)

Полезные команды:

```bash
cd apps/api
pnpm prisma:generate
pnpm prisma:migrate
```

Если Prisma ругается на `DATABASE_URL`, почти всегда причина в том, что:

- не создан `apps/api/.env`
- Prisma-команда запускается не из `apps/api`
- в `apps/api/.env` указан неверный хост базы

Для локального dev-режима значение должно быть примерно таким:

```env
DATABASE_URL=postgresql://pep:change-me-postgres@localhost:5432/pep?schema=public
```

## Полезные URL

API healthcheck:

- `GET /health`
- пример: `http://localhost:3001/health`

API status endpoint:

- `GET /api/v1/status`
- пример: `http://localhost:3001/api/v1/status`

Web status page:

- `GET /status`
- в `production` скрыта по умолчанию; включается через `WEB_ENABLE_STATUS_PAGE=true`

## n8n

В проекте есть bootstrap для n8n, seed workflow и автоматический импорт credentials из `.env`.

Файлы:

- [infra/n8n/Dockerfile](/mnt/c/Users/maxim/Documents/pep/infra/n8n/Dockerfile)
- [bootstrap.sh](/mnt/c/Users/maxim/Documents/pep/infra/n8n/scripts/bootstrap.sh)
- [workflow.seed.json](/mnt/c/Users/maxim/Documents/pep/infra/n8n/workflows/workflow.seed.json)

При старте `n8n` автоматически импортируются:

- credential для Gemini из `GOOGLE_GEMINI_API_KEY`
- credential для Google Docs из service account, описанного в корневом [`.env`](/mnt/c/Users/maxim/Documents/pep/.env)

Обязательные переменные для Google Docs:

```env
N8N_GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
N8N_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

Опционально:

```env
N8N_GOOGLE_SERVICE_ACCOUNT_IMPERSONATE=false
N8N_GOOGLE_SERVICE_ACCOUNT_DELEGATED_EMAIL=
```

Важно:

- `N8N_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` нужно хранить в одной строке, экранируя переводы строк как `\n`
- исходные Google Docs должны быть расшарены на email service account, либо нужно включить domain-wide delegation и указать `N8N_GOOGLE_SERVICE_ACCOUNT_DELEGATED_EMAIL`
- `GOOGLE_DOCS_CLIENT_ID` и `GOOGLE_DOCS_CLIENT_SECRET` больше не нужны для автоматического bootstrap

Переменные для n8n берутся из корневого [`.env`](/mnt/c/Users/maxim/Documents/pep/.env).

## Типичный рабочий сценарий

Обычно достаточно такого набора команд:

```bash
pnpm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
cd apps/api && pnpm prisma:migrate && cd ../..
pnpm dev:backend
```

## Частые проблемы

### `@prisma/client` не виден в IDE

Попробуй:

```bash
pnpm install
cd apps/api
pnpm prisma:generate
```

Потом в VS Code:

- `TypeScript: Restart TS Server`
- или `Developer: Reload Window`

### Prisma не видит `DATABASE_URL`

Проверь:

- существует ли `apps/api/.env`
- запускаешь ли Prisma-команду из `apps/api`
- доступна ли база на `localhost:5432`

### Docker infra поднята, но API не подключается к базе

Проверь `apps/api/.env`:

```env
DATABASE_URL=postgresql://pep:change-me-postgres@localhost:5432/pep?schema=public
```

### Docker-маршрутизация не открывается по `*.localhost`

Проверь:

- добавлены ли записи в `hosts`
- не занят ли `80` порт
- успешно ли стартовал `caddy`

## Примечания

- `backend-devmode` лучше всего подходит для ежедневной разработки без `n8n`
- `frontend-devmode` и `production` удобны для интеграционной проверки всего стека
- `pnpm install` уже включает генерацию Prisma Client через `postinstall`
