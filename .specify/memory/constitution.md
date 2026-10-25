<!--
SYNC IMPACT REPORT (temporary, remove before commit)
Version change: 1.0.0 → 1.1.0 (MINOR)
Modified principles:
- V. Versioned Migrations Only: "(Flyway)" replaced by versioned SQL migrations run by an internal runner.
- VII. Monorepo Layout: root folders now backend-nest/, frontend/, specs/; backend/ kept only during migration.
Modified sections:
- Technical Constraints: backend stack changed from Spring Boot/Java 21 to NestJS/Node.js LTS/TypeScript;
  persistence changed from path backend/data/ to backend-nest/data/ (or configurable) via better-sqlite3.
- Governance: amendment rationale recorded.
Added sections: none. Removed sections: none.
Unchanged principles: I, II, III, IV, VI, VIII, IX, X, XI.
Deferred TODOs: none.
Templates: not modified. Dependent specs 001–005 still describe the Spring implementation (history, not rewritten).
-->

# RoomBook Constitution

## Core Principles

### I. API-First (NON-NEGOTIABLE)
The OpenAPI document (`specs/**/openapi.yaml`, published as one contract) is the single source of
truth for the HTTP API. Any API change MUST be made in the OpenAPI document before any backend or
frontend code is written. The frontend client is generated from it, never hand-written.

### II. Contract Tests for Every Endpoint
Every endpoint MUST have contract tests that validate request/response shapes and every documented
status code against the OpenAPI document. An endpoint without contract tests is not done.

### III. Business Rules Live in the Service Layer
Business rules MUST be implemented in the backend service layer. Controllers only map HTTP to
service calls; the frontend MAY pre-check obvious input errors but the backend is the authority.

### IV. Deterministic Time
All time-dependent logic MUST use an injectable `Clock`. Code MUST NOT call `now()` without a
clock. Tests MUST use a fixed clock so results are deterministic.

### V. Versioned Migrations Only
Database schema and seed changes MUST go through versioned SQL migrations (`V1__`, `V2__`, ...),
applied in order by an internal migration runner that records each applied version. No external
migration framework is used. Manual or ad-hoc schema changes are forbidden.

### VI. Problem+JSON Errors
All API errors MUST be returned as `application/problem+json` with a consistent shape, using the
status codes documented in the contract. The UI MUST present them as readable messages.

### VII. Monorepo Layout
The repository is a monorepo with `backend-nest/`, `frontend/` and `specs/` (Spec Kit artifacts and
contract) at the root; `.specify/` holds the constitution and templates. During the migration from
Spring Boot, the legacy `backend/` folder MAY remain at the root; it MUST be removed at cutover.

### VIII. No Authentication
Authentication, roles, notifications, recurring bookings, external calendars and multi-site are
out of scope. Organizer and administrator actions are unauthenticated free-text/open screens.

### IX. Responsive, Mobile-First UI
Every screen MUST work on a phone (360 px wide), a tablet and a desktop browser. CSS is
mobile-first with breakpoints at 600 px and 1024 px. Touch targets MUST be at least 44 px.

### X. Single Design System
The UI MUST follow one shared design system based on design tokens (color, typography, spacing,
radius, elevation) defined once as CSS custom properties and never hard-coded in components.
The visual tone is professional and corporate, in the style of a modern marketing agency.

### XI. Accessibility Baseline
WCAG 2.1 AA contrast, full keyboard navigation and visible focus are required. State MUST never
be conveyed by color alone (add a label or icon).

## Technical Constraints

- Backend: NestJS REST on Node.js LTS with TypeScript, layered controller/service/repository,
  located in `backend-nest/`.
- Frontend: Angular (standalone components).
- Persistence: SQLite via `better-sqlite3`, a single file under `backend-nest/data/` or at a
  configurable path.
- Time zone and business hours are defined in the specs and applied in the service layer.

## Development Workflow

- Each macro feature follows the Spec Kit cycle: specify, clarify, plan, checklist, tasks,
  analyze, implement, converge (repeat implement/converge until "Converged").
- The contract is changed first, then tests, then code.
- Features that declare the contract fixed MUST NOT modify `openapi.yaml` (verify with a diff).

## Governance

This constitution supersedes other practices. Amendments require a documented rationale, a
version bump (semantic versioning) and review of dependent specs/plans. All plans and reviews
MUST verify compliance with these principles; deviations MUST be justified in the plan's
complexity tracking.

### Amendment History

- **1.1.0 (2026-10-24), MINOR**: Backend migrated from Spring Boot to NestJS to reduce the stack to
  one language (TypeScript) across backend and frontend tooling and to use the team's Node.js
  skills. The principles' intent is unchanged: API-first, contract tests, service-layer rules,
  injectable clock, versioned migrations and monorepo layout remain. Only the named tools changed
  (Flyway → internal SQL migration runner; `backend/` → `backend-nest/`). Bumped MINOR because no
  principle was removed or made incompatible in intent; the change is a materially expanded
  technical constraint and a clarified migration mechanism.

**Version**: 1.1.0 | **Ratified**: 2026-10-18 | **Last Amended**: 2026-10-24
