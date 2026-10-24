# Legacy CommonJS Server (Deprecated)

> [!WARNING]
> This folder (`server/`) is deprecated and preserved only for historical reference.

The production backend has been migrated to a fully typed, modular TypeScript Express backend running on native **PostgreSQL 15**:

- **Active Backend Location**: [`nowhere-esports-intranet/backend/`](../backend)
- **Database Engine**: PostgreSQL 15 (`pg` connection pool with parameterized queries)
- **Authentication**: Native bcrypt password hashing + standard JSON Web Tokens (JWT)
- **Honeypot Engine**: Integrated 14-signature weighted detection engine with SSE streaming (`/honeypot/events`) and Kafka event publishing (`raw-attacks`).
- **Tests**: 128 vitest tests passing in `nowhere-esports-intranet/backend`.

To start the active backend:
```bash
cd nowhere-esports-intranet/backend
npm run dev
```
or from the root folder:
```bash
start_project.bat
```
