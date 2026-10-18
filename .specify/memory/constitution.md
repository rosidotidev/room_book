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
Database schema and seed changes MUST go through versioned migrations (Flyway). Manual or
ad-hoc schema changes are forbidden.

### VI. Problem+JSON Errors
All API errors MUST be returned as `application/problem+json` with a consistent shape, using the
status codes documented in the contract. The UI MUST present them as readable messages.

### VII. Monorepo Layout
The repository is a monorepo with `backend/`, `frontend/` and `specs/` (Spec Kit artifacts and
contract) at the root; `.specify/` holds the constitution and templates.

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

- Backend: Spring Boot REST on Java 21, layered controller/service/repository.
- Frontend: Angular (standalone components).
- Persistence: SQLite, a single file under `backend/data/`.
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

**Version**: 1.0.0 | **Ratified**: 2026-10-18 | **Last Amended**: 2026-10-18
