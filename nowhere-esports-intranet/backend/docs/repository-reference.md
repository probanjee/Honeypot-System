# Repository Reference

The backend implements the Repository Pattern to abstract data storage operations. All database transactions are executed through these classes using `supabaseAdmin`.

---

## 1. EmployeeRepository
*Path*: `src/repositories/employee.repository.ts`

- `findById(id: string): Promise<any>`
  - Retrieves employee details joined with user profile fields.
- `findByEmployeeId(employeeId: string): Promise<any>`
  - Matches profiles against unique corporate employee IDs (e.g. `NWE-2026-0001`).
- `create(input: any): Promise<any>`
  - Inserts new employee record.
- `update(id: string, input: any): Promise<any>`
  - Mutates employee details.
- `softDelete(id: string): Promise<void>`
  - Flags an employee as `terminated` and logs `deleted_at`.

---

## 2. DepartmentRepository
*Path*: `src/repositories/department.repository.ts`

- `findById(id: string): Promise<any>`
  - Returns department record details.
- `findAll(): Promise<any[]>`
  - Lists all corporate department divisions.
- `create(input: any): Promise<any>`
  - Creates a new department.

---

## 3. AnnouncementRepository
*Path*: `src/repositories/announcement.repository.ts`

- `findById(id: string): Promise<any>`
  - Returns announcement details.
- `findAllPublished(): Promise<any[]>`
  - Returns published announcements sorted by date descending.

---

## 4. DocumentRepository
*Path*: `src/repositories/document.repository.ts`

- `findFolderById(id: string): Promise<any>`
  - Returns folder metadata.
- `createFolder(input: any): Promise<any>`
  - Provisions a directory folder.
- `createDocument(docInput: any, fileUrl: string, uploadedBy: string): Promise<any>`
  - Creates document metadata and initializes `document_versions` version 1.
