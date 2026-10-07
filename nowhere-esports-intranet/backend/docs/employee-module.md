# Employee Module Documentation

This document covers the functional behavior, employee lifecycle workflows, and directories.

---

## 1. Employee Lifecycle Workflows

The employee management domain coordinates several lifecycle states:

### 1. Creation (`createEmployee`)
- Synchronizes with the `profiles` table to record display identity, corporate timezone, assignment office, and department.
- Creates matching record in the `employees` table.
- Upserts optional home/mailing addresses and primary emergency contacts.
- Records an `EMPLOYEE_CREATED` audit log.

### 2. Update (`updateEmployee`)
- Mutates profile names, departments, offices, job titles, reporting managers, or statuses.
- Auto-tracks and logs granular events: `DEPARTMENT_TRANSFER`, `OFFICE_TRANSFER`, `ROLE_CHANGED`, `MANAGER_CHANGE`, `EMPLOYMENT_STATUS_CHANGE`.
- Logs a general `EMPLOYEE_UPDATED` event.

### 3. Deactivation & Restoration
- Deactivation transitions `status` to `on_leave`. Logs `EMPLOYMENT_STATUS_CHANGE`.
- Restoration brings status back to `active`. Logs `EMPLOYMENT_STATUS_CHANGE`.

### 4. Termination (`terminateEmployee`)
- Transitions status to `terminated` and updates `termination_date` to the current date.
- Applies a database soft-delete (records `deleted_at`).
- Automatically logs the termination event.

---

## 2. Directory Searches

To search approximately 100,000+ employees:
- **Index Optimization**: Queries hit the pre-computed `search_vector` TSVECTOR GIN index on `profiles`.
- **Query View**: Search operations query `employee_directory_view`, fetching department name/code, office city/name, designation title, and manager names in a single database roundtrip.
- **Filters**: Supports filtering by status, role, department code, office name, and reporting manager ID.
