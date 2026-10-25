# Research: Backend Replacement (Parity Migration)

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-24

Each entry gives the decision, why it was chosen, and what was rejected. Facts about the current service come from reading `backend/src/main/java/com/roombook/**` and from inspecting `backend/data/roombook.db` (read-only).

## Facts gathered from the current service

- **Schema history.** `backend/data/roombook.db` contains `flyway_schema_history` with versions 1 (health probe), 2 (create room), 3 (seed demo rooms), 4 (create booking), all with `success = 1`. Flyway is the tool that applied them (the Spring service uses Flyway, not a custom table). Tables: `health_probe`, `room`, `room_equipment`, `booking`, `sqlite_sequence`.
- **Data.** 6 rooms (Aurora, Borealis, Cirrus, Delta, Everest, Fjord) with equipment; 3 bookings (2 CONFIRMED, 1 CANCELLED), dated 2026-10-19.
- **Time storage.** Instants stored as UTC text truncated to seconds, e.g. `2026-10-19T08:00:00Z`; `created_at` the same format. Returned to clients as `OffsetDateTime` in `Europe/Rome`.
- **Booking checks order.** Fields present (400) → room exists (404) → room active (422) → weekday, hours 08:00–20:00 (inclusive end), 15-minute boundary, same local day, end after start, duration ≤ 4 h, start not before now (400) → overlap with CONFIRMED booking, half-open intervals (409). Cancellation: allowed when `start − now ≥ 60 min`; already CANCELLED returns the booking.
- **Errors.** `ProblemDetail` with titles: "Room not found" 404, "Room name already exists" 409, "Invalid room" 400, "Booking not allowed" 400, "Booking not found" 404, "Slot already booked" 409, "Too late to cancel" 409, "Room not available" 422. Unexpected failures: 500 with a generic detail and no internals.
- **Health.** Writes, reads back and deletes a row in `health_probe` in one transaction; 200 with both statuses UP, or 503 with both reported DOWN (the Java code sets `status` and `database` to the same value).

## R-001 — HTTP framework: NestJS 12 on the Express platform

- **Decision**: `@nestjs/core` 12.x with `@nestjs/platform-express`.
- **Rationale**: Named by the constitution and the change request. Express is the NestJS default and the least surprising for the parity harness.
- **Alternatives**: Fastify (faster, but a different body-parser and error-handling surface, which increases the risk of byte-level differences in parity); NestJS 11 (still maintained, but 12 is the current major on npm, and it is what the spec names; see R-012 for the module system it requires).

## R-002 — Persistence: `better-sqlite3`, no ORM

- **Decision**: `better-sqlite3` 13.x, prepared statements in the repositories, one connection per process.
- **Rationale**: Named in the change request; synchronous API maps directly onto the Spring repositories; SQL stays identical to what the Java code runs, which keeps behaviour comparable. An ORM would add a second schema model next to the versioned SQL files (constitution V).
- **Alternatives**: TypeORM / Prisma (schema drift against V1–V4, rejected); `node:sqlite` (experimental API surface in the target LTS; not chosen for stability).
- **Concurrency**: Node is single-threaded and the driver is synchronous, so a `db.transaction(...).immediate()` (BEGIN IMMEDIATE) makes the overlap check and insert atomic. This satisfies the spec edge case "exactly one of two simultaneous overlapping bookings is confirmed".

## R-003 — Migrations: verify the existing history, apply only new versions

- **Decision**: The runner has two steps.
  1. **Baseline check (every start).** Open the file with `fileMustExist: true` (missing file → refuse, never create, FR-007). If the table `flyway_schema_history` exists, require rows for versions 1–4 with `success = 1`. Compare by version number and success flag only (clarification 3; checksums and descriptions are not compared). Mismatch → refuse with a clear message. No write.
  2. **Apply pending (only if needed).** Versions present in `src/db/migrations/` with a number above 4 (V5+) that are not in the runner's own table `schema_migrations` are applied in order inside a transaction each, and recorded there. The table is created only when there is something to apply, so a copy with no pending versions is never altered.
- **Rationale**: FR-006 forbids re-creating tables or changing recorded history. Using a separate `schema_migrations` table for new versions keeps Flyway's history untouched while still meeting constitution V ("runner that tracks the applied version").
- **Alternatives**: (a) Re-apply V1–V4 through our runner into its own table — rejected: it would duplicate existing tables and would need a bootstrap on a file that already has them. (b) Rewrite `flyway_schema_history` into our format — rejected by FR-006. (c) Use `PRAGMA user_version` — rejected: the copy does not use it and the spec mandates the recorded four versions be recognised.
- **Test-only bootstrap**: A helper in `test/support/test-db.ts` creates a *temporary* database and applies V1–V4 explicitly, so contract tests have fresh data. This path is not reachable from the running service.

## R-004 — Office time: `Intl` instead of a date library

- **Decision**: Use `Intl.DateTimeFormat` with `timeZone: 'Europe/Rome'` (`formatToParts`) to obtain office-local weekday, hour, minute and calendar date; derive the office offset from the same formatter. Keep all arithmetic on epoch milliseconds otherwise.
- **Rationale**: Node ships full ICU; no dependency is added; the rules need only weekday, time-of-day and date, which `Intl` gives reliably including DST transitions (spec edge case: DST does not change opening hours or the 4-hour maximum, which is evaluated on elapsed time, as Java does with `Duration.between`).
- **Alternatives**: `date-fns-tz` / `luxon` (extra dependency for a small surface); `Temporal` (not guaranteed on the LTS runtime yet).

## R-005 — Serialization of times

- **Decision**: Bookings serialize `start`, `end`, `createdAt` as `YYYY-MM-DDTHH:mm:ss±HH:MM` in office time (what Jackson produces for `OffsetDateTime`). Health `time` serializes as the UTC instant in ISO form with the `Z` suffix (what Jackson produces for `Instant`; fractional seconds, if any, are checked by the replay).
- **Rationale**: Parity requires byte-equal bodies in the replay. The exact Jackson output must be confirmed against the Spring service during the parity run, so the formatter is written against recorded responses, not against assumptions.
- **Resolved (parity replay, recorded responses)**: the Spring health `time` is `java.time` ISO_INSTANT with a nanosecond fraction when non-zero, for example `2026-10-24T12:11:01.280927100Z`. The fraction has 0, 3, 6 or 9 digits, and is omitted when zero. `HealthService` reproduces this with millisecond precision (a JavaScript `Date`): `.SSSZ`, or no fraction when the milliseconds are zero. The replay compares `time` by shape (fraction presence and `Z`), because the value depends on the run. Booking times and `createdAt` are whole seconds with the office offset (`+01:00` or `+02:00`) and are compared exactly (`createdAt` by shape).

## R-006 — Validation and error mapping

- **Decision**: Controllers pass the parsed body to services; services perform the same checks and produce the same messages as the Java services (e.g. `name is required.`, `title must be at most 100 characters.`). A single `@Catch()` filter maps domain errors and `HttpException`s to the status and title table above and writes `application/problem+json`. Malformed JSON and unknown routes return 400 and 404 respectively with problem bodies; the exact detail text for these two framework-level cases is taken from the replay.
- **Rationale**: Constitution III (rules live in services) and VI (one error shape). The contract says the detail "names the invalid field" for 400s, which the service-level messages satisfy.
- **Alternatives**: `class-validator` + `ValidationPipe` (its messages differ from the Java ones, which would break parity; rejected for the body rules, though it is acceptable for future features).
- **Resolved (parity replay, recorded responses)**: the framework-level answers are fixed as follows. All use `application/problem+json`, `type` `about:blank` and `instance` = request path.
  - Body that Jackson cannot bind (malformed JSON, missing body, wrong scalar type such as `capacity: "abc"` or a non-offset time, or an unrecognised boolean): 400, title `Bad Request`, detail `Failed to read request`. Spring binds the whole body before any rule runs, so `backend-nest/src/common/json-binding.ts` binds all fields first and then the services apply the business rules. Numeric and boolean scalars are coerced the way Jackson coerces them (`"5"` is 5, `"true"` is true, `5` as text is `"5"`).
  - Unknown route: 404, title `Not Found`, detail `No endpoint <METHOD> <path>.` (the query string is not included).
  - Path exists for other methods (for example `GET /api/rooms` with `DELETE`, or `GET /api/rooms/abc`): 405, title `Method Not Allowed`, detail `Method '<METHOD>' is not supported.`, with an `Allow` header. Implemented in `backend-nest/src/common/problem.filter.ts` from the Express router.
  - Path or query value that cannot be converted: 400, title `Bad Request`, detail `Failed to convert '<name>' with value: '<raw>'`. A required query parameter that is absent: 400, detail `Required parameter '<name>' is not present.`
  - Business errors keep the Java messages and titles from the table above.
- Resolution: `backend-nest/src/app-setup.ts` installs the JSON parser so that invalid JSON reaches the filter with the framework text instead of the parser's own message. The replay (`backend-nest/parity/`) compares every status, media type and body across 99 requests, with zero differences after the fixes.

## R-007 — Clock

- **Decision**: An injection token `CLOCK` with a provider returning `SystemClock` (`() => new Date()`) by default. `FixedClock` is selected when `ROOMBOOK_CLOCK_FIXED_AT` is set. Only the Clock provider reads the system time.
- **Rationale**: Constitution IV; spec FR-015. The env override is used only by the parity harness.
- **Consequence for parity**: The Spring service uses `Clock.systemDefaultZone()` and cannot be frozen without changing it, and the change request forbids changing the Spring code. So parity requests are written to be time-robust (dates far in the future for successful bookings; a fixed past date for "in the past"; cancellations of bookings far ahead). The fixed-clock boundary cases (59 vs 60 minutes, exact start equals now) are covered in Jest with the fixed clock, not in the replay.

## R-008 — Contract tests

- **Decision**: Load `specs/001-project-setup/contracts/openapi.yaml` with `yaml`, resolve `$ref`s in `components`, compile schemas with `ajv` (+ `ajv-formats` for `date-time` and `date`). Each contract test calls the app with supertest, asserts the status code, `content-type`, and validates the body against the response schema. Request bodies are validated against `RoomInput`/`BookingInput`/`ActiveChange` before sending, so the tests also prove the contract's input shapes. A baseline test compares the file's SHA-256 with a value stored in `test/contract/contract-baseline.sha256`.
- **Rationale**: Constitution II; spec FR-002 and SC-002. Mirrors the existing approach of `specs/003-rooms-ui/contract-baseline.sha256`.
- **Alternatives**: `openapi-backend` or `swagger-request-validator` (the Java-era tool). Rejected: a small `ajv` harness covers the same ground with fewer moving parts and no OpenAPI runtime routing that could diverge from the Nest controllers.

## R-009 — Parity harness

- **Decision**: `backend-nest/parity/` holds a JSON file of at least 50 recorded requests (method, path, body, expected status, content type, body). `replay.ts` runs them against two base URLs (the Spring service on `:8080` and the Nest service on another port) each started on its own identical copy of the database; `compare.ts` reports the first difference per request. Requests are time-robust as explained in R-007. Clarification 1 is the acceptance rule.
- **Rationale**: The frontend has no automated tests, so a recorded replay is the only way to show "indistinguishable" (spec SC-001, SC-003).
- **Alternatives**: Running the frontend's own tests against the new service (rejected: none exist); comparing only with contract tests (rejected: contract tests cannot show byte-level equality with the old service).

## R-010 — Health

- **Decision**: `HealthService` runs the write/read/delete round trip on `health_probe` inside a transaction; on any exception `database = DOWN`, status mirrors it; the controller returns 200 for UP and 503 for DOWN, with the `HealthReport` body. Same probe table as V1.
- **Rationale**: Matches the current behaviour (FR-018) and the contract (`/api/health`).

## R-011 — Quickstart: one command

- **Decision**: `npm start` in `backend-nest/` runs a `prestart` build and then `node dist/main.js`. The one-time database copy is a documented step, not automated (spec assumption). If the copy is missing the process exits with the path and the copy command; it never creates an empty file. The root `start-backend.bat` is updated to call the same command during implementation.
- **Rationale**: Meets the user's request for a single start command while keeping the copy an explicit operator action (spec assumption, FR-005/FR-007).

## R-012 — Module system: ES modules

- **Decision**: `backend-nest/` is an ES module package: `"type": "module"` in `package.json`, TypeScript `module` and `moduleResolution` set to `NodeNext`, relative imports written with a `.js` extension (TypeScript maps them to the `.ts` sources), `import.meta.url` instead of `__dirname`. Jest runs in ES module mode (`ts-jest` with `useESM`, scripts started with `node --experimental-vm-modules`). The parity script loads TypeScript through `node --loader ts-node/esm`.
- **Rationale**: `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` and `@nestjs/testing` 12.x are published as ES modules only (`"type": "module"`). A CommonJS package cannot load them: Jest failed with "Must use import to load ES Module" before any route was reached, and `node dist/main.js` would fail the same way. Keeping NestJS 12, as R-001 and the spec require, forces the module change.
- **Alternatives**: Pin NestJS 11 (ships CommonJS), rejected because it contradicts R-001 and the spec's `12.x`. Use a bundler or a Babel transform to produce CommonJS, rejected as an extra build layer for a single service.

## R-013 — DTO files per module and transaction ownership (amendment 2026-10-24)

- **Decision**: one `<module>.dto.ts` per module (`rooms.dto.ts`, `bookings.dto.ts`, `health.dto.ts`) holding nullable input types bound by the controller and output types. `booking.mapper.ts` is merged into `bookings.dto.ts`. Transactions are opened only in `RoomsService`, `BookingsService` and `HealthService`; repositories run single statements.
- **Rationale**: follows the DTO pattern already recorded in specs 002 and 004 (`RoomDto`, `BookingDto`), so the structure is the same across the migration. Constitution III puts the rules and the transaction boundary in the service; a repository that opens a transaction would fix the boundary below the business rule and would make a rule that spans two repository calls impossible to keep atomic.
- **Alternatives considered**: keeping the transactions in the repositories (rejected: the boundary would sit under the rule); a separate DTO file per type (rejected: more files, no gain, the specs use one file per module); `class-validator` DTOs (rejected by R-006: it would move rules into the web layer and change the detail text).
- **Assumptions recorded**: the migration runner is infrastructure outside the service layer and keeps its transaction; the root `booking.mapper.ts` is removed in favour of `bookings.dto.ts`.

## Resolved NEEDS CLARIFICATION

None remained: the spec was clarified on 2026-10-24 (three questions) and the technical context needed no further input.

## Open points carried to tasks

1. Resolved in the parity replay: the health `time` fraction format (R-005) and the framework detail texts for malformed JSON, conversion and unknown or wrong-method routes (R-006).
2. Resolved: an unknown route returns 404 with a problem body (`throw-exception-if-no-handler-found: true`). A known path with another method returns 405, which the spec did not mention and the replay surfaced.
