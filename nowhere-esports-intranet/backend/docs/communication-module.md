# Communication Module Reference Guide

This document provides the implementation specifications, database layout, API endpoint contracts, and validation rules for the **Announcements & Notifications Engine** of the Nowhere Esports Intranet.

---

## 1. Announcement System

The announcement system allows content creators (primarily HR and Executives) to broadcast news and updates to employees with granular targeting.

### 1.1 Targeting & Visibility Algorithm
Announcements support the following targeting options through the `visibility` and relationship fields:
- **Company-Wide (`company`)**: Visible to all registered users.
- **Office-Scoped (`office`)**: Filtered by matching `office_id` on user profiles.
- **Department-Scoped (`department`)**: Filtered by matching `department_id` on user profiles.
- **Team-Scoped (`team`)**: Filtered by matching `team_id` from the user's active membership in `team_members`.
- **Individual-Scoped (`employee`)**: Targeted directly to a single `profile_id`.

When an employee fetches their announcements feed (`GET /api/v1/announcements`), the database query is evaluated dynamically inside `AnnouncementRepository.findVisibleTo`:
```sql
SELECT * FROM announcements 
WHERE status = 'published'
  AND deleted_at IS NULL
  AND published_at <= NOW()
  AND (expire_at IS NULL OR expire_at > NOW())
  AND (
    visibility = 'company'
    OR (visibility = 'office' AND office_id = :userOfficeId)
    OR (visibility = 'department' AND department_id = :userDeptId)
    OR (visibility = 'team' AND id IN (
        SELECT announcement_id FROM announcements WHERE team_id IN (:userTeamIds)
    ))
    OR (visibility = 'employee' AND id IN (
        SELECT announcement_id FROM announcements WHERE target_employee_id = :userId
    ))
  )
ORDER BY pinned DESC, published_at DESC;
```

### 1.2 Read Tracking
To measure employee engagement, all read events are audited in the `announcement_reads` table.
- **Table Schema**:
  - `announcement_id` (UUID, Foreign Key)
  - `profile_id` (UUID, Foreign Key)
  - `read_at` (Timestamp with timezone, defaults to `NOW()`)
  - `opened` (Boolean, tracks if the announcement detail page was opened)
  - `read_time` (Integer, tracks duration spent reading in seconds)
- **API Endpoint**: `POST /api/v1/announcements/:id/read`
- **Validation**:
  - `opened`: Required, boolean.
  - `read_time`: Optional, positive integer.

---

## 2. Notification Engine

The Notification Engine handles targeted user alerts with custom styling (icons), priorities, action URLs, and read/archive workflows.

### 2.1 Priorities
All notifications are classified into four priority levels:
1. **Critical**: Real-time alerts, critical outages, or emergency messages. Displayed prominently and sorted to the top.
2. **High**: Department changes, onboarding tasks, policy updates.
3. **Medium**: Document shares, general updates.
4. **Low**: Non-intrusive social updates (birthdays, anniversaries).

### 2.2 System Lifecycle Event Triggers
Notifications are dispatched automatically in response to system events handled by `NotificationService.handleEvent`:
- `employee_created`: Sent to the newly onboarded employee.
- `role_updated`: Sent to the employee when their role is modified.
- `department_transferred`: Sent to the employee when transferred to a different department.
- `password_changed`: Sent to the user as security verification after their password is changed.

---

## 3. API Reference

### 3.1 Announcements Endpoints

#### `GET /api/v1/announcements`
- **Description**: Returns targeted announcements visible to the current authenticated user.
- **QueryParams**:
  - `limit` (Optional, default: 20)
  - `offset` (Optional, default: 0)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "uuid",
        "title": "Intranet Launch",
        "slug": "intranet-launch-2026",
        "content": "We are proud to introduce our new intranet...",
        "priority": "high",
        "pinned": true,
        "published_at": "2026-07-05T18:00:00Z"
      }
    ]
  }
  ```

#### `POST /api/v1/announcements`
- **Role Requirement**: `HR` or `Executive` or `SuperAdmin`
- **Payload**:
  ```json
  {
    "title": "Welcome Esports Teams",
    "content": "All team managers, prepare for check-in...",
    "category": "operations",
    "priority": "high",
    "visibility": "team",
    "team_id": "team-uuid",
    "publish_immediate": true
  }
  ```

#### `POST /api/v1/announcements/:id/pin`
- **Role Requirement**: `HR` or `Executive` or `SuperAdmin`
- **Payload**: `{"pinned": true}`

#### `POST /api/v1/announcements/:id/read`
- **Payload**: `{"opened": true, "read_time": 15}`

---

### 3.2 Notifications Endpoints

#### `GET /api/v1/notifications`
- **Description**: Returns all non-archived notifications for the active user, sorted by priority (Critical first) then date.

#### `GET /api/v1/notifications/unread-count`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "count": 5
    }
  }
  ```

#### `PATCH /api/v1/notifications/:id/read`
- **Description**: Marks a specific notification as read.

#### `PATCH /api/v1/notifications/read-all`
- **Description**: Marks all non-archived notifications for the user as read.
