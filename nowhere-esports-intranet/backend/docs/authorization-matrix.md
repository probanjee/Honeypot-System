# Authorization Matrix — Milestone 4

The intranet enforces strict, multi-tiered authorization middleware mapping user roles to domain operations.

---

## 1. Access Matrix

| Endpoint | Employee | Manager | HR | Administrator | Super Administrator |
|---|---|---|---|---|---|
| **GET /employees/:id** | Own Only | Own & Subordinates | Any | Any | Any |
| **POST /employees** | Blocked | Blocked | Allowed | Allowed | Allowed |
| **PATCH /employees/:id** | Address / Contact (Own) | Address / Contact (Own) | Any | Any | Any |
| **POST /employees/:id/deactivate** | Blocked | Blocked | Allowed | Allowed | Allowed |
| **POST /employees/:id/restore** | Blocked | Blocked | Allowed | Allowed | Allowed |
| **DELETE /employees/:id** | Blocked | Blocked | Allowed | Allowed | Allowed |
| **GET /directory/search** | Allowed | Allowed | Allowed | Allowed | Allowed |
| **GET /directory/hierarchy/** | Allowed | Allowed | Allowed | Allowed | Allowed |
| **POST /departments** | Blocked | Blocked | Blocked | Allowed | Allowed |
| **POST /offices** | Blocked | Blocked | Blocked | Allowed | Allowed |
| **POST /teams** | Blocked | Blocked | Blocked | Allowed | Allowed |
| **POST /teams/:id/members** | Blocked | Blocked | Blocked | Allowed | Allowed |

---

## 2. Guard Implementations

- **`requireMinimumRole(role)`**: Blocks requests where the cached JWT session role rank is below the endpoint threshold. E.g. `requireMinimumRole(UserRole.HR)` allows `HR`, `Admin`, and `SuperAdmin`.
- **`authorizeEmployeeAccess`**: Evaluates request parameters against the caller's ID and recursively queries subordinates to allow managers access to reports while preventing other employees from viewing external profiles.
