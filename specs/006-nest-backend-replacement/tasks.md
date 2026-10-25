# Tasks: Backend Replacement (Parity Migration)

**Input**: Design documents from `/specs/006-nest-backend-replacement/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md, `.specify/memory/constitution.md`

**Tests**: Included. Constitution II requires contract tests for every endpoint, and the user asked for contract tests to be written before the code.

**Organization**: Phases follow the order requested by the user (scaffolding and migration runner → contract tests → rooms and bookings implementation → parity). Within the implementation and test phases, tasks carry the spec's user-story labels (US1–US5) for traceability.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task in the same phase)
- **[Story]**: US1 frontend room screens · US2 existing data through a database copy · US3 booking rules · US4 error format · US5 health check. Setup, runner and parity tasks carry no story label unless they verify one story.

## Hard constraints for every task

- **No task modifies `specs/001-project-setup/contracts/openapi.yaml`.** It is read only. Its SHA-256 is checked by T023 and T060.
- **No task modifies `frontend/`** (FR-003).
- **No task modifies `backend/`** (the Spring service stays as the parity reference until cutover).
- **Never write to `backend/data/roombook.db`.** Every run uses a copy under `backend-nest/data/` or `backend-nest/parity/work/`, both git-ignored.
- Business messages (`detail` text) must be copied from the Java services in `backend/src/main/java/com/roombook/**`, not invented.

---

## Phase 1: Scaffolding and migration runner

**Purpose**: Create `backend-nest/`, the configuration and clock, the copied migrations, the database opener, and the baseline-verifying migration runner. Runner tests are written before the runner they test.

**Checkpoint**: `npm --prefix backend-nest run build` succeeds; the startup tests pass; the service refuses to start on a missing or mismatched database.

- [X] T001 Create `backend-nest/package.json`: `"private": true`, `"type": "module"` (ES modules, research R-012), `engines.node` `">=22"`; dependencies `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` (12.x), `better-sqlite3` (13.x), `yaml`, `ajv`, `ajv-formats`; devDependencies `typescript` 5.x, `jest` 30, `ts-jest`, `@types/jest`, `@types/node`, `@types/better-sqlite3`, `supertest` 7, `@types/supertest`, `ts-node`, `@nestjs/testing` 12.x; scripts `build` (`tsc -p tsconfig.json`), `prestart` (`npm run build`), `start` (`node dist/main.js`), `test` (`node --experimental-vm-modules node_modules/jest/bin/jest.js`), `test:contract` (same, with `test/contract`), `parity` (`node --loader ts-node/esm parity/replay.ts`)
- [X] T002 [P] Create `backend-nest/tsconfig.json`: strict mode, `rootDir: src`, `outDir: dist`, `module: NodeNext`, `moduleResolution: NodeNext`, `target: ES2022`, `experimentalDecorators` and `emitDecoratorMetadata` on
- [X] T003 [P] Create `backend-nest/jest.config.ts`: ts-jest in ES module mode (`useESM`, `extensionsToTreatAsEsm: ['.ts']`, a `moduleNameMapper` that maps `.js` imports to `.ts`), `testEnvironment: node`, `testRegex: ".*\\.spec\\.ts$"`, `rootDir: "."` inside `backend-nest/`
- [X] T004 [P] Create `backend-nest/.gitignore` with `node_modules/`, `dist/`, `data/`, `parity/work/`
- [X] T005 Create `backend-nest/src/config/config.ts`: reads `ROOMBOOK_DB_PATH` (default `backend-nest/data/roombook.db`, resolved from the package root), `ROOMBOOK_OFFICE_ZONE` (default `Europe/Rome`), `PORT` (default `8080`), and optional `ROOMBOOK_CLOCK_FIXED_AT`
- [X] T006 [P] Create `backend-nest/src/config/clock.provider.ts`: exports `CLOCK` injection token and `interface Clock { now(): Date }`; `SystemClock` by default; `FixedClock` when `ROOMBOOK_CLOCK_FIXED_AT` is set. This is the only file allowed to call `new Date()` without an argument.
- [X] T007 [P] Create `backend-nest/test/support/fixed-clock.ts`: a `FixedClock` class with a settable instant, used by unit and contract tests
- [X] T008 Copy migrations verbatim: `backend/src/main/resources/db/migration/V1__health_probe.sql`, `V2__create_room.sql`, `V3__seed_demo_rooms.sql`, `V4__create_booking.sql` into `backend-nest/src/db/migrations/` with the same names. Verify each copy's SHA-256 equals its source.
- [X] T009 [P] Create `backend-nest/src/common/office-time.ts`: helpers built on `Intl.DateTimeFormat` with `timeZone: 'Europe/Rome'` and `formatToParts`: `officeWeekday(instant)` (Monday = 1 … Sunday = 7), `officeMinutesOfDay(instant)`, `officeDate(instant)` (`yyyy-MM-dd`), `officeOffset(instant)` (`+HH:MM`), and `formatOfficeDateTime(instant)` (`YYYY-MM-DDTHH:mm:ss±HH:MM`, seconds kept, no fractional part)
- [X] T010 [P] Create `backend-nest/test/support/test-db.ts`: creates a temporary SQLite file under the OS temp directory, applies V1–V4 explicitly (test-only bootstrap, never reachable from the running service), and returns the path and a cleanup function
- [X] T011 [US2] Write `backend-nest/test/startup/migration-runner.spec.ts` before the runner exists. Cases: missing file → refused, and the file is still absent afterwards; copy with versions 1–4 `success = 1` → accepted, file SHA-256 unchanged; copy missing version 3 → refused; copy with version 4 `success = 0` → refused; no V5 pending → no `schema_migrations` table created; fixture with pending V5 in a temporary migrations directory → applied once, recorded in `schema_migrations`, `flyway_schema_history` rows unchanged. Expect these to fail now.
- [X] T012 Create `backend-nest/src/db/database.provider.ts`: opens `better-sqlite3` with `fileMustExist: true`, enables `foreign_keys`. On a missing file it throws an error that names the path and the copy command `cp backend/data/roombook.db backend-nest/data/roombook.db`. It never creates a file.
- [X] T013 [US2] Create `backend-nest/src/db/migration-runner.ts` baseline check: if `flyway_schema_history` is missing, refuse; require rows for versions 1, 2, 3, 4 with `success = 1`, comparing only version number and success flag (not description or checksum). Mismatch → throw with a message naming the missing or failed version. No write statement is executed.
- [X] T014 [US2] Extend `backend-nest/src/db/migration-runner.ts`: list `V<n>__*.sql` files in `src/db/migrations/` with `n > 4`, sorted by `n`. If there are none, return without creating `schema_migrations`. Otherwise create `schema_migrations(version, description, applied_at)` and apply each pending file in its own transaction, recording it. Depends on T013.
- [X] T015 Wire the runner into `backend-nest/src/main.ts`: open the database (T012), run the runner (T013/T014) before listening; on refusal, print the error to stderr and exit with code 1
- [X] T016 [P] Create `backend-nest/src/common/problem.ts`: `DomainError` class with `status`, `title`, `detail`; `ProblemBody` type with `type` (default `about:blank`), `title`, `status`, `detail`, `instance`
- [X] T017 Create `backend-nest/src/common/problem.filter.ts`: `@Catch()` global filter. `DomainError` → its status and title; `HttpException` → its status with the framework title; anything else → 500 with title `Internal Server Error` and a generic detail (no stack, no SQL). Response content type `application/problem+json`; `instance` is the request path. Depends on T016.
- [X] T018 Create `backend-nest/src/app.module.ts` (empty feature imports for now) and finish `backend-nest/src/main.ts`: create the Nest application on Express, register the global filter, listen on `config.PORT`, and log `RoomBook backend listening on http://localhost:<port> (db: <path>)`. Depends on T005, T006, T015, T017.
- [X] T019 Run `npm --prefix backend-nest install` to create `backend-nest/package-lock.json`, then `npm --prefix backend-nest run build`. Fix compile errors in T002–T018 files only.
- [X] T020 Create the local database copy: copy `backend/data/roombook.db` to `backend-nest/data/roombook.db` (byte copy, no open-and-save). Verify the SHA-256 of both files is equal. Write the original's SHA-256 to `backend-nest/data/original-db.sha256` (git-ignored) so T060 can compare against it. This is the operator step from `quickstart.md` §1.

---

## Phase 2: Contract tests (written before code)

**Purpose**: One contract test group per endpoint, validating request and response bodies with `ajv` against `specs/001-project-setup/contracts/openapi.yaml` and asserting every documented status code. These tests are written before any controller exists and are expected to fail (red) at the end of this phase.

**Checkpoint**: All contract test files exist, compile, and fail for the expected reason (no route or no implementation), not because of a test-setup error. `contract-baseline.spec.ts` passes.

- [X] T021 Write `backend-nest/test/contract/openapi-loader.ts`: read `specs/001-project-setup/contracts/openapi.yaml` (read only), parse with `yaml`, resolve `$ref`s into `components`, compile schemas with `ajv` and `ajv-formats`. Check the contract's OpenAPI version and configure `ajv` for any keyword it does not know (for example `nullable`). Export `validateBody(schemaName, value)` and `validateResponse(operationId, status, body)`. Depends on T001.
- [X] T022 [US1] Create the contract test helper `backend-nest/test/contract/app-factory.ts`: builds the Nest application through `Test.createTestingModule`, overriding `CLOCK` with a `FixedClock` (T007) and `ROOMBOOK_DB_PATH` with a temporary copy from T010. Each test file gets a fresh database. Depends on T010, T021.
- [X] T023 Create `backend-nest/test/contract/contract-baseline.sha256` containing the SHA-256 of the current `specs/001-project-setup/contracts/openapi.yaml`, and write `backend-nest/test/contract/contract-baseline.spec.ts` that fails when the hash differs (FR-002, SC-002). Do not edit `openapi.yaml`.
- [X] T024 [P] [US5] Write `backend-nest/test/contract/health.contract.spec.ts`: `GET /api/health` → 200, `application/json`, body validates `HealthReport` with `status` `UP`, `database` `UP`, `time` present; with the probe table dropped in the test copy → 503, both fields `DOWN`, body validates against `HealthReport`
- [X] T025 [P] [US1] Write `backend-nest/test/contract/rooms-list.contract.spec.ts`: `GET /api/rooms` → 200, array of `Room`, six demo rooms with equipment and `active`, inactive rooms included; `minCapacity=0` → 400 `application/problem+json`, title `Invalid room`; `equipment=` filter ignores case and surrounding spaces
- [X] T026 [P] [US1] Write `backend-nest/test/contract/rooms-create.contract.spec.ts`: `POST /api/rooms` → 201 with `Room` body; missing name → 400 problem with `detail` naming `name`; capacity 0 and 1001 → 400; duplicate name `"aurora "` → 409 with title `Room name already exists`
- [X] T027 [P] [US1] Write `backend-nest/test/contract/rooms-update.contract.spec.ts`: `PUT /api/rooms/{id}` → 200 with `Room`; invalid body → 400; unknown id → 404 title `Room not found`; renaming to an existing name in another case → 409
- [X] T028 [P] [US1] Write `backend-nest/test/contract/rooms-active.contract.spec.ts`: `PATCH /api/rooms/{id}/active` → 200 with the body shape the contract defines for this operation (room plus future bookings, validated against its schema); deactivating a room with future bookings lists them and deletes nothing; setting the current state → 200; invalid body → 400; unknown id → 404
- [X] T029 [P] [US3] Write `backend-nest/test/contract/bookings-create.contract.spec.ts`: `POST /api/bookings` → 201 with `Booking` body (times with office offset); missing field → 400 with `detail` naming it; Saturday → 400 `Booking not allowed`; unknown room → 404 `Room not found`; deactivated room → 422 `Room not available`; overlapping slot → 409 `Slot already booked`; back-to-back slot → 201
- [X] T030 [P] [US3] Write `backend-nest/test/contract/bookings-list.contract.spec.ts`: `GET /api/bookings?organizer=` → 200 array of `Booking`, cancelled bookings included, organizer matched ignoring case and surrounding spaces; missing `organizer` → 400 problem
- [X] T031 [P] [US3] Write `backend-nest/test/contract/bookings-cancel.contract.spec.ts`: `DELETE /api/bookings/{id}` → 200 with `Booking` status `CANCELLED`; cancelling again → 200 with the same booking (no error even after the window); unknown id → 404 `Booking not found`; start 59 minutes away (fixed clock) → 409 `Too late to cancel`; start 60 minutes away → 200
- [X] T032 [P] [US3] Write `backend-nest/test/contract/rooms-availability.contract.spec.ts`: `GET /api/rooms/{id}/availability?date=` → 200 array of `Booking`, confirmed only, ordered by start; malformed `date` → 400 problem; unknown room → 404 `Room not found`
- [X] T033 [P] [US4] Write `backend-nest/test/contract/errors.contract.spec.ts`: unknown path → 404 `application/problem+json`; malformed JSON body → 400 problem; non-numeric id `/api/rooms/abc` → 400 problem; a forced database failure → 500 with generic `detail` and no stack trace or SQL text
- [X] T034 Run `npm --prefix backend-nest run test:contract` and record the result in the commit message or PR notes. Result (ESM, 2026-10-24): contract-baseline passes; 42 endpoint and error tests fail with 404 or the expected status missing, because no controller exists yet; 0 module-load or compile errors. Expected: T023 passes; every other contract file fails only because the route or implementation is missing. Fix any setup error in the test files themselves (T021, T022, T024–T033) before moving on.

---

## Phase 3: Implementation (rooms and bookings modules)

**Purpose**: Implement the rooms and bookings modules, health, the full error mapping, and the rules, until the Phase 2 contract tests and Phase 1 tests pass.

**Checkpoint**: `npm --prefix backend-nest test` is fully green; the booking-rule boundaries pass with the fixed clock; `GET /api/rooms` on the copy returns six rooms.

### Errors and health

- [X] T035 [US4] Complete `backend-nest/src/common/problem.ts`: factory functions or subclasses for every domain error with the exact status and title from `contracts/README.md`: `Invalid room` 400, `Booking not allowed` 400, `Room not found` 404, `Booking not found` 404, `Room name already exists` 409, `Slot already booked` 409, `Too late to cancel` 409, `Room not available` 422. Copy messages from `backend/src/main/java/com/roombook/**`.
- [X] T036 [US5] Create `backend-nest/src/health/health-probe.repository.ts`: in one transaction, insert, read back and delete row `id = 1` in `health_probe`, using the same SQL as the Java probe
- [X] T037 [US5] Create `backend-nest/src/health/health.service.ts`, `health.controller.ts` and `health.module.ts`: `status` and `database` both `UP` when the probe succeeds, both `DOWN` otherwise; `time` is the Clock instant; controller returns 200 for UP and 503 for DOWN. Import `HealthModule` in `backend-nest/src/app.module.ts`. Makes T024 pass.

### Booking rules (test first)

- [X] T038 [US3] Write `backend-nest/test/unit/booking-rules.spec.ts` with `FixedClock` before the rules exist: 19:45–20:00 weekday accepted; end 20:15 → 400; Saturday → 400; 4 h 15 min → 400; exactly 4 h → accepted; start equal to now → accepted; start before now → 400; crossing midnight → 400; end equal to start → 400; minute 10 → 400; a UTC instant that is Friday in UTC but Saturday in Rome → 400; a booking on the DST change day keeps the same hours and the 4-hour elapsed limit. Expect these to fail now.
- [X] T039 [US3] Create `backend-nest/src/bookings/booking-rules.ts`: pure functions taking the current instant from the Clock. Implement the ordered checks from `data-model.md` (weekday, 08:00–20:00 inclusive end, 15-minute boundary, same local day, end after start, duration ≤ 4 h elapsed, start not before now), throwing `Booking not allowed` with a detail that names the rule. Makes T038 pass. Depends on T017, T035.

### Rooms module

- [X] T040 [US1] Create `backend-nest/src/rooms/rooms.repository.ts`: list all rooms with equipment ordered by id; find by id; insert room (`name_key = trim(name).toLowerCase()`) with equipment rows (`item_key` dedupe, first spelling kept); update; name-key existence check excluding one id; filter by `capacity >= minCapacity` and by `item_key`; set `active`. Uses prepared statements against `room` and `room_equipment`.
- [X] T041 [US1] Create `backend-nest/src/rooms/rooms.service.ts`: name required, trimmed, ≤ 100; capacity 1–1000; equipment ≤ 20 items, each non-empty and ≤ 50, duplicates ignored by key; `minCapacity` ≥ 1; duplicate name → `Room name already exists`; active change returns the room's future CONFIRMED bookings through the bookings repository from T043 (import `BookingsModule`). Run T043 before T041 even though T041 is numbered first in its group. Messages copied from the Java `RoomService`.
- [X] T042 [US1] Create `backend-nest/src/rooms/rooms.controller.ts` (HTTP mapping only: `GET /api/rooms`, `POST /api/rooms` → 201, `PUT /api/rooms/:id`, `PATCH /api/rooms/:id/active`; path ids parsed as integers, invalid → 400) and `backend-nest/src/rooms/rooms.module.ts`. Depends on T041.

### Bookings module

- [X] T043 [US3] Create `backend-nest/src/bookings/bookings.repository.ts`: insert booking (`organizer_key = trim(organizer).toLowerCase()`, UTC text `yyyy-MM-ddTHH:mm:ssZ` via `Date.toISOString` truncated to seconds); find by id; list by `organizer_key` ordered by `start_at, id`; list CONFIRMED overlapping `existing.start_at < new.end AND new.start_at < existing.end` for a room; list CONFIRMED bookings for a room whose start falls in an office-local day (UTC bounds from `office-time.ts`), ordered by `start_at`; update status to `CANCELLED`; list CONFIRMED future bookings for a room (for T041).
- [X] T044 [US3] Create `backend-nest/src/bookings/bookings.service.ts`: `create` runs room lookup (404, then 422 when inactive), field checks (400), T039 rules, overlap check (409) and insert inside `db.transaction(...).immediate()`; `availability(roomId, date)`; `byOrganizer(organizer)`, rejecting an empty value with 400; `cancel(id)`: missing → 404, already `CANCELLED` → return unchanged, otherwise allowed only when `start − now ≥ 60 min`, else 409 `Too late to cancel`. Depends on T039, T043.
- [X] T045 [US3] Create `backend-nest/src/bookings/bookings.controller.ts` (`POST /api/bookings` → 201, `GET /api/bookings?organizer=`, `DELETE /api/bookings/:id`, `GET /api/rooms/:id/availability?date=`) and `backend-nest/src/bookings/bookings.module.ts` exporting the repository. Depends on T044.
- [X] T046 [US3] Write `backend-nest/test/integration/booking-concurrency.spec.ts`: two overlapping `POST /api/bookings` for the same room sent with `Promise.all` against one temporary database → exactly one 201 and one 409 `Slot already booked`; the database holds exactly one CONFIRMED row for that slot. Depends on T045.

### Wiring and gate

- [X] T047 [US1] Update `backend-nest/src/app.module.ts`: import `HealthModule`, `BookingsModule`, `RoomsModule`; make sure `RoomsModule` imports `BookingsModule` with no circular import (repository exported, service not). Depends on T037, T042, T045.
- [X] T048 Run `npm --prefix backend-nest test` and fix failures in `backend-nest/src/**` until every Phase 1 and Phase 2 test passes, including T023 (contract baseline) and T011 (startup). Do not change `openapi.yaml`, the contract tests' expectations, or the copied migrations to make a test pass; report any test whose expectation looks wrong instead.

---

## Phase 4: Parity comparison with the Spring backend

**Purpose**: Replay at least 50 recorded requests against the Spring service and the Nest service, each on an identical copy of the same database, with the same notion of time. Fix differences only in `backend-nest/`.

**Checkpoint**: `npm --prefix backend-nest run parity -- --left http://localhost:8080 --right http://localhost:8081` reports zero differences over at least 50 requests; the original database and the contract are unchanged.

- [X] T049 Create `backend-nest/parity/reset-copies.ts`: copies `backend/data/roombook.db` to `backend-nest/parity/work/left.db` and `backend-nest/parity/work/right.db`, byte-identical, overwriting previous copies. Refuses if the source is missing. Never writes to the source. Run it before every replay.
- [X] T050 Author `backend-nest/parity/requests.json`: at least 50 requests in a fixed order, covering all 9 operations of `contracts/README.md`, each business rule at its boundary and just outside it, each documented error, and an unknown path and malformed JSON. Successful bookings use dates far in the future on Monday–Friday in Europe/Rome; "in the past" uses a fixed old date; cancellation uses bookings far ahead. Do not depend on the current time.
- [X] T051 Start the Spring service on port 8080 against `backend-nest/parity/work/left.db` (find the database path property in `backend/src/main/resources/`; do not edit `backend/`) and record its responses: write `backend-nest/parity/recorded-requests.json` with method, path, body, expected status, content type and body text for every request in T050. Depends on T049, T050.
- [X] T052 Write `backend-nest/parity/replay.ts`: reads `--left` and `--right` base URLs and `recorded-requests.json`, sends each request in order to both services, returns the two responses. Depends on T051.
- [X] T053 Write `backend-nest/parity/compare.ts`: compares status, content type and body; on the first difference per request it prints the request index, the field path and both values; exits non-zero if any request differs. Depends on T051.
- [X] T054 Add the `parity` run sequence to `backend-nest/parity/replay.ts`: run T049 reset for both sides, then replay and compare, so that a run always starts from identical copies. Depends on T052, T053.
- [X] T055 [US5] Resolve research open point R-005 against the recorded Spring response: whether the health `time` has fractional seconds. Adjust the formatter in `backend-nest/src/health/health.service.ts` to match, and rerun T024. Depends on T037, T051.
- [X] T056 [US4] Resolve research open point R-006 against the recorded Spring responses: the framework-level 400 (malformed JSON, invalid path id) and 404 (unknown route) title and detail text. Adjust `backend-nest/src/common/problem.filter.ts` to match, and rerun T033. Depends on T017, T051.
- [X] T057 Run the parity check: start Spring on 8080 against `parity/work/left.db`, and Nest on 8081 with `PORT=8081`, `ROOMBOOK_DB_PATH=backend-nest/parity/work/right.db`, `ROOMBOOK_CLOCK_FIXED_AT` set. Run `npm --prefix backend-nest run parity -- --left http://localhost:8080 --right http://localhost:8081`. Fix every reported difference in `backend-nest/src/**`, then rerun from fresh copies until zero differences. Depends on T054, T055, T056.
- [X] T058 [US2] Verify on the copy that the service lists six rooms and that each organizer's bookings (including cancelled ones) match the Spring response for the same data (SC-005). Confirm the bookings list shows office-time offsets. Depends on T057.
- [X] T059 [US2] Verify refusal and no-write behaviour (SC-006): (a) start Nest with `ROOMBOOK_DB_PATH` pointing to a missing file → exits with the path and copy command, file not created; (b) a copy with `flyway_schema_history` version 4 set to `success = 0` → exits, SHA-256 unchanged. Depends on T048.
- [X] T060 Final gate: confirm `git diff -- specs/001-project-setup/contracts/openapi.yaml` and `git diff -- frontend backend` are empty; confirm `backend/data/roombook.db` SHA-256 matches `backend-nest/data/original-db.sha256` written at T020 (SC-004); run `npm --prefix backend-nest test` and the parity check once more. Report the results with their output. Depends on T057, T058, T059. **Run 2026-10-25 (done):** Spring reference re-recorded from the live Spring service (99 responses). Parity gate exit 0, `Differences: 0`, `Spring drift vs recorded: 0`; openapi and frontend/backend diffs empty; source DB SHA-256 equals `original-db.sha256`; `npm --prefix backend-nest test` 15/15 suites, 72/72 tests.

---

## Phase 5: DTO files and service-owned transactions (amendment 2026-10-24)

Amendment for FR-022 (one DTO file per module, pattern of specs 002 and 004) and FR-023 (transactions only in services, Constitution III). No HTTP behaviour changes. Hard limits as in the header: do not touch `openapi.yaml`, `frontend/`, `backend/`; do not change the contract tests' expectations. Existing tasks T001–T060 are not renumbered or edited.

- [X] T061 [P] Create `backend-nest/src/rooms/rooms.dto.ts`: input types `RoomInput` (`name`, `capacity`, `equipment`, all nullable as bound) and `ActiveChange` (`active`, nullable); output types `Room`, `RoomActivationResult` (`room`, `futureBookings`) and `BookingSummary` (`id`, `title`, `organizer`, `start`, `end`). Move the interfaces and the room mapping from `rooms.service.ts` and `rooms.repository.ts` into this file. The file holds no rule.
- [X] T062 [P] Create `backend-nest/src/bookings/bookings.dto.ts`: input type `BookingInput` (moved from `bookings.service.ts`, fields nullable as today) and output type `Booking`, with the mapper `toBookingDto` moved from `booking.mapper.ts`. Delete `backend-nest/src/bookings/booking.mapper.ts` and update the imports in `bookings.service.ts`, `bookings.controller.ts` and `rooms.service.ts` (`BookingSummary` comes from `rooms.dto.ts` after T061, or stays in `bookings.dto.ts` if T061 keeps it there; pick one and state it in the commit note). Depends on nothing but must be done before T064.
- [X] T063 [P] Create `backend-nest/src/health/health.dto.ts`: output type `HealthReport` (`status`, `database`, `time`), moved from `health.service.ts`. No input type, since the endpoint has no body.
- [X] T064 Update the controllers `backend-nest/src/rooms/rooms.controller.ts`, `backend-nest/src/bookings/bookings.controller.ts` and `backend-nest/src/health/health.controller.ts` to import their input and output types from the module DTO file; bind the request into the input type and pass it to the service. Depends on T061, T062, T063.
- [X] T065 Move the two transactions out of `backend-nest/src/rooms/rooms.repository.ts` (currently `db.transaction` at lines ~67 and ~78) into `RoomsService` in `backend-nest/src/rooms/rooms.service.ts`, using the same `db` handle and the same `.immediate()` setting if it was used. After this task `rooms.repository.ts` contains no `transaction(` and no `.immediate(` call; each repository method runs one statement or one prepared query. Depends on T061.
- [X] T066 Move the write/read/delete transaction out of `backend-nest/src/health/health-probe.repository.ts` (currently `db.transaction` at line ~12) into `HealthService` in `backend-nest/src/health/health.service.ts`. The repository exposes three single-statement methods (insert, read back, delete) with the same SQL. The result (UP/DOWN, 200/503) is unchanged. Depends on T063.
- [X] T067 [P] Add `backend-nest/test/unit/repository-transactions.spec.ts`: read every `backend-nest/src/**/*.repository.ts` file and assert that none contains `transaction(` or `.immediate(`. Also adjust any existing unit test that imports a moved type so it still compiles. The migration runner (`src/db/migration-runner.ts`) is not a repository and is excluded. Depends on T065 and T066.
- [X] T068 Run `npm --prefix backend-nest run build` and `npm --prefix backend-nest test`. Both must pass with no change to `test/contract/**/*.spec.ts` expectations. Report the exact output. **Status**: build passes; `npm test` gives 72 passed of 72 (15 suites). Overlap test made independent under T069.

**Phase 5 checkpoint**: build succeeds; `npm --prefix backend-nest test` is green; `grep -n "transaction(\|\.immediate(" backend-nest/src/**/*.repository.ts` finds nothing; `booking.mapper.ts` no longer exists.

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1** has no dependencies except T019 (after T002–T018) and T020 (after the `backend/data` file exists).
- **Phase 2** depends on Phase 1 (`T001`, `T007`, `T010`, `T021` for shared helpers). Test files T024–T033 are parallel with each other.
- **Phase 3** depends on Phase 2 being written. Within it: errors (T035) and health (T036–T037) can come first; rules test (T038) before rules (T039); repository (T043) before service (T044) and before the rooms service active-change summary (T041); controllers (T042, T045) last; wiring (T047) and gate (T048) at the end.
- **Phase 4** depends on Phase 3 being green (T048) for T057, and on the Spring service being runnable for T051.

### Story-level dependencies

- **US1 (rooms)**: needs the bookings repository (T043) only for the active-change summary in T041.
- **US2 (copy)**: T011, T013, T014, T058, T059. Independent of US1 and US3.
- **US3 (bookings)**: depends on T035 (errors) and T039 (rules); independent of US5.
- **US4 (errors)**: T033 written in Phase 2; implemented by T017 and T035; checked by T056.
- **US5 (health)**: T024 written in Phase 2; implemented by T036–T037; checked by T055.

### Within each phase

- Test files before the code they test (Phase 2 before Phase 3; T038 before T039).
- Phase 3 numbers are grouped by module, not strict execution order: run T043 before T041.
- Repositories before services; services before controllers; controllers before wiring.

## Parallel Example: Phase 2

```bash
# After T021 (loader) and T022 (app factory) are written, these files can be written in parallel:
Task: "rooms-list.contract.spec.ts"       # T025
Task: "rooms-create.contract.spec.ts"     # T026
Task: "rooms-update.contract.spec.ts"     # T027
Task: "rooms-active.contract.spec.ts"     # T028
Task: "bookings-create.contract.spec.ts"  # T029
Task: "bookings-list.contract.spec.ts"    # T030
Task: "bookings-cancel.contract.spec.ts"  # T031
Task: "rooms-availability.contract.spec.ts" # T032
Task: "errors.contract.spec.ts"           # T033
```

---

## Implementation Strategy

### MVP first (User Story 1 and the copy)

1. Phase 1 (scaffolding, runner, copy in place)
2. Phase 2 for US1 and US2 (T025–T028, T011)
3. Phase 3 for US1 (T040–T042, with T043 as its dependency)
4. **STOP and validate**: `GET /api/rooms` on the copy shows six rooms; the runner tests pass.

### Full parity

1. Finish Phases 2 and 3 for every story.
2. Run Phase 4 until the replay reports zero differences over at least 50 requests.
3. Cutover (removing `backend/`, renaming `backend-nest/`) is intentionally not in this task list; the user limited the phases to four. It is a separate change after parity.

---

## Notes

- `[P]` = different files, no dependency on an unfinished task in the same phase.
- No task writes to `specs/001-project-setup/contracts/openapi.yaml`, `frontend/`, or `backend/`.
- Tests that fail in Phase 2 are expected; they must fail because the feature is missing, not because of setup errors.
- `backend-nest/` is an ES module package (`"type": "module"`, NodeNext). Relative imports end in `.js`, and `__dirname` is replaced by `import.meta.url`. Reason: NestJS 12 ships only as ES modules (research R-012). Tests start with `npm test` / `npm run test:contract`, which add `--experimental-vm-modules`.
- Parity runs always start from fresh copies made by T049.
- Known gap: `start-backend.bat` is not updated in this list (research R-011 mentions it). Add it at cutover, since until then the Spring service still needs that launcher.

## Phase 6: Convergence

Findings from `/speckit-converge` after Phase 5. Existing tasks are not renumbered or edited.

- [X] T069 [HIGH] Make the overlap case of `backend-nest/test/contract/bookings-create.contract.spec.ts` independent of the earlier 201 case, without changing any expectation: give that file a fresh app and database per test (or a different slot for the setup booking), so the 201 setup succeeds and the overlapping request gets 409 "Slot already booked". Covers FR-020 and the Phase 3 checkpoint (T048, partial). Gap: partial. Evidence: `npm --prefix backend-nest test` gives 71 passed, 1 failed; the test passes alone with `-t "overlapping slot"`.
- [X] T070 [MEDIUM] Run the final parity gate T060 once the operator has the Spring service running on port 8080 (Step 8 preparation). Record the output and the SHA-256 of `backend/data/roombook.db` against `backend-nest/data/original-db.sha256`. Covers SC-003 and FR-005 (partial: not assessed in this converge run because it needs a running Spring service).
  - Status 2026-10-25: done. Gate run from fresh copies, parity exit 0, zero differences and zero drift against the re-recorded Spring reference. The harness uses ports 8090/8091, not 8080/8081 as written above; the harness starts both servers itself and no process was killed. SHA-256 of `backend/data/roombook.db` equals `backend-nest/data/original-db.sha256` (`2e10fed8f7283d1147920ef57053a0e0c4e4b1f06a25bac6a1a21598bd80cd44`).
