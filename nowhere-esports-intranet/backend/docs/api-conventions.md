# API Conventions — Nowhere Esports Backend

## Base URL

All API routes are versioned under:

```
http://localhost:3001/api/v1
```

Health endpoints are at the root (no versioning):

```
http://localhost:3001/health
http://localhost:3001/health/database
http://localhost:3001/health/auth
```

---

## Authentication

Protected routes require a Supabase JWT in the Authorization header:

```
Authorization: Bearer <supabase-access-token>
```

- Tokens are obtained from the frontend via `supabase.auth.getSession()`
- Tokens expire per Supabase project settings (default: 1 hour)
- The backend verifies tokens via `supabaseAdmin.auth.getUser(token)` — never locally

---

## Request Format

- **Content-Type**: `application/json`
- **Body size limit**: 1MB
- **Encoding**: UTF-8

---

## Response Format

All responses follow a consistent envelope.

### Success

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "meta": {}
}
```

| Field | Type | Description |
|---|---|---|
| `success` | boolean | Always `true` for success |
| `message` | string | Human-readable description |
| `data` | object/array | Response payload |
| `meta` | object | Optional — pagination, totals, etc. |

### Pagination Meta

```json
{
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Error

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "invalid_string"
    }
  ],
  "status": 400
}
```

| Field | Type | Description |
|---|---|---|
| `success` | boolean | Always `false` for errors |
| `message` | string | Human-readable error summary |
| `errors` | array | Optional — field-level validation errors |
| `status` | number | HTTP status code |

---

## HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | OK — request succeeded |
| 201 | Created — resource created |
| 204 | No Content — success, no body |
| 400 | Bad Request — validation failed |
| 401 | Unauthorized — missing or invalid JWT |
| 403 | Forbidden — authenticated but insufficient role |
| 404 | Not Found — resource does not exist |
| 409 | Conflict — resource already exists |
| 429 | Too Many Requests — rate limit exceeded |
| 500 | Internal Server Error — unexpected failure |
| 503 | Service Unavailable — dependency down |

---

## Pagination

List endpoints accept:

```
GET /api/v1/employees?page=1&pageSize=20
```

Default: `page=1`, `pageSize=20`. Maximum `pageSize=100`.

---

## Filtering & Sorting

```
GET /api/v1/employees?q=alice&sortDir=desc&from=2026-01-01T00:00:00Z
```

---

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Scope**: `/api/*` routes only (health endpoints excluded)
- **Headers**: `RateLimit-*` (RFC 6585 standard headers)
- **Response on limit**: `429 Too Many Requests`

---

## Error Types

| Class | HTTP | When |
|---|---|---|
| `ValidationError` | 400 | Zod schema failed for body/query/params |
| `AuthenticationError` | 401 | Missing, invalid, or expired JWT |
| `AuthorizationError` | 403 | Authenticated but wrong role |
| `NotFoundError` | 404 | Resource not found |
| `ConflictError` | 409 | Duplicate resource |
| `DatabaseError` | 500 | Supabase/PostgreSQL failure |
| `InternalServerError` | 500 | Unexpected application error |

---

## Route Reference Table

### Authentication Endpoints
- `POST /api/v1/auth/register` — Signup new employee (Public, Rate Limit: 10/15min)
- `POST /api/v1/auth/login` — Signin and obtain tokens (Public, Rate Limit: 10/15min)
- `POST /api/v1/auth/logout` — Terminate session (Authenticated)
- `POST /api/v1/auth/forgot-password` — Request password reset email (Public, Rate Limit: 5/hr)
- `POST /api/v1/auth/reset-password` — Execute password update with recovery token (Public)
- `POST /api/v1/auth/refresh` — Refresh access token (Public)

### User Endpoints
- `GET /api/v1/users/me` — Retrieve own user profile (Authenticated)
- `PATCH /api/v1/users/me` — Update own user profile (Authenticated)
- `GET /api/v1/users/:id` — Retrieve specific user profile (Self or Admin)
- `PATCH /api/v1/users/:id` — Update specific user profile (Self or Admin)
- `DELETE /api/v1/users/:id` — Soft delete specific user profile (Self or Admin)

### Admin Endpoints
- `GET /api/v1/admin/users` — List and filter all user profiles (Admin)
- `PATCH /api/v1/admin/users/:id/role` — Update user role (Admin)
- `PATCH /api/v1/admin/users/:id/status` — Update account status (Admin)

