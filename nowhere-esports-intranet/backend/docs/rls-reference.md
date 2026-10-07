# RLS Policies Reference

Row Level Security (RLS) is enabled on all Nowhere Esports Intranet tables. Access is restricted using custom Postgres policy checks.

---

## 1. Access Control Matrix

| Table Category / Tables | Employee | Manager | HR | IT Support | Tournament Admin | Admin / Super Admin |
|---|---|---|---|---|---|---|
| **Corporate Data** (Orgs, Offices, Depts, Titles) | SELECT | SELECT | SELECT | SELECT | SELECT | ALL |
| **Employee Files** (Contacts, Addresses, Docs) | SELECT/UPDATE own | SELECT/UPDATE own | SELECT/UPDATE own | SELECT/UPDATE own | SELECT/UPDATE own | ALL |
| **Ticketing** (Support Tickets, Comments) | ALL own | ALL own | ALL own | ALL | ALL own | ALL |
| **Esports** (Matches, Tournaments, Teams) | SELECT | SELECT | SELECT | SELECT | ALL | ALL |
| **KB Articles** | SELECT | SELECT | SELECT | SELECT | SELECT | ALL |

---

## 2. Helper Functions

To optimize policy lookup performance and avoid recursive queries, we use helper functions:

- `public.get_my_role()` — Extracts the user's role string from cached session metadata.
- `public.get_my_department()` — Returns the department ID associated with the current `auth.uid()`.
