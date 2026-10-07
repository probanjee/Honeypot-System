# Supabase Migration SQL

Create a migration file:

```bash
supabase migration new init_vigilance_schema
```

Then paste this SQL into the generated file.

> Filename example: `supabase/migrations/20260626000100_init_vigilance_schema.sql`

```sql
-- VIGILANCE Supabase/Postgres schema
-- Safe baseline migration.

create extension if not exists "pgcrypto";

do $$ begin
    create type public.app_role as enum ('admin', 'analyst', 'user', 'service');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.attack_severity as enum ('low', 'medium', 'high', 'critical');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.alert_status as enum ('open', 'acknowledged', 'resolved', 'false_positive');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.match_status as enum ('scheduled', 'live', 'completed', 'cancelled');
exception
    when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create table if not exists public.teams (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    description text,
    created_at timestamptz not null default now()
);

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text unique,
    display_name text,
    role public.app_role not null default 'user',
    team_id uuid references public.teams(id) on delete set null,
    avatar_url text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.announcements (
    id uuid primary key default gen_random_uuid(),
    title text not null check (length(title) between 1 and 200),
    body text not null,
    status text not null default 'draft' check (status in ('draft', 'published')),
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

drop trigger if exists set_announcements_updated_at on public.announcements;
create trigger set_announcements_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

create table if not exists public.matches (
    id uuid primary key default gen_random_uuid(),
    team_a text not null,
    team_b text not null,
    score jsonb not null default '{}'::jsonb,
    status public.match_status not null default 'scheduled',
    scheduled_at timestamptz,
    updated_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

drop trigger if exists set_matches_updated_at on public.matches;
create trigger set_matches_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

create table if not exists public.match_score_events (
    id uuid primary key default gen_random_uuid(),
    match_id uuid not null references public.matches(id) on delete cascade,
    score jsonb not null,
    status public.match_status,
    updated_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

create table if not exists public.honeypot_nodes (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    node_type text not null check (node_type in ('http', 'ssh', 'web', 'api', 'other')),
    environment text not null default 'local' check (environment in ('local', 'dev', 'staging', 'prod')),
    host text,
    port int check (port is null or (port > 0 and port < 65536)),
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create table if not exists public.honeypot_sessions (
    id uuid primary key default gen_random_uuid(),
    node_id uuid references public.honeypot_nodes(id) on delete set null,
    source_ip inet not null,
    user_agent text,
    started_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    event_count int not null default 0
);

create table if not exists public.attack_events (
    id uuid primary key default gen_random_uuid(),
    session_id uuid references public.honeypot_sessions(id) on delete set null,
    node_id uuid references public.honeypot_nodes(id) on delete set null,
    source_ip inet not null,
    source_port int check (source_port is null or (source_port > 0 and source_port < 65536)),
    protocol text not null,
    method text,
    path text,
    signature text,
    severity public.attack_severity not null default 'low',
    country_code text,
    asn text,
    payload_hash text,
    payload_preview text,
    metadata jsonb not null default '{}'::jsonb,
    received_at timestamptz not null default now()
);

create table if not exists public.attack_payloads (
    event_id uuid primary key references public.attack_events(id) on delete cascade,
    raw_payload text,
    headers jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists public.threat_enrichments (
    id uuid primary key default gen_random_uuid(),
    event_id uuid references public.attack_events(id) on delete cascade,
    source_ip inet not null,
    provider text not null,
    score int,
    result jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists public.detection_rules (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    description text,
    pattern text not null,
    severity public.attack_severity not null default 'low',
    enabled boolean not null default true,
    version int not null default 1,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

drop trigger if exists set_detection_rules_updated_at on public.detection_rules;
create trigger set_detection_rules_updated_at
before update on public.detection_rules
for each row execute function public.set_updated_at();

create table if not exists public.alerts (
    id uuid primary key default gen_random_uuid(),
    event_id uuid references public.attack_events(id) on delete set null,
    title text not null,
    description text,
    severity public.attack_severity not null default 'low',
    status public.alert_status not null default 'open',
    assigned_to uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

drop trigger if exists set_alerts_updated_at on public.alerts;
create trigger set_alerts_updated_at
before update on public.alerts
for each row execute function public.set_updated_at();

create table if not exists public.system_health_checks (
    id uuid primary key default gen_random_uuid(),
    service_name text not null,
    status text not null check (status in ('ok', 'degraded', 'down')),
    details jsonb not null default '{}'::jsonb,
    checked_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    actor_id uuid references auth.users(id) on delete set null,
    action text not null,
    entity_type text not null,
    entity_id uuid,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create or replace view public.attack_event_summary
with (security_invoker = true)
as
select
    ae.id,
    ae.session_id,
    ae.source_ip,
    ae.protocol,
    ae.method,
    ae.path,
    ae.signature,
    ae.severity,
    ae.country_code,
    ae.asn,
    ae.received_at,
    hn.name as node_name,
    hn.node_type
from public.attack_events ae
left join public.honeypot_nodes hn on hn.id = ae.node_id;

create or replace view public.attack_counts_by_severity
with (security_invoker = true)
as
select
    severity,
    count(*)::bigint as total,
    max(received_at) as last_seen_at
from public.attack_events
group by severity;

create or replace view public.recent_alerts
with (security_invoker = true)
as
select
    id,
    event_id,
    title,
    description,
    severity,
    status,
    assigned_to,
    created_at,
    updated_at
from public.alerts
order by created_at desc
limit 100;

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_team_id on public.profiles(team_id);
create index if not exists idx_announcements_status on public.announcements(status);
create index if not exists idx_matches_status on public.matches(status);
create index if not exists idx_match_score_events_match_id_created_at on public.match_score_events(match_id, created_at desc);
create index if not exists idx_honeypot_sessions_source_ip on public.honeypot_sessions(source_ip);
create index if not exists idx_attack_events_received_at on public.attack_events(received_at desc);
create index if not exists idx_attack_events_source_ip on public.attack_events(source_ip);
create index if not exists idx_attack_events_severity on public.attack_events(severity);
create index if not exists idx_attack_events_protocol on public.attack_events(protocol);
create index if not exists idx_attack_events_session_id on public.attack_events(session_id);
create index if not exists idx_threat_enrichments_source_ip on public.threat_enrichments(source_ip);
create index if not exists idx_alerts_status on public.alerts(status);
create index if not exists idx_alerts_severity on public.alerts(severity);
create index if not exists idx_system_health_checks_service_checked on public.system_health_checks(service_name, checked_at desc);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.announcements enable row level security;
alter table public.matches enable row level security;
alter table public.match_score_events enable row level security;
alter table public.honeypot_nodes enable row level security;
alter table public.honeypot_sessions enable row level security;
alter table public.attack_events enable row level security;
alter table public.attack_payloads enable row level security;
alter table public.threat_enrichments enable row level security;
alter table public.detection_rules enable row level security;
alter table public.alerts enable row level security;
alter table public.system_health_checks enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
    select role
    from public.profiles
    where id = auth.uid()
      and is_active = true
    limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.is_analyst_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(public.current_user_role() in ('admin', 'analyst'), false);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, email, display_name, role)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
        'user'
    )
    on conflict (id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS policies

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
    auth.uid() = id
    or public.is_admin()
);

drop policy if exists "profiles_update_own_basic" on public.profiles;
create policy "profiles_update_own_basic"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
);

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "teams_read_authenticated" on public.teams;
create policy "teams_read_authenticated"
on public.teams
for select
to authenticated
using (true);

drop policy if exists "teams_admin_write" on public.teams;
create policy "teams_admin_write"
on public.teams
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "announcements_read_published" on public.announcements;
create policy "announcements_read_published"
on public.announcements
for select
to authenticated
using (status = 'published' or public.is_admin());

drop policy if exists "announcements_admin_write" on public.announcements;
create policy "announcements_admin_write"
on public.announcements
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "matches_read_authenticated" on public.matches;
create policy "matches_read_authenticated"
on public.matches
for select
to authenticated
using (true);

drop policy if exists "matches_admin_write" on public.matches;
create policy "matches_admin_write"
on public.matches
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "match_score_events_read_authenticated" on public.match_score_events;
create policy "match_score_events_read_authenticated"
on public.match_score_events
for select
to authenticated
using (true);

drop policy if exists "match_score_events_admin_insert" on public.match_score_events;
create policy "match_score_events_admin_insert"
on public.match_score_events
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "honeypot_nodes_read_analyst_admin" on public.honeypot_nodes;
create policy "honeypot_nodes_read_analyst_admin"
on public.honeypot_nodes
for select
to authenticated
using (public.is_analyst_or_admin());

drop policy if exists "honeypot_nodes_admin_write" on public.honeypot_nodes;
create policy "honeypot_nodes_admin_write"
on public.honeypot_nodes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "honeypot_sessions_read_analyst_admin" on public.honeypot_sessions;
create policy "honeypot_sessions_read_analyst_admin"
on public.honeypot_sessions
for select
to authenticated
using (public.is_analyst_or_admin());

drop policy if exists "attack_events_read_analyst_admin" on public.attack_events;
create policy "attack_events_read_analyst_admin"
on public.attack_events
for select
to authenticated
using (public.is_analyst_or_admin());

drop policy if exists "attack_payloads_read_admin_only" on public.attack_payloads;
create policy "attack_payloads_read_admin_only"
on public.attack_payloads
for select
to authenticated
using (public.is_admin());

drop policy if exists "threat_enrichments_read_analyst_admin" on public.threat_enrichments;
create policy "threat_enrichments_read_analyst_admin"
on public.threat_enrichments
for select
to authenticated
using (public.is_analyst_or_admin());

drop policy if exists "detection_rules_read_analyst_admin" on public.detection_rules;
create policy "detection_rules_read_analyst_admin"
on public.detection_rules
for select
to authenticated
using (public.is_analyst_or_admin());

drop policy if exists "detection_rules_admin_write" on public.detection_rules;
create policy "detection_rules_admin_write"
on public.detection_rules
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "alerts_read_analyst_admin" on public.alerts;
create policy "alerts_read_analyst_admin"
on public.alerts
for select
to authenticated
using (public.is_analyst_or_admin());

drop policy if exists "alerts_analyst_update_status" on public.alerts;
create policy "alerts_analyst_update_status"
on public.alerts
for update
to authenticated
using (public.is_analyst_or_admin())
with check (public.is_analyst_or_admin());

drop policy if exists "system_health_read_analyst_admin" on public.system_health_checks;
create policy "system_health_read_analyst_admin"
on public.system_health_checks
for select
to authenticated
using (public.is_analyst_or_admin());

drop policy if exists "audit_logs_read_admin_only" on public.audit_logs;
create policy "audit_logs_read_admin_only"
on public.audit_logs
for select
to authenticated
using (public.is_admin());

-- Intentionally no anon policies.
-- Intentionally no authenticated insert policies for attack_events, honeypot_sessions,
-- attack_payloads, threat_enrichments, system_health_checks, and audit_logs.
-- Server-side service role bypasses RLS and performs trusted writes.
```

## Seed file suggestion

Create `supabase/seed.sql`:

```sql
insert into public.honeypot_nodes (name, node_type, environment, host, port)
values
    ('Local HTTP Honeypot', 'http', 'local', '127.0.0.1', 8080),
    ('Local SSH Honeypot', 'ssh', 'local', '127.0.0.1', 2222)
on conflict do nothing;
```

## Local test commands

```bash
supabase db reset
supabase status
```

## Remote deploy command

```bash
supabase db push
```
