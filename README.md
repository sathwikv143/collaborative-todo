# Collaborative ToDo

Simple shared todo lists with invite links, guest collaboration, and live sync via Server-Sent Events.

## Prerequisites

| Tool | Version | Needed for |
|------|---------|------------|
| [Node.js](https://nodejs.org/) | 22+ | Local development and production |
| [Docker](https://www.docker.com/) + Docker Compose | Latest | Docker deployment (and optional local Postgres) |
| PostgreSQL | 16+ | Local deployment without Docker |

---

## Option A — Deploy with Docker Compose

Runs the full stack: PostgreSQL + Next.js app in containers. Best for production-like deployments or when you don't want to install Postgres locally.

### Step 1: Clone and configure

```bash
cd collaborative-todo
cp .env.example .env
```

Edit `.env` and set a strong secret:

```env
JWT_SECRET=your-long-random-secret-here
APP_URL=http://localhost:3000
```

Other variables have sensible defaults (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `APP_PORT`, etc.).

### Step 2: Build and start

```bash
docker compose up -d --build
```

Or use the npm shortcut:

```bash
npm run docker:up
```

This will:

1. Start PostgreSQL and wait until it is healthy
2. Build the Next.js production image
3. Run database migrations automatically
4. Start the app on [http://localhost:3000](http://localhost:3000)

### Step 3: Verify

```bash
curl http://localhost:3000/api/health
# {"ok":true,"db":true}
```

Open [http://localhost:3000](http://localhost:3000), register an account, and create a list.

### Useful Docker commands

```bash
npm run docker:logs    # follow app logs
docker compose ps      # service status
npm run docker:down    # stop and remove containers
```

To reset the database volume:

```bash
docker compose down -v
```

---

## Option B — Run locally (development)

Runs the Next.js dev server on your machine. Postgres can be Docker-backed or installed natively.

### Step 1: Install dependencies

```bash
cd collaborative-todo
npm install
```

### Step 2: Configure environment

```bash
cp .env.example .env.local
```

**Using Docker for Postgres only** (recommended — no local Postgres install needed):

```env
DATABASE_URL=postgresql://todo:todo@localhost:5433/todo
JWT_SECRET=dev-secret-change-in-production
APP_URL=http://localhost:3000
NODE_ENV=development
```

**Using native Postgres** (port 5432):

```env
DATABASE_URL=postgresql://todo:todo@localhost:5432/todo
```

See [Native Postgres setup](#native-postgres-setup) below if you need to create the database.

### Step 3: Start Postgres and apply schema

**Docker Postgres:**

```bash
npm run setup
```

This starts the `postgres` container, waits for it, and runs migrations.

**Native Postgres** (after creating the `todo` database):

```bash
npm run db:migrate:run
```

### Step 4: Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Option C — Run locally (production mode)

Use this to test the production build without Docker.

### Step 1–3

Follow [Option B](#option-b--run-locally-development) steps 1–3 (install, configure `.env.local`, run migrations).

### Step 4: Build and start

```bash
npm run build
npm run start
```

The app serves on [http://localhost:3000](http://localhost:3000).

---

## Native Postgres setup

Only needed if you are **not** using Docker for Postgres.

### macOS (Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16

psql postgres -c "CREATE USER todo WITH PASSWORD 'todo' CREATEDB;"
psql postgres -c "CREATE DATABASE todo OWNER todo;"
```

Set in `.env.local`:

```env
DATABASE_URL=postgresql://todo:todo@localhost:5432/todo
```

Verify:

```bash
psql postgresql://todo:todo@localhost:5432/todo -c "SELECT 1;"
npm run db:migrate:run
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes (production) | Secret for signing session tokens. Use a long random string in production. |
| `APP_URL` | Yes (production) | Public URL of the app (used for invite links). Docker default: `http://localhost:3000` |
| `NODE_ENV` | No | `development` locally, `production` in Docker |
| `POSTGRES_USER` | No | Docker only. Default: `todo` |
| `POSTGRES_PASSWORD` | No | Docker only. Default: `todo` |
| `POSTGRES_DB` | No | Docker only. Default: `todo` |
| `POSTGRES_PORT` | No | Host port for Postgres. Default: `5433` |
| `APP_PORT` | No | Host port for the app. Default: `3000` |

### Connection strings

| Setup | Port | `DATABASE_URL` |
|-------|------|----------------|
| Docker Compose (app container) | internal | `postgresql://todo:todo@postgres:5432/todo` (set automatically) |
| Docker Postgres only (local dev) | 5433 | `postgresql://todo:todo@localhost:5433/todo` |
| Native Postgres | 5432 | `postgresql://todo:todo@localhost:5432/todo` |

---

## Database commands

| Command | Description |
|---------|-------------|
| `npm run deps` | Start Postgres container only |
| `npm run setup` | Start Postgres + wait + migrate (local dev) |
| `npm run db:migrate:run` | Apply SQL migrations |
| `npm run db:generate` | Generate a new migration after schema changes |
| `npm run db:push` | Push schema directly (dev only, skips migration files) |

---

## Features

- **Passkey sign-in** — 26-character account ID + WebAuthn passkey (primary)
- **Backup codes** — 10 one-time recovery codes; warning when fewer than 3 remain
- Invite links — guests join with a display name only
- Shared lists with sections
- Tasks: checkbox, assignee, due date, priority, status, external links, comments
- Filters: All open, Assigned to me, Due today, Completed
- Real-time updates via SSE (single-instance)

## Authentication

| Flow | URL | Notes |
|------|-----|-------|
| Sign in (passkey) | `/login` | Enter account ID → browser passkey prompt |
| Forgot account ID | `/forgot-account-id` | Backup code only → reveals account ID (code not consumed) |
| Create account | `/register` | Display name + passkey; save account ID & 10 backup codes once |
| Recover account | `/recover` | Backup code only → register new passkey |
| Security settings | `/settings/security` | Add/revoke passkeys, regenerate backup codes |

`APP_URL` must match your browser origin in production (required for WebAuthn `rpId`).

## Stack

- Next.js 15 (App Router + API routes)
- PostgreSQL + Drizzle ORM
- WebAuthn passkeys (`@simplewebauthn/*`)
- JWT auth (`jose`)
- Zod validation
- Docker multi-stage build with standalone output

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `connection refused` on port 5433 | Run `npm run deps` or `docker compose up -d postgres` |
| `connection refused` on port 5432 | Start native Postgres: `brew services start postgresql@16` |
| `relation does not exist` | Run `npm run db:migrate:run` |
| Docker app won't start | Check logs: `docker compose logs app`. Ensure `JWT_SECRET` is set in `.env` |
| Port 3000 in use | Set `APP_PORT=3001` in `.env` and `APP_URL=http://localhost:3001` |
| Invite links wrong host | Set `APP_URL` to your public URL |

## Scaling note

SSE broadcasting is in-process. Horizontal scaling would require Redis pub/sub.
