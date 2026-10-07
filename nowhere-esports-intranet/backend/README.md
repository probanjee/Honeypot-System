# Nowhere Esports Intranet — Backend

Production-ready TypeScript backend for the Nowhere Esports Intranet application.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express.js 4 |
| Language | TypeScript 5 (strict) |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (JWT) |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime (prepared) |
| Validation | Zod |
| Logging | Pino + pino-http |
| Security | Helmet, CORS, express-rate-limit |
| Testing | Vitest + Supertest |
| Container | Docker (multi-stage) |

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project (free tier works for development)

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Fill in your Supabase credentials in `.env`:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → URL |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role key |
| `SUPABASE_JWT_SECRET` | Supabase Dashboard → Settings → API → JWT secret |

### 3. Start Development Server

```bash
npm run dev
```

The server starts on `http://localhost:3001`.

### 4. Verify It Works

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "status": "ok",
    "environment": "development",
    "version": "1.0.0",
    "uptime": { "seconds": 2, "human": "0h 0m 2s" },
    "timestamp": "2026-07-05T16:00:00.000Z"
  }
}
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run typecheck` | Type-check without emitting files |
| `npm run clean` | Remove `dist/` directory |

---

## API Endpoints

### Health

| Method | Path | Description | Auth Required |
|---|---|---|---|
| GET | `/health` | App status, version, uptime | No |
| GET | `/health/database` | Supabase DB connectivity | No |
| GET | `/health/auth` | Supabase Auth service status | No |

---

## Docker

### Development (with hot-reload)

```bash
docker compose up
```

### Production build

```bash
docker build -t nowhere-esports-backend .
docker run -p 3001:3001 --env-file .env nowhere-esports-backend
```

---

## Testing

Tests use **Vitest** with **Supertest** for HTTP integration testing. Supabase is fully mocked — no real network calls are made.

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test suites

| File | Description |
|---|---|
| `tests/health.test.ts` | Health endpoint integration tests |
| `tests/auth.middleware.test.ts` | JWT verification middleware tests |
| `tests/error.middleware.test.ts` | Error class → HTTP status mapping tests |
| `tests/validate.middleware.test.ts` | Zod validation middleware tests |

---

## Project Structure

```
backend/
├── src/
│   ├── app/             # Express app factory
│   ├── auth/            # Supabase Auth helpers
│   ├── config/          # Env validation + configuration
│   ├── constants/       # Roles, HTTP status codes
│   ├── controllers/     # Route handlers
│   ├── database/        # Supabase client + health
│   ├── errors/          # Custom error classes
│   ├── middleware/       # Express middleware
│   ├── permissions/     # Role guards
│   ├── routes/          # Route definitions
│   ├── types/           # TypeScript types/interfaces
│   ├── utils/           # Shared utilities
│   └── validators/      # Reusable Zod schemas
│   └── server.ts        # Server entry point
├── tests/               # Test suites
├── docs/                # API conventions & guides
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Security

- **Helmet** — sets secure HTTP response headers
- **CORS** — configurable origin whitelist via `ALLOWED_ORIGINS`
- **Rate limiting** — 100 req/15min per IP on `/api/*` routes
- **JWT verification** — via Supabase Admin API (not local secret)
- **Env validation** — Zod schema fails fast on startup
- **Secret redaction** — Pino never logs JWTs, API keys, or passwords
- **Non-root Docker** — container runs as unprivileged `appuser`

---

## Environment Variables

See [`.env.example`](.env.example) for the complete reference.

---

## Milestone Roadmap

| Milestone | Status | Description |
|---|---|---|
| 1 | ✅ Complete | Backend foundation (this milestone) |
| 2 | Planned | Employee management module |
| 3 | Planned | Team & roster management |
| 4 | Planned | Match scheduling |
| 5 | Planned | Announcements |
| 6 | Planned | Notifications (Realtime) |
