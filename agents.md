# Agent Instructions & Guidelines

This document provides rules, conventions, and architectural context for any AI agent or developer contributing to this repository.

---

## 1. Core Directives

### Endpoint Testing & Validation
- **Write tests for all endpoints that you create, and always validate that these endpoints are working properly.**
- When adding backend API endpoints (e.g. Express `/api/*`) or database service methods (`src/services/db.ts`):
  - Write test suites covering success states (200/201), bad inputs (400), unauthorized requests (401/403), and missing records (404).
  - Run the tests to verify they pass before finalizing changes.

### User Data Isolation & Security
- **Strict User Scoping**: Every task, note, and subtask query **MUST** be scoped to the authenticated `userId`.
- Never allow one user to read, modify, or delete another user's records.
- Passwords must never be stored in plain text (use SHA-256 or bcrypt) and must never be exposed in client state or API responses.

### Data Safety & Non-Destructive Migrations
- **Never wipe the user's database or drop tables** during updates or feature additions.
- Database schema changes must use non-destructive migrations (e.g., `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN ...`).
- Provide fallback values for columns added to existing databases so user data is never corrupted across app updates.

---

## 2. UI & Design Standards (Production Readiness)

- **Clean End-User UI**:
  - Do not add technical debug panels, internal log viewers, or database query consoles into the user interface unless explicitly requested.
  - Never display developer jargon (e.g., "Powered by SQLite WASM engine") in consumer-facing text.
- **No Blocking Alerts**:
  - Never use `window.alert()`, `window.confirm()`, or `window.prompt()` (they freeze browser iframes and produce bad UX). Use clean modal dialogs or inline status messages instead.
- **Responsive & Accessible**:
  - All interfaces must remain fully responsive and usable across mobile devices, tablets, and desktop displays.
  - Interactive elements must have adequate click targets and visible focus/hover states.

---

## 3. Technology Stack & Architecture

- **Framework**: React 19 + TypeScript (Strict mode)
- **Bundler**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React (`lucide-react`)
- **Storage Engine**: Self-contained SQLite via `sql.js` (`sql-asm.js`), persisted to IndexedDB
- **State Flow**: Centralized database service (`src/services/db.ts`) with pub/sub listener pattern triggering UI updates

---

## 4. Development & Verification Checklist

Before considering any task or feature completed, every agent must:

1. **Verify Types & Linting**:
   - Run `npm run lint` (`tsc --noEmit`) to verify zero TypeScript errors.
2. **Verify Production Build**:
   - Run `npm run build` (`vite build`) to ensure the application compiles cleanly for production deployment.
3. **Check Backwards Compatibility**:
   - Verify that existing tasks, subtasks, notes, and user accounts load correctly without crashing or requiring a database reset.
