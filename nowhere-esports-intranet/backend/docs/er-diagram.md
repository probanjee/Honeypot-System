# Database Entity Relationship (ER) Diagram

This document illustrates the structural layout and relationship constraints configured for the Nowhere Esports Intranet.

---

## 1. Text-based ER Diagram

```text
  +------------------+         +------------------+         +------------------+
  |  organizations   |         |   departments    |         |     offices      |
  +------------------+         +------------------+         +------------------+
  | id (PK)          |         | id (PK)          |         | id (PK)          |
  | name             |         | org_id (FK)      |         | name             |
  +------------------+         +------------------+         +------------------+
          |                             |                            |
          | (1:M)                       | (1:M)                      | (1:M)
          v                             v                            v
  +----------------------------------------------------------------------------+
  |                                 profiles                                   |
  +----------------------------------------------------------------------------+
  | id (PK, FK references auth.users)                                          |
  | office_id (FK) | department_id (FK) | job_title_id (FK)                     |
  +----------------------------------------------------------------------------+
                                        |
                                        | (1:1 relationship)
                                        v
  +----------------------------------------------------------------------------+
  |                                employees                                   |
  +----------------------------------------------------------------------------+
  | id (PK, FK references profiles.id)                                         |
  | manager_id (FK references employees.id)                                    |
  +----------------------------------------------------------------------------+
          |                     |                      |                     |
          | (1:M)               | (1:M)                | (1:M)               | (1:M)
          v                     v                      v                     v
  +---------------+     +---------------+      +---------------+     +---------------+
  |   contacts    |     |   addresses   |      |  emergencies  |     |   documents   |
  +---------------+     +---------------+      +---------------+     +---------------+
  | emp_id (FK)   |     | emp_id (FK)   |      | emp_id (FK)   |     | emp_id (FK)   |
  +---------------+     +---------------+      +---------------+     +---------------+
```

---

## 2. Key Relationships

### One-to-One Relationships (1:1)
- **`profiles` <-> `auth.users`**: Profiles extend the authentication record with display details and company role scopes.
- **`employees` <-> `profiles`**: Every active employee maps back to a single profile record containing general user configuration parameters.

### One-to-Many Relationships (1:M)
- **`departments` -> `profiles`**: A department groups multiple user profiles.
- **`employees` -> `employee_contacts` / `employee_addresses`**: Each employee record holds multiple contacts and mailing addresses.
- **`tournaments` -> `matches`**: Each tournament structures multiple match schedules.
- **`teams` -> `matches`**: Teams play in multiple matches.

### Many-to-Many Relationships (M:M)
- **`teams` <-> `employees` via `team_members`**: An employee can belong to multiple esports or corporate teams.
- **`announcements` <-> `profiles` via `announcement_reads`**: Tracks individual announcement read markers.
- **`notifications` <-> `profiles` via `notification_reads`**: Broadcasts single notifications to multiple profile feeds.
