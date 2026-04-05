# PEP

Local-first application workspace for CV generation, company/vacancy summaries,
board tracking, and PDF export.

## Stack

- `apps/web`: Next.js frontend
- `apps/api`: NestJS API + Prisma
- `postgres`: PostgreSQL
- `n8n`: workflow engine
- `gotenberg`: PDF rendering
- `caddy`: local reverse proxy

## Requirements

- Node.js 20+
- pnpm 10+
- Docker with `docker compose`

## Environment

The only user-edited environment file is [`/.env`](/mnt/c/Users/maxim/Documents/pep/.env).

It must contain exactly two variables:

```env
GOOGLE_GEMINI_API_KEY=
TAVILY_API_KEY=
```

Use [`.env.example`](/mnt/c/Users/maxim/Documents/pep/.env.example) as the template.

All ports, internal URLs, callback secrets, database settings, and n8n bootstrap
settings are fixed in the repo.

## Install

```bash
pnpm install
```

`pnpm install` runs Prisma client generation automatically.

## Run

Start the full local stack:

```bash
pnpm start
```

Stop it:

```bash
pnpm stop
```

Tail logs:

```bash
pnpm logs
```

## URLs

- App: `http://localhost`
- API: `http://api.localhost`
- n8n: `http://n8n.localhost`

Modern systems usually resolve `*.localhost` automatically. If yours does not,
add these entries to your hosts file:

```text
127.0.0.1 api.localhost
127.0.0.1 n8n.localhost
```

## Notes

- There is no user auth, billing, quota, or subscription flow.
- The app always runs as one local workspace user.
- The tracked n8n seed workflow comes from
  [`PEP Workflow Seed (5).json`](</mnt/c/Users/maxim/Documents/pep/PEP%20Workflow%20Seed%20(5).json>).
- n8n imports Gemini and Tavily credentials from the two root env variables on startup.
