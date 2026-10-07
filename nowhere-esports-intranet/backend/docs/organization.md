# Organization & Corporate Structure Documentation

This document describes the organization, offices, departments, job titles, teams, and structural reporting relationships.

---

## 1. Corporate Units

### 1. Organization
- Serves as the tenant-level boundary.
- Stores company domain (e.g. `nowhere.gg`) for email white-listing.

### 2. Offices
- Tracks headquarter and regional offices.
- Includes location metadata: timezone, city, country, working hours, and regional holidays.
- All offices are managed in the `offices` table.

### 3. Departments
- Organizes employees into departments (e.g., Esports Operations, HR, Finance, Media).
- Auto-compiles real-time metrics (active employee counts, pending leave counts, document logs) via `department_statistics_view`.

### 4. Job Titles & Roles
- Tracks professional designations and corporate grade tiers (e.g., E2, M1, D1) mapping job levels to reporting paths.

---

## 2. Teams & Workgroups

The intranet structures collaborative units (esports rosters or corporate task forces) separately from departments:
- **Rosters & Projects**: Defined in the `teams` table (Valorant, LoL, CS Elite, etc.).
- **Managers**: Multiple managers can be linked to a team in the `team_managers` join table.
- **Members**: Employees belong to teams through the `team_members` join table, specifying team roles (e.g., `player`, `coach`, `analyst`).
