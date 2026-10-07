# Database Seeding Guide

This guide explains how to apply the realistic demo corporate and esports data to populate the Nowhere Esports Intranet backend database.

---

## Footprint Summary

The seed script (`backend/database/seed_data.sql`) populates all 36 tables with the following:

- **1 Organization**: `Nowhere Esports`.
- **3 Offices**: LA HQ, London Operations, and Seoul Training Center.
- **8 Departments**: Esports Ops, HR, Finance, Media, IT, Legal, InfoSec, and Facilities.
- **300 Employees**: Full directory profiles with realistic names, department mappings, manager chains, and contact cards.
- **20 Teams**: Pro and Academy rosters for Valorant, LoL, CS2, Apex, and Rocket League.
- **60 Active Players**: Structured gaming specs, DPI settings, monitor models, and team alignments.
- **12 Tournaments & Matches**: Detailed schedule tables including internal and external competition history.
- **100 Announcements**: Historical log of corporate news.
- **200 Support Tickets**: Open, closed, and in-progress helpdesk tickets with priority tags.
- **100 Knowledge Base Articles**: Standard intranet reference guides for IT, HR, and Operations.

---

## Execution

To seed the database, run the `seed_data.sql` file via the Supabase SQL Editor.

> [!CAUTION]
> Seeding the database will **TRUNCATE** all business tables. Do not execute this script in a production environment.
