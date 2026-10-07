# Folder Structure — Nowhere Esports Backend

```
backend/
├── src/
│   │
│   ├── app/
│   │   └── app.ts              # Express app factory (createApp) — no port binding
│   │                           # Wires all middleware, routes, error handlers
│   │
│   ├── auth/
│   │   └── supabaseAuth.ts     # Supabase Auth wrappers: verifyToken, getUserById,
│   │                           # checkAuthServiceHealth
│   │
│   ├── config/
│   │   ├── env.ts              # Zod-validated environment schema — fails fast on startup
│   │   ├── app.ts              # Central typed config object derived from env
│   │   └── supabase.ts         # Supabase client factory (admin + user clients)
│   │
│   ├── constants/
│   │   ├── http.ts             # HTTP_STATUS constants
│   │   └── roles.ts            # UserRole enum (8 roles), hierarchy, type guard
│   │
│   ├── controllers/
│   │   └── health.controller.ts  # GET /health, /health/database, /health/auth
│   │   # Future: employees.controller.ts, teams.controller.ts, etc.
│   │
│   ├── database/
│   │   ├── client.ts           # Re-exports supabaseAdmin/supabaseUser (single source)
│   │   └── health.ts           # checkDatabaseHealth() — Supabase ping
│   │
│   ├── dto/
│   │   # Data Transfer Objects — typed request/response shapes for each module
│   │   # Empty in Milestone 1, populated in Milestone 2+
│   │
│   ├── errors/
│   │   ├── AppError.ts         # Base error class (statusCode, isOperational, errors[])
│   │   └── index.ts            # 7 derived error classes (ValidationError → InternalServerError)
│   │
│   ├── middleware/
│   │   ├── authenticate.ts     # Mandatory JWT verification — attaches req.user
│   │   ├── errorHandler.ts     # Centralized error middleware — maps errors to responses
│   │   ├── notFound.ts         # 404 catch-all
│   │   ├── optionalAuth.ts     # Non-blocking JWT check — attaches user if valid token
│   │   ├── requestLogger.ts    # Pino HTTP logging with auth header redaction
│   │   ├── security.ts         # Helmet + CORS + compression + cookie-parser + rate limit
│   │   └── validate.ts         # Zod validation factory for body/query/params
│   │
│   ├── modules/
│   │   # Feature modules (Milestone 2+): employees/, teams/, matches/, etc.
│   │   # Each module contains its own controller, service, repository, validators
│   │
│   ├── permissions/
│   │   ├── roles.ts            # getRoleRank, hasMinimumRole, ADMIN_ROLES, etc.
│   │   └── guards.ts           # requireRole(), requireMinimumRole(), requireAnyRole()
│   │
│   ├── repositories/
│   │   # Data access layer — Supabase queries isolated here (Milestone 2+)
│   │
│   ├── routes/
│   │   ├── index.ts            # Central router — mounts all route groups
│   │   └── health.routes.ts    # Health check route definitions
│   │   # Future: employees.routes.ts, teams.routes.ts, etc.
│   │
│   ├── services/
│   │   # Business logic layer — orchestrates repositories (Milestone 2+)
│   │
│   ├── types/
│   │   ├── api.ts              # ApiSuccessResponse, ApiErrorResponse, PaginationMeta
│   │   ├── auth.ts             # AuthUser interface
│   │   └── express.d.ts        # Express namespace augmentation (req.user, req.requestId)
│   │
│   ├── utils/
│   │   ├── asyncHandler.ts     # Async route handler wrapper → forwards errors to next()
│   │   ├── logger.ts           # Pino logger instance with secret redaction
│   │   └── response.ts         # sendSuccess() and sendError() helpers
│   │
│   ├── validators/
│   │   └── common.ts           # Reusable Zod schemas: uuidParam, paginationQuery, etc.
│   │   # Future: employees.validators.ts, teams.validators.ts, etc.
│   │
│   └── server.ts               # Entry point — starts HTTP server, graceful shutdown
│
├── tests/
│   ├── setup.ts                # Global test setup — mocks Supabase, sets env vars
│   ├── health.test.ts          # Health endpoint integration tests
│   ├── auth.middleware.test.ts # JWT auth middleware tests
│   ├── error.middleware.test.ts  # Error class → HTTP status mapping tests
│   └── validate.middleware.test.ts  # Zod validation middleware tests
│
├── docs/
│   ├── api-conventions.md      # Request/response format, auth, pagination
│   └── folder-structure.md     # This file
│
├── .env.example                # Environment variable documentation
├── .gitignore
├── Dockerfile                  # Multi-stage: builder + runner (Alpine, non-root)
├── docker-compose.yml          # Development compose with hot-reload
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Design Principles

### Layered Architecture

```
Request → Middleware → Routes → Controllers → Services → Repositories → Supabase
```

Each layer has a single responsibility:

| Layer | Responsibility |
|---|---|
| Middleware | Auth, validation, logging, security, rate limiting |
| Routes | URL mapping and middleware composition |
| Controllers | HTTP request/response handling |
| Services | Business logic (Milestone 2+) |
| Repositories | Data access (Supabase queries) |

### Module Pattern (Milestone 2+)

Each feature module follows this file structure:

```
src/modules/<feature>/
├── <feature>.controller.ts
├── <feature>.service.ts
├── <feature>.repository.ts
├── <feature>.validators.ts
└── index.ts
```

Routes for each module are registered in `src/routes/index.ts`.
