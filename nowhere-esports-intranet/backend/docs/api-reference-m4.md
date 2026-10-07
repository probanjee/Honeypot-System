# REST API Reference — Milestone 4

## 1. Employees Endpoints

### `GET /api/v1/employees/:id`
- **Description**: Returns employee detail sheet (includes address & emergency contacts).
- **Access**: Self, reporting Manager, HR, Admin, SuperAdmin.

### `POST /api/v1/employees`
- **Description**: Creates a new corporate employee profile.
- **Access**: HR, Admin, SuperAdmin.

### `PATCH /api/v1/employees/:id`
- **Description**: Updates employee profile. Self can update address/emergency contacts (corporate fields locked). HR/Admin can update all fields.
- **Access**: Self, HR, Admin, SuperAdmin.

### `POST /api/v1/employees/:id/deactivate`
- **Description**: Deactivates employee profile (sets status to `on_leave`).
- **Access**: HR, Admin, SuperAdmin.

### `POST /api/v1/employees/:id/restore`
- **Description**: Restores deactivated employee profile back to `active`.
- **Access**: HR, Admin, SuperAdmin.

### `DELETE /api/v1/employees/:id`
- **Description**: Terminates employee, recording termination date and applying soft-delete.
- **Access**: HR, Admin, SuperAdmin.

---

## 2. Directory & Hierarchy Endpoints

### `GET /api/v1/directory/search`
- **Description**: Enterprise directory keyword search and filtering.
- **Query Params**:
  - `q`: Search query.
  - `department`: Filter by department code/name.
  - `office`: Filter by office name/city.
  - `status`: Active status.
  - `role`: Role string.
  - `manager_id`: Filter by manager.
  - `page`, `limit`, `sortBy`, `sortOrder`.

### `GET /api/v1/directory/hierarchy/:id/managers`
- **Description**: Returns recursive manager reporting tree ascending up to CEO.

### `GET /api/v1/directory/hierarchy/:id/reports`
- **Description**: Returns recursive report list descending under the manager.

---

## 3. Department, Office & Team Endpoints

### `GET /api/v1/departments` | `POST /api/v1/departments`
- **Description**: List departments / Create department (Admin/SuperAdmin).

### `GET /api/v1/departments/statistics`
- **Description**: Returns department summaries (employee counts, pending leave requests).

### `GET /api/v1/offices` | `POST /api/v1/offices`
- **Description**: List offices / Create office (Admin/SuperAdmin).

### `GET /api/v1/teams` | `POST /api/v1/teams`
- **Description**: List teams / Create team (Admin/SuperAdmin).

### `POST /api/v1/teams/:id/members` | `DELETE /api/v1/teams/:id/members/:empId`
- **Description**: Assign / Remove team members.
