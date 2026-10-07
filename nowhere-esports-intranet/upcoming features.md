# Nowhere Esports Intranet

This file is kept as a short pointer for the legacy intranet folder. The upgraded target architecture is now documented in:

- [../docs/nowhere-esports-intranet-architecture.md](../docs/nowhere-esports-intranet-architecture.md)

## Target Upgrade

The next intranet version is planned as a React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Express.js, and Supabase application. It includes:

- Supabase Auth with role-based access control.
- Supabase PostgreSQL with RLS-backed domain tables.
- Supabase Realtime for notifications, match updates, chat, and security alerts.
- Supabase Storage for legitimate files and safe decoy documents.
- VIGILANCE telemetry integration for monitored deception routes and assets.

## Legacy Setup

1. Install dependencies: `npm install`
2. Set up environment: copy `.env.example` to `.env` and fill in values.
3. Seed the database: `npm run seed`
4. Start dev server: `npm run dev`
