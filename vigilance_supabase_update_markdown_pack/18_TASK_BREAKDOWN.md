# Task Breakdown

## Phase 0: Backup and branch

- [ ] Create git branch: `feature/supabase-db-upgrade`
- [ ] Backup current MongoDB data
- [ ] Save current `.env` files privately
- [ ] Confirm project starts before changes
- [ ] Document current failing tests

## Phase 1: Supabase foundation

- [ ] Install Supabase CLI
- [ ] Run `supabase init`
- [ ] Add migration from `06_SUPABASE_MIGRATION_SQL.md`
- [ ] Add seed file
- [ ] Run `supabase db reset`
- [ ] Verify tables/views/RLS

## Phase 2: Auth and roles

- [ ] Add Supabase Auth frontend client
- [ ] Add backend JWT verification
- [ ] Add profile role fetching
- [ ] Add admin bootstrap SQL
- [ ] Replace custom token generation
- [ ] Remove unsafe `req.user.save()` pattern
- [ ] Add auth/role tests

## Phase 3: Node intranet migration

- [ ] Add Supabase server client
- [ ] Replace Mongoose user/profile operations
- [ ] Replace announcements persistence
- [ ] Replace matches persistence
- [ ] Add match score event insertion
- [ ] Update honeypot middleware event forwarding
- [ ] Remove hardcoded MongoDB dependency from runtime

## Phase 4: FastAPI platform integration

- [ ] Add Supabase service client
- [ ] Add protected API routes
- [ ] Add internal attack ingestion endpoint
- [ ] Save Kafka-consumed events into Supabase
- [ ] Implement dashboard summary queries
- [ ] Implement alert update routes
- [ ] Implement WebSocket manager or Supabase Realtime path

## Phase 5: Frontend dashboard

- [ ] Add Supabase client
- [ ] Add login/signup screens if missing
- [ ] Add session provider
- [ ] Add role-aware routing
- [ ] Replace direct vulnerable-app SSE URL
- [ ] Add attack/alert realtime hooks
- [ ] Add disconnected/degraded UI states

## Phase 6: Data migration

- [ ] Export MongoDB data
- [ ] Transform users/profiles
- [ ] Transform matches
- [ ] Transform announcements
- [ ] Transform attack logs
- [ ] Import into Supabase
- [ ] Verify row counts and sample records

## Phase 7: Bug fixes from audit

- [ ] Fix Python `typing.Dict` import
- [ ] Fix analytics `session_id`/resample crash
- [ ] Fix threat-intel Python import path
- [ ] Fix HTTP honeypot local import
- [ ] Fix pytest `sys.path`
- [ ] Fix startup script env copying
- [ ] Standardize ports

## Phase 8: Testing

- [ ] Migration tests
- [ ] RLS tests
- [ ] Auth tests
- [ ] Node API tests
- [ ] FastAPI tests
- [ ] Ingestion tests
- [ ] Realtime tests
- [ ] Frontend smoke tests

## Phase 9: Deployment

- [ ] Push migrations to staging
- [ ] Deploy staging backend/frontend
- [ ] Run staging data migration
- [ ] Verify staging
- [ ] Tag release
- [ ] Production cutover
- [ ] Monitor logs

## Phase 10: Documentation

- [ ] Update README
- [ ] Update `.env.example`
- [ ] Update architecture diagram
- [ ] Update API docs
- [ ] Update security/RLS docs
- [ ] Update changelog
