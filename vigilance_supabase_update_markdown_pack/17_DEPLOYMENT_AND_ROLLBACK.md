# Deployment and Rollback Plan

## Environments

| Environment | Purpose |
|---|---|
| local | developer testing with Supabase local stack |
| staging | remote Supabase project for validation |
| production | final live deployment |

## Deployment phases

### Phase 1: Local schema

1. Install Supabase CLI.
2. Run local Supabase.
3. Apply migration.
4. Run RLS tests.
5. Run backend/frontend smoke tests.

### Phase 2: Staging

1. Create staging Supabase project.
2. Link project:
   ```bash
   supabase link --project-ref <project-ref>
   ```
3. Push migrations:
   ```bash
   supabase db push
   ```
4. Configure env variables.
5. Deploy backend/frontend to staging.
6. Run full test suite.

### Phase 3: Data migration

1. Export MongoDB.
2. Transform data.
3. Import into staging.
4. Verify counts.
5. Validate dashboard.
6. Fix transformation issues.

### Phase 4: Production cutover

1. Backup MongoDB.
2. Freeze old writes.
3. Apply Supabase migrations.
4. Run final import.
5. Switch app env variables.
6. Start services.
7. Run smoke tests.
8. Monitor logs.

## Rollback plan

Rollback if:
- Auth fails for all users.
- RLS blocks valid admin/analyst workflows.
- Ingestion cannot write events.
- Dashboard cannot load critical views.
- Migration corrupts data.

Steps:
1. Stop new deployment.
2. Revert env variables to MongoDB-backed version.
3. Restore previous app build.
4. Keep Supabase database for investigation.
5. Do not delete migration/export files.
6. Document failure in changelog.

## Backup strategy

Before production migration:
- Export MongoDB collections.
- Dump Supabase staging DB after import verification.
- Keep `.env` backups outside git.
- Tag Git commit before cutover.

## Post-deployment monitoring

Check:
- auth error rate
- backend 401/403 spikes
- ingestion failures
- Supabase database CPU/IO
- realtime disconnects
- slow dashboard queries
- RLS denied events
- alert delivery status

## Security checklist before production

- Service role key only in backend/worker env.
- No service role key in frontend bundle.
- RLS enabled on all public tables.
- Admin bootstrap complete.
- API keys rotated if accidentally logged.
- CORS restricted.
- Internal endpoints protected.
- Threat intel keys backend-only.
