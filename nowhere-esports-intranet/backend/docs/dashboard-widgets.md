# Personalized Dashboard & Widgets Specification

This document outlines the role-scoped configurations, responsive widgets system, performance optimization guidelines, and SuperAdmin monitoring stats for the **Nowhere Esports Intranet Dashboard**.

---

## 1. Dashboard Architecture

The dashboard acts as the unified landing page (`GET /api/v1/dashboard`) for all employees. Because it aggregates data from multiple domains (Announcements, Notifications, Profiles, and Audits), the service layer uses **concurrent promise resolution** (`Promise.all`) to execute queries in parallel and achieve responses in **<200ms**.

### 1.1 Response Payload Structure
The payload is divided into common widgets (announcements, notifications, calendar events, birthdays) and role-specific stats or administration widgets:
```json
{
  "success": true,
  "data": {
    "announcements": [...],
    "notifications": [...],
    "birthdays": [...],
    "meetings": [],
    "tasks": [],
    "statistics": {
      // Role-specific metrics block
    }
  }
}
```

---

## 2. Role-Scoped Widgets

### 2.1 Employee Dashboard
- **Target Audience**: Default for all esports players, staff, and general contributors.
- **Widgets**:
  - **Announcements Feed**: Shows up to 5 pinned/latest announcements matching their target visibility.
  - **Inbox Notifications**: Shows the 5 latest unread notifications.
  - **Today's Meetings / Tournaments**: Upcoming match events and scheduled calendar entries (placeholder API).
  - **Birthdays Widget**: Shows colleagues celebrating birthdays today/this week.
  - **Assigned Tasks**: Placeholder list of pending internal tasks.
  - **Quick Links**: Access to documents, support portal, and rules.

### 2.2 Manager Dashboard
- **Target Audience**: Team leads, department heads, and managers.
- **Widgets**:
  - *All Employee widgets*, plus:
  - **Team Overview Stats**:
    - `teamCount`: Total member headcount under their managed team.
    - `activeRequests`: Number of pending support tickets or approvals from team members.

### 2.3 Executive Dashboard
- **Target Audience**: Corporate leadership (CEO, CFO, directors).
- **Widgets**:
  - *All Employee widgets*, plus:
  - **Company Growth Stats**:
    - `companyHeadcount`: Global employee count.
    - `departmentDistribution`: Counts grouped by department.
    - `announcementReadRate`: Ratio of read-to-published announcements.

### 2.4 HR Dashboard
- **Target Audience**: Human Resources specialists.
- **Widgets**:
  - *All Employee widgets*, plus:
  - **Workforce Metrics**:
    - `totalEmployees`: Active contract count.
    - `onboardingPendings`: Onboarding queue count.
    - `recentHires`: Hires in the last 30 days.

### 2.5 SuperAdmin Dashboard
- **Target Audience**: Technical administrators and system developers.
- **Widgets**:
  - *All Employee widgets*, plus:
  - **Infrastructure & Monitoring Stats**:
    - `dbHealth`: Database connectivity check status (`Healthy`).
    - `storageUsage`: Static assets and document storage metrics (e.g., `12.4 GB`).
    - `realtimeConnections`: Active WebSocket subscribers to Supabase Realtime channel.
    - `recentErrorsCount`: Logs from audit trail showing internal critical failures.

---

## 3. GET /dashboard/widgets Configuration

Clients can request the configuration array for the UI layout layout via `GET /api/v1/dashboard/widgets`.
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      { "id": "announcements", "title": "Company Announcements", "size": "large" },
      { "id": "notifications", "title": "My Notifications", "size": "medium" },
      { "id": "birthdays", "title": "Colleagues Birthdays", "size": "small" },
      { "id": "quick_links", "title": "Quick Access Links", "size": "small" }
    ]
  }
  ```
- If the user has `manager`, `executive`, `hr`, or `admin`/`super_admin` roles, additional custom widget layout configs are pushed to the list.
