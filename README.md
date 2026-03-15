# PEP Monorepo

Monorepo for local and self-hosted development:

- `apps/web` - Next.js frontend
- `apps/api` - NestJS API with Prisma
- `postgres` - PostgreSQL in Docker
- `n8n` - n8n in Docker
- `infra/caddy` - reverse proxy for full Docker mode

## Overview

The project supports two main run modes:

1. `Dev mode`
   `web` and `api` run locally with hot reload, while `postgres` and `n8n` run in Docker.
2. `Full Docker mode`
   The whole stack runs through `docker compose`, including `web`, `api`, `postgres`, `n8n`, and `caddy`.

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
- for full Docker mode, `DATABASE_URL` in the root `.env` should point to `postgres:5432`

## Dev Mode

This is the recommended mode for day-to-day development.

### 1. Start infrastructure only

```bash
pnpm dev:infra:up
```

This starts:

- PostgreSQL on `localhost:5432`
- n8n on `http://localhost:5678`

### 2. Apply Prisma migrations

If this is your first run or the database is empty:

```bash
cd apps/api
pnpm prisma:migrate
cd ../..
```

### 3. Run web and api locally

```bash
pnpm dev
```

After that:

- web: `http://localhost:3000`
- api: `http://localhost:3001`
- n8n: `http://localhost:5678`

### 4. Stop infrastructure

```bash
pnpm dev:infra:down
```

### 5. View infra logs

```bash
pnpm dev:infra:logs
```

## Full Docker Mode

If you need a production-like run with the entire stack in containers:

```bash
docker compose up --build
```

or:

```bash
pnpm docker:up
```

Stop it with:

```bash
pnpm docker:down
```

Services started in this mode:

- `web`
- `api`
- `postgres`
- `n8n`
- `caddy`
- `gotenberg`

By default, Caddy exposes the stack on `http://localhost`.

## Local Hosts for Full Docker Mode

If your system does not resolve `*.localhost` automatically, add these entries to your hosts file:

```text
127.0.0.1 app.localhost
127.0.0.1 api.localhost
127.0.0.1 n8n.localhost
```

Typical URLs:

- `http://app.localhost`
- `http://api.localhost`
- `http://n8n.localhost`

## Project Commands

Root commands:

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm dev:infra:up
pnpm dev:infra:down
pnpm dev:infra:logs
pnpm docker:up
pnpm docker:down
```

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

## n8n

The project includes n8n bootstrap logic and a seed workflow.

Files:

- [infra/n8n/Dockerfile](/mnt/c/Users/maxim/Documents/pep/infra/n8n/Dockerfile)
- [bootstrap.sh](/mnt/c/Users/maxim/Documents/pep/infra/n8n/scripts/bootstrap.sh)
- [workflow.seed.json](/mnt/c/Users/maxim/Documents/pep/infra/n8n/workflows/workflow.seed.json)

After the first launch:

1. Open n8n
2. Create credentials manually
3. Rebind them to the imported workflow

n8n variables come from the root [`.env`](/mnt/c/Users/maxim/Documents/pep/.env).

## Typical Workflow

For most cases, this is enough:

```bash
pnpm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
pnpm dev:infra:up
cd apps/api && pnpm prisma:migrate && cd ../..
pnpm dev
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

### Full Docker mode does not open on `app.localhost`

Check:

- whether hosts entries were added
- whether port `80` is already in use
- whether `caddy` started successfully

## Notes

- `dev` mode is best for daily development
- `full Docker` mode is useful for integration checks
- `pnpm install` already includes Prisma Client generation through `postinstall`

---

# PEP Monorepo

Монорепозиторий для локальной и self-hosted разработки:

- `apps/web` - Next.js фронтенд
- `apps/api` - NestJS API с Prisma
- `postgres` - PostgreSQL в Docker
- `n8n` - n8n в Docker
- `infra/caddy` - reverse proxy для full Docker режима

## Что внутри

Проект поддерживает два основных сценария запуска:

1. `Dev mode`
   `web` и `api` работают локально с hot reload, а `postgres` и `n8n` поднимаются в Docker.
2. `Full Docker mode`
   весь стек запускается через `docker compose`, включая `web`, `api`, `postgres`, `n8n` и `caddy`.

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
- для full Docker режима `DATABASE_URL` в корневом `.env` должен смотреть на `postgres:5432`

## Быстрый старт в Dev Mode

Это основной режим для ежедневной разработки.

### 1. Поднять только инфраструктуру

```bash
pnpm dev:infra:up
```

Эта команда поднимает:

- PostgreSQL на `localhost:5432`
- n8n на `http://localhost:5678`

### 2. Применить Prisma миграции

Если запускаешь проект впервые или база пустая:

```bash
cd apps/api
pnpm prisma:migrate
cd ../..
```

### 3. Запустить локально web и api

```bash
pnpm dev
```

После этого:

- web: `http://localhost:3000`
- api: `http://localhost:3001`
- n8n: `http://localhost:5678`

### 4. Остановить инфраструктуру

```bash
pnpm dev:infra:down
```

### 5. Посмотреть логи infra

```bash
pnpm dev:infra:logs
```

## Full Docker Mode

Если нужен production-like сценарий со всем стеком в контейнерах:

```bash
docker compose up --build
```

или через script:

```bash
pnpm docker:up
```

Остановка:

```bash
pnpm docker:down
```

В этом режиме поднимаются:

- `web`
- `api`
- `postgres`
- `n8n`
- `caddy`
- `gotenberg`

По умолчанию Caddy публикует стек на `http://localhost`.

## Локальные хосты для full Docker режима

Если твоя система не резолвит `*.localhost` автоматически, добавь в `hosts`:

```text
127.0.0.1 app.localhost
127.0.0.1 api.localhost
127.0.0.1 n8n.localhost
```

Обычно используются такие адреса:

- `http://app.localhost`
- `http://api.localhost`
- `http://n8n.localhost`

## Команды проекта

Корневые команды:

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm dev:infra:up
pnpm dev:infra:down
pnpm dev:infra:logs
pnpm docker:up
pnpm docker:down
```

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

## n8n

В проекте есть bootstrap для n8n и seed workflow.

Файлы:

- [infra/n8n/Dockerfile](/mnt/c/Users/maxim/Documents/pep/infra/n8n/Dockerfile)
- [bootstrap.sh](/mnt/c/Users/maxim/Documents/pep/infra/n8n/scripts/bootstrap.sh)
- [workflow.seed.json](/mnt/c/Users/maxim/Documents/pep/infra/n8n/workflows/workflow.seed.json)

После первого запуска:

1. Открой n8n
2. Создай credentials вручную
3. Привяжи их к импортированному workflow

Переменные для n8n берутся из корневого [`.env`](/mnt/c/Users/maxim/Documents/pep/.env).

## Типичный рабочий сценарий

Обычно достаточно такого набора команд:

```bash
pnpm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
pnpm dev:infra:up
cd apps/api && pnpm prisma:migrate && cd ../..
pnpm dev
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

### Full Docker режим не открывается по `app.localhost`

Проверь:

- добавлены ли записи в `hosts`
- не занят ли `80` порт
- успешно ли стартовал `caddy`

## Примечания

- `dev` режим лучше всего подходит для ежедневной разработки
- `full Docker` режим удобен для интеграционной проверки всего стека
- `pnpm install` уже включает генерацию Prisma Client через `postinstall`
