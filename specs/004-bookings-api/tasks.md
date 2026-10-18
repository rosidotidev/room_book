---

description: "Task list for Room Bookings"
---

# Tasks: Room Bookings

**Input**: Design documents from `/specs/004-bookings-api/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, `specs/001-project-setup/contracts/openapi.yaml` (already extended)

**Tests**: Included (constitution II; plan: contract tests per status code, unit tests per rule with a fixed clock, concurrency test).

## Format: `[ID] [P?] [Story] Description`

Paths are relative to the repository root. `MAIN` = `backend/src/main/java/com/roombook/`, `TEST` = `backend/src/test/java/com/roombook/`, `RES` = `backend/src/main/resources/`.

## Phase 1: Setup

- [X] T001 Confirm `specs/001-project-setup/contracts/openapi.yaml` contains `/api/bookings`, `/api/bookings/{id}`, `/api/rooms/{id}/availability`, the schemas `BookingInput`, `Booking`, `BookingStatus` and the responses `Conflict` and `RoomDeactivated`, and that `npm run generate:api` in `frontend/` still succeeds (FR-014)

---

## Phase 2: Foundational (blocking)

- [X] T002 Create migration `RES/db/migration/V4__create_booking.sql`: table `booking` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `room_id` INTEGER NOT NULL FOREIGN KEY -> `room(id)`, `title` TEXT NOT NULL, `organizer` TEXT NOT NULL, `organizer_key` TEXT NOT NULL, `start_at` TEXT NOT NULL, `end_at` TEXT NOT NULL, `status` TEXT NOT NULL CHECK (`status` IN ('CONFIRMED','CANCELLED')) DEFAULT 'CONFIRMED', `created_at` TEXT NOT NULL), index `(room_id, start_at)` and index `(organizer_key)` (FR-001)
- [X] T003 [P] Create `MAIN/config/OfficeZoneConfig.java`: a `ZoneId` bean from property `roombook.zone` with default `Europe/Rome`, and add the property to `RES/application.yml` (FR-004)
- [X] T004 [P] Create `MAIN/api/BookingDto.java`: `BookingInput(roomId, title, organizer, start, end)` with nullable fields and `Booking(id, roomId, title, organizer, start, end, status, createdAt)` using `OffsetDateTime` in the office offset; change `BookingSummary` in `MAIN/api/RoomDto.java` to `OffsetDateTime` and update `TEST/service/RoomServiceTest.java` accordingly
- [X] T005 [P] Create the exceptions in `MAIN/service/`: `BookingRuleException` (400, message names the rule), `BookingNotFoundException` (404), reusing `RoomNotFoundException` (404) for an unknown room, `BookingConflictException` (409, names the clashing interval), `CancellationTooLateException` (409), `RoomDeactivatedException` (422)
- [X] T006 Create `MAIN/repository/BookingRepository.java` (JdbcTemplate): `insert`, `findById`, `overlappingConfirmed(roomId, startUtc, endUtc)` using `existing.start < end AND start < existing.end`, `confirmedOnDay(roomId, dayStartUtc, dayEndUtc)` ordered by `start_at`, `byOrganizerKey(key)` ordered by `start_at` including cancelled, `futureConfirmed(roomId, nowUtc)` ordered by `start_at`, `markCancelled(id)`; instants stored as `yyyy-MM-ddTHH:mm:ssZ`; no query while a result set is open (FR-001, FR-008, FR-009)
- [X] T007 Extend `MAIN/api/ApiExceptionHandler.java`: `BookingRuleException` -> 400, `BookingNotFoundException` -> 404, `BookingConflictException` and `CancellationTooLateException` -> 409, `RoomDeactivatedException` -> 422, all as `problem+json` with readable details (FR-012)
- [X] T008 Create `TEST/contract/BookingTestSupport.java`: helpers for the booking contract tests that reuse the fixed `Clock` already defined in `TEST/contract/ContractTestBase.java` (`FIXED_NOW` = Monday 2026-10-19 09:00 UTC, 11:00 office time, so every booking is made from Tuesday 2026-10-20 on), to create rooms and bookings, and to build ISO times for an office-local weekday and time (FR-013)

**Checkpoint**: Foundation ready.

---

## Phase 3: User Story 1 - Book a room without double bookings (P1) MVP

**Goal**: Create bookings with every rule enforced and exactly one winner for simultaneous requests.

**Independent Test**: Book a free slot; try overlap, back-to-back, each rule violation, a deactivated room, an unknown room.

- [X] T009 [P] [US1] Unit tests `TEST/service/BookingRulesTest.java`, each rule with `Clock.fixed`: weekday (Saturday and Sunday refused), start 07:45 refused, end 20:15 refused, start 08:00 and end 20:00 accepted, minutes not in {0,15,30,45} refused, seconds refused, crossing midnight refused, end equal to or before start refused, 4 hours accepted and 4 hours 15 minutes refused, start in the past refused, start exactly now accepted, rule order for several violations (FR-004, FR-005, FR-013)
- [X] T010 [P] [US1] Unit tests `TEST/service/BookingServiceTest.java`: overlap refused for contained, partial and identical intervals; back-to-back before and after accepted; different room accepted; cancelled booking does not block; precedence missing fields (400) -> unknown room (404) -> deactivated room (422) -> time rules (400) -> overlap (409); title and organizer trimmed, required and at most 100 characters (FR-001, FR-003, FR-007, FR-015)
- [X] T011 [P] [US1] Contract tests `TEST/contract/BookingCreateContractTest.java` for `POST /api/bookings`: 201 with `Location` and a `CONFIRMED` booking in the office offset; 400 for each rule violation; 404 unknown room; 409 overlap with a message naming the clash; 422 deactivated room; all validated against the contract (FR-002, FR-012, SC-003)
- [X] T012 [P] [US1] Concurrency test `TEST/service/BookingConcurrencyTest.java`: 50 threads book the same slot at once and exactly one is confirmed, the others get 409 (FR-006, SC-001)
- [X] T013 [US1] Implement the pure time rules in `MAIN/service/BookingRules.java` (office zone, weekday, hours, boundaries, same day, duration, order, not past, using the `Clock`) (FR-004, FR-005, FR-013)
- [X] T014 [US1] Implement `create(BookingInput)` in `MAIN/service/BookingService.java`, `@Transactional`: field checks, room lookup, active check, time rules, overlap query and insert on the same connection (FR-002, FR-003, FR-006, FR-007, FR-015)
- [X] T015 [US1] Implement `POST /api/bookings` (201 + `Location`) in `MAIN/api/BookingController.java` (FR-002)

---

## Phase 4: User Story 2 - See what is booked on a room for a day (P1)

**Goal**: Confirmed bookings of a room for one office-local day, ordered by start.

**Independent Test**: Create bookings on different days and rooms; read one room-day.

- [X] T016 [P] [US2] Contract tests `TEST/contract/BookingQueryContractTest.java` for `GET /api/rooms/{id}/availability?date=`: 200 ordered by start, other days and rooms excluded, a cancelled booking not listed, empty day returns `[]`, 400 for a missing or invalid date, 404 unknown room (FR-008)
- [X] T017 [US2] Implement `availability(roomId, date)` in `MAIN/service/BookingService.java` (day boundaries in the office zone) and `GET /api/rooms/{id}/availability` in `MAIN/api/BookingController.java` (FR-008)

---

## Phase 5: User Story 3 - List an organizer's bookings (P2)

**Goal**: All bookings of an organizer, including cancelled, matched ignoring case and spaces.

- [X] T018 [P] [US3] Contract tests in `TEST/contract/BookingQueryContractTest.java` for `GET /api/bookings?organizer=`: 200 only that organizer's bookings with their status, ordered by start; `" ANA "` matches `ana`; empty list for an unknown organizer; 400 for a missing or blank organizer (FR-009)
- [X] T019 [US3] Implement `byOrganizer(name)` in `MAIN/service/BookingService.java` and `GET /api/bookings` in `MAIN/api/BookingController.java` (FR-009, FR-015)

---

## Phase 6: User Story 4 - Cancel a booking (P1)

**Goal**: Soft cancellation up to 60 minutes before the start.

- [X] T020 [P] [US4] Unit tests in `TEST/service/BookingServiceTest.java` with `Clock.fixed`: cancel 61 minutes before accepted, exactly 60 minutes accepted, 59 minutes refused, already started refused, already ended refused, cancelling a cancelled booking accepted, the slot can be booked again afterwards (FR-010)
- [X] T021 [P] [US4] Contract tests `TEST/contract/BookingCancelContractTest.java` for `DELETE /api/bookings/{id}`: 200 with `CANCELLED` and the booking kept, 409 inside the window with a message naming the one-hour rule, 404 unknown id, idempotent repeat (FR-010, FR-012)
- [X] T022 [US4] Implement `cancel(id)` in `MAIN/service/BookingService.java` and `DELETE /api/bookings/{id}` in `MAIN/api/BookingController.java` (FR-010)

---

## Phase 7: User Story 5 - Deactivating a room reports future bookings (P2)

**Goal**: The room deactivation result lists the room's future confirmed bookings and keeps them.

- [X] T023 [P] [US5] Contract tests `TEST/contract/RoomDeactivationBookingsContractTest.java`: `PATCH /api/rooms/{id}/active` with `{"active":false}` lists future confirmed bookings in `futureBookings` and the bookings remain `CONFIRMED`; past and cancelled bookings are not listed; reactivation keeps the bookings (FR-011)
- [X] T024 [US5] Create `MAIN/service/BookingBackedFutureBookings.java` implementing `FutureBookingsProvider` with `BookingRepository.futureConfirmed`, and remove `MAIN/service/NoBookingsYetProvider.java` so the room deactivation result is filled with real data (FR-011)

---

## Phase 8: Polish & Cross-Cutting

- [X] T025 [P] Performance test `TEST/service/BookingListPerformanceTest.java`: with 10,000 bookings a room-day and an organizer listing return in under 1 second (SC-004)
- [X] T026 Update the F01 tests that assumed an always empty `futureBookings` and the `flyway_schema_history` counts in `TEST/startup/*` (now 4 migrations), then run the whole suite `./mvnw test` in `backend/` to confirm F00 and F01 do not regress (SC-005)
- [X] T027 Run the quickstart `specs/004-bookings-api/quickstart.md` against a running backend

---

## Dependencies & Execution Order

- Phase 1 -> Phase 2 -> user stories -> Polish.
- US1 first; US2, US3 and US4 need only the foundation and a way to create bookings (T014); US5 needs T006.
- Within a story: tests first, then rules, service and controller.

## Parallel Opportunities

- T003, T004, T005 together; T009-T012 together; T016 and T018; T020 and T021.

## Implementation Strategy

MVP = Phase 1-2 + US1; then US4, US2, US3, US5, polish.

## Phase 9: Convergence

- [X] T028 Add rule tests in `backend/src/test/java/com/roombook/service/BookingRulesTest.java` with winter offsets and around the daylight-saving change of 25 October 2026 (Europe/Rome): the same office-local 08:00-20:00 window is accepted before and after the change although the UTC offset differs, 07:45 and 20:15 are still refused, and the office day boundaries used by the availability query are 23 or 25 hours long on the change day, per FR-004 (partial)
