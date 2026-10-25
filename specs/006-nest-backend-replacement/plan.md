# Implementation Plan: Backend Replacement (Parity Migration)

**Branch**: `006-nest-backend-replacement` (no branch created; no branch hook registered) | **Date**: 2026-10-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-nest-backend-replacement/spec.md`

## Summary

Re-implement the RoomBook HTTP service currently in `backend/` (Spring Boot 3 / Java 21) as a NestJS service in `backend-nest/`, with no visible change. The API contract `specs/001-project-setup/contracts/openapi.yaml` and the frontend stay untouched. The new service reads and writes only a copy of `backend/data/roombook.db`, whose schema history (Flyway table `flyway_schema_history`, versions 1–4) it verifies without modifying. Technical approach: controller / service / repository per module (rooms, bookings), a `Clock` provider injected everywhere time matters, a global exception filter producing `application/problem+json`, `better-sqlite3` for persistence, an internal SQL migration runner, Jest + supertest contract tests validated against the OpenAPI document, a parity harness that replays at least 50 recorded requests against both services, and a one-command quickstart. Decisions and their rationale are in [research.md](./research.md); entities in [data-model.md](./data-model.md); run instructions in [quickstart.md](./quickstart.md).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) on Node.js 24 LTS (the installed v24.15.0 is the reference runtime; `engines` pins `>=22` as required by `better-sqlite3`). The package is ES modules (`"type": "module"`, TypeScript `module`/`moduleResolution` `NodeNext`, relative imports end in `.js`), because NestJS 12 ships only as ES modules (research.md, R-012).

**Primary Dependencies**: `@nestjs/core` / `@nestjs/common` / `@nestjs/platform-express` 12.x; `better-sqlite3` 13.x; `yaml` (to load the OpenAPI document in tests); `ajv` + `ajv-formats` (JSON Schema validation of request/response bodies in contract tests). No ORM. No date library: office-time arithmetic uses the built-in `Intl.DateTimeFormat` (see research.md, R-004).

**Storage**: SQLite single file. Default path `backend-nest/data/roombook.db`, overridable with `ROOMBOOK_DB_PATH`. Schema from the existing `V1__`–`V4__` SQL files (copied verbatim from `backend/src/main/resources/db/migration/` into `backend-nest/src/db/migrations/`). Times stored as UTC text `yyyy-MM-ddTHH:mm:ssZ`, as today.

**Testing**: Jest 30 (ES module mode through ts-jest, run with `node --experimental-vm-modules`) + supertest 7 and `@nestjs/testing` 12.x for contract, unit and integration tests; a separate parity harness (`backend-nest/parity/`) that replays a recorded request set against both services on identical data copies and compares status, content type and body.

**Target Platform**: Windows 11 developer machine (reference) and Linux server; HTTP on port 8080 (matches `servers.url` of the contract).

**Project Type**: web-service (backend) within a monorepo; the Angular frontend is consumed unchanged.

**Performance Goals**: Parity, not throughput. The room list and day availability must answer within the same order of magnitude as the Spring service on the demo data (6 rooms, 3 bookings); no explicit SLO is added (no new requirement in the spec).

**Constraints**:
- The contract file must stay byte-identical (SC-002, verified by SHA-256 in a test).
- The service must never modify the database file it is pointed at unless a *new* migration version (V5+) is pending; it must refuse to start on a missing file, or when versions 1–4 are not recorded as successful (FR-007).
- Times evaluated in `Europe/Rome`; serialized with the office offset (FR-017).
- All time-dependent code uses the injectable `Clock` (constitution IV).
- Single process, single SQLite connection; check-and-insert of a booking runs in one `BEGIN IMMEDIATE` transaction opened by `BookingsService` (spec edge case: concurrent overlap → exactly one confirmed).
- Transactions are opened only in services (`RoomsService`, `BookingsService`, `HealthService`) (FR-023). Repositories execute single statements and never open a transaction. The migration runner is infrastructure outside the service layer and keeps its own transaction.
- Each module keeps its data transfer shapes in one DTO file (`<module>.dto.ts`): nullable input types bound from the request, and output types (FR-022). DTOs hold no business rule.

**Scale/Scope**: 2 modules (rooms, bookings) + health; 9 operations in the contract (`/api/health` GET, `/api/rooms` GET/POST, `/api/rooms/{id}` PUT, `/api/rooms/{id}/active` PATCH, `/api/bookings` GET/POST, `/api/bookings/{id}` DELETE, `/api/rooms/{id}/availability` GET). Expected test volume: ≥ 50 parity requests, a contract test per operation and per documented status code.

## Constitution Check

*GATE: checked before Phase 0 and re-checked after Phase 1 design.*

| Principle | Status | How this plan complies |
|-----------|--------|------------------------|
| I. API-First | PASS | Contract not modified; a SHA-256 baseline test fails the build if `openapi.yaml` changes (same pattern as `specs/003-rooms-ui/contract-baseline.sha256`). |
| II. Contract Tests for Every Endpoint | PASS | Contract test suite covers all 7 operations and every documented status (200, 201, 400, 404, 409, 422, 503). Request and response bodies validated with `ajv` against the schemas in the contract. |
| III. Business Rules in Service Layer | PASS | Controllers only map HTTP to service calls; all rules (hours, overlaps, cancellation window, deactivated rooms, name/capacity/equipment rules) live in `*.service.ts`. Transactions are opened in services only (FR-023), so the repositories hold no rule and no transaction boundary. DTO files (`*.dto.ts`) hold shapes only, no rule (FR-022). |
| IV. Deterministic Time | PASS | A `CLOCK` injection token (provider) wraps `() => Instant`; no `Date.now()` or `new Date()` outside the Clock provider. Tests inject a fixed clock. The services read time only through the injected Clock, and the DTO and repository layers never read the time. |
| V. Versioned Migrations Only | PASS | V1–V4 reused as-is. An internal runner (no framework) verifies the baseline and applies pending versions recorded in its own `schema_migrations` table. No ad-hoc DDL. |
| VI. Problem+JSON Errors | PASS | One global exception filter; every error body is `application/problem+json` with `title`, `status`, `detail`. |
| VII. Monorepo Layout | PASS | `backend-nest/`, `frontend/`, `specs/` at root; `backend/` kept untouched (spec FR-021); cutover is a separate, later decision and not in the tasks. |
| VIII. No Authentication | PASS | No auth added. |
| IX. Responsive UI | N/A | Frontend not modified. |
| X. Single Design System | N/A | Frontend not modified. |
| XI. Accessibility Baseline | N/A | Frontend not modified. |
| Technical Constraints | PASS | NestJS on Node LTS with TypeScript in `backend-nest/`; SQLite via `better-sqlite3`; file under `backend-nest/data/` or configurable path. |

**Gate result**: PASS. No violations, so Complexity Tracking stays empty. Post-design re-check (after data-model.md, contracts/ and quickstart.md): still PASS.

## Project Structure

### Documentation (this feature)

```text
specs/006-nest-backend-replacement/
├── spec.md              # Feature specification (clarified 2026-10-24)
├── plan.md              # This file
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 entities, SQL mapping, validation, state
├── quickstart.md        # One-command start and validation guide
├── contracts/
│   └── README.md        # Pointer to the frozen contract + status mapping table
├── checklists/
│   └── requirements.md
└── tasks.md             # Created by /speckit-tasks, not by this command
```

### Source Code (repository root)

```text
backend-nest/
├── package.json                      # scripts: start (one command), build, test, test:contract, parity
├── tsconfig.json
├── jest.config.ts
├── data/                             # default location of the database copy (git-ignored)
├── src/
│   ├── main.ts                       # bootstrap: runs migration check, listens on PORT (8080)
│   ├── app.module.ts
│   ├── config/
│   │   ├── config.ts                 # ROOMBOOK_DB_PATH, ROOMBOOK_OFFICE_ZONE=Europe/Rome, PORT
│   │   └── clock.provider.ts         # CLOCK token; SystemClock by default; FixedClock when ROOMBOOK_CLOCK_FIXED_AT is set (parity runs only)
│   ├── db/
│   │   ├── database.provider.ts      # opens better-sqlite3 handle; refuses missing file
│   │   ├── migration-runner.ts       # baseline check on flyway_schema_history; applies pending V5+
│   │   └── migrations/               # V1__health_probe.sql … V4__create_booking.sql (copied verbatim)
│   ├── common/
│   │   ├── problem.ts                # DomainError base + status/title mapping
│   │   ├── problem.filter.ts         # global @Catch filter → application/problem+json
│   │   └── office-time.ts            # office-zone helpers (weekday, hour, offset) via Intl
│   ├── health/
│   │   ├── health.controller.ts
│   │   ├── health.dto.ts             # HealthReport output type
│   │   ├── health.service.ts         # owns the write/read/delete transaction on health_probe
│   │   └── health-probe.repository.ts # single statements only, no transaction
│   ├── rooms/
│   │   ├── rooms.module.ts
│   │   ├── rooms.controller.ts       # HTTP mapping only; binds the body into RoomInput
│   │   ├── rooms.dto.ts              # RoomInput, ActiveChange (inputs, nullable); Room, RoomActivationResult, BookingSummary (outputs)
│   │   ├── rooms.service.ts          # name/capacity/equipment rules, activation; owns room write transactions
│   │   └── rooms.repository.ts       # SQLite access to room and room_equipment; single statements only
│   └── bookings/
│       ├── bookings.module.ts
│       ├── bookings.controller.ts    # HTTP mapping only; binds the body into BookingInput
│       ├── bookings.dto.ts           # BookingInput (nullable); Booking (output); replaces booking.mapper.ts
│       ├── booking-rules.ts          # time rules (weekday, hours, boundaries, same day, duration, past, cancel window)
│       ├── bookings.service.ts       # create / availability / byOrganizer / cancel; owns the BEGIN IMMEDIATE transactions
│       └── bookings.repository.ts    # SQLite access to booking; single statements only
├── test/
│   ├── contract/                     # supertest + ajv against specs/001-project-setup/contracts/openapi.yaml
│   │   ├── openapi-loader.ts
│   │   ├── contract-baseline.spec.ts # SHA-256 of openapi.yaml
│   │   ├── health.contract.spec.ts
│   │   ├── rooms.contract.spec.ts
│   │   ├── bookings.contract.spec.ts
│   │   └── errors.contract.spec.ts
│   ├── unit/
│   │   ├── booking-rules.spec.ts     # fixed Clock; every rule at its boundary
│   │   └── rooms.service.spec.ts
│   ├── startup/
│   │   └── migration-runner.spec.ts  # copy accepted; missing/mismatched refused; no byte of the file changed
│   └── support/
│       ├── test-db.ts                # builds a temp DB from V1–V4 (test-only bootstrap)
│       └── fixed-clock.ts
└── parity/
    ├── recorded-requests.json        # ≥ 50 recorded requests with expected status/body from the Spring service
    ├── replay.ts                     # sends the same requests to two base URLs on identical copies
    └── compare.ts                    # status, content type, body; prints the first difference

backend/                              # legacy Spring Boot service, untouched until cutover
frontend/                             # unchanged
```

**Structure Decision**: One NestJS application in `backend-nest/` with one module per domain area (`rooms`, `bookings`) plus `health`, each split into controller / service / repository plus one `<module>.dto.ts` file, as required. The DTO layer follows the pattern of specs 002 and 004 (one DTO file per module, input and output records). Amendment 2026-10-24: transactions are owned by the services only; the repositories are reduced to single statements. Cross-cutting pieces (problem filter, Clock, migration runner, database provider) live in `common/`, `config/` and `db/`. The contract stays at its current location (`specs/001-project-setup/contracts/`) and is read from there, not copied, so there is a single source of truth (constitution I).

## Complexity Tracking

> Not applicable: no Constitution Check violation.
