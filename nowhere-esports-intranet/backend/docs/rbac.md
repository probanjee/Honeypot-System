# Role-Based Access Control (RBAC)

The Nowhere Esports Intranet uses role-based authorization to secure endpoints and data access.

---

## Role Tiers

The backend defines 8 distinct role levels:

| Role Enum | Hierarchy Index | Description |
|---|---|---|
| `employee` | 0 | Standard staff member |
| `manager` | 1 | Department/Team supervisor |
| `hr` | 2 | Human Resources specialist |
| `tournament_admin` | 3 | Tournament operations crew |
| `it_support` | 4 | IT Support and service desk staff |
| `security_analyst` | 5 | Incident and audit trail reviewer |
| `administrator` | 6 | Standard administrator |
| `super_admin` | 7 | System owner with root privileges |

---

## Authorization Middleware

Authorization logic is decoupled from controllers and declared directly in routers using standard middleware guards:

```typescript
import { requireAuth, requireRole, requireMinimumRole, requireSelfOrAdmin } from '../permissions/guards';
import { UserRole } from '../constants/roles';

// 1. Require Authenticated User
router.get('/me', requireAuth, controller.getMe);

// 2. Require Exact Role (or one of exact roles)
router.get('/tournaments/setup', requireAuth, requireRole(UserRole.TournamentAdmin), controller.setup);

// 3. Require Minimum Role Rank (hierarchy check)
router.get('/reports', requireAuth, requireMinimumRole(UserRole.Manager), controller.getReports);

// 4. Require Self OR Admin (useful for profile lookups/updates)
router.get('/:id', requireAuth, requireSelfOrAdmin('id'), controller.getUserById);
```

---

## Row Level Security (RLS) Matrix

RLS is enabled in the database for client-side queries:

| Table | Actor | Policy Behavior |
|---|---|---|
| `profiles` | `employee` | SELECT / UPDATE own profile row |
| | `manager` | SELECT team member profiles in same department |
| | `hr` | SELECT all active / suspended profile rows |
| | `administrator` | SELECT / INSERT / UPDATE all profile rows |
| | `super_admin` | SELECT / INSERT / UPDATE / DELETE all profile rows |
| `audit_events` | `employee` | SELECT events where they are actor or target |
| | `security_analyst` | SELECT all events |
| | `administrator` | SELECT all events |
| | `super_admin` | SELECT all events |
