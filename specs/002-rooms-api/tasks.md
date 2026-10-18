---

description: "Task list for Rooms Catalog"
---

# Tasks: Rooms Catalog

**Input**: Design documents from `/specs/002-rooms-api/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, `specs/001-project-setup/contracts/openapi.yaml` (already extended)

**Tests**: Included (constitution II: contract tests for every endpoint and status code).

## Format: `[ID] [P?] [Story] Description`

Paths are relative to the repository root. Backend sources live under `backend/src/main/java/com/roombook/` (`MAIN`) and tests under `backend/src/test/java/com/roombook/` (`TEST`).

## Phase 1: Setup

- [X] T001 Confirm `specs/001-project-setup/contracts/openapi.yaml` contains `/api/rooms`, `/api/rooms/{id}`, `/api/rooms/{id}/active`, the schemas `Room`, `RoomInput`, `ActiveChange`, `RoomActivationResult`, `BookingSummary` and the responses `BadRequest`, `NotFound`, `DuplicateName`, and that `npm run generate:api` in `frontend/` still succeeds (FR-013)

---

## Phase 2: Foundational (blocking)

- [X] T002 Create migration `backend/src/main/resources/db/migration/V2__create_room.sql`: table `room` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `name` TEXT NOT NULL, `name_key` TEXT NOT NULL UNIQUE, `capacity` INTEGER NOT NULL CHECK (`capacity` > 0), `active` INTEGER NOT NULL DEFAULT 1) and table `room_equipment` (`room_id` INTEGER NOT NULL FOREIGN KEY -> `room(id)`, `item` TEXT NOT NULL, `item_key` TEXT NOT NULL, UNIQUE (`room_id`, `item_key`)) (FR-001)
- [X] T003 [P] Create the exceptions `MAIN/service/RoomNotFoundException.java`, `MAIN/service/DuplicateRoomNameException.java`, `MAIN/service/InvalidRoomException.java` (message names the invalid field)
- [X] T004 [P] Create the API records in `MAIN/api/RoomDto.java`: `Room(id, name, capacity, equipment, active)`, `RoomInput(name, capacity, equipment)` with name 1-100 chars, capacity 1-1000, up to 20 equipment items of 1-50 chars, `ActiveChange(active)`, `RoomActivationResult(room, futureBookings)`, `BookingSummary(id, title, organizer, start, end)`
- [X] T005 Create `MAIN/repository/RoomRepository.java` (JdbcTemplate): `findAll(minCapacity, equipmentKey)` ordered by `name_key` with an EXISTS filter on `room_equipment.item_key`, `findById`, `existsByNameKey(nameKey, excludingId)`, `insert`, `update`, `setActive`, replacing equipment rows on update (FR-002, FR-003)
- [X] T006 [P] Create the interface `MAIN/service/FutureBookingsProvider.java` (`List<BookingSummary> futureBookingsOf(long roomId)`) and `MAIN/service/NoBookingsYetProvider.java` returning an empty list (FR-011)
- [X] T007 Extend `MAIN/api/ApiExceptionHandler.java`: `RoomNotFoundException` -> 404, `DuplicateRoomNameException` -> 409, `InvalidRoomException` -> 400, a database unique-constraint violation on `room.name_key` -> 409; all as `problem+json` with a readable detail (FR-008, FR-009, FR-010)
- [X] T008 Add a contract test helper in `TEST/contract/RoomTestSupport.java` to create rooms with unique names through the repository so that contract tests do not depend on each other

**Checkpoint**: Foundation ready.

---

## Phase 3: User Story 1 - Browse and filter rooms (P1) MVP

**Goal**: List rooms with optional minimum-capacity and equipment filters.

**Independent Test**: List all, filter by capacity, by equipment, by both, and by a filter matching nothing.

- [X] T009 [P] [US1] Contract tests for `GET /api/rooms` in `TEST/contract/RoomListContractTest.java`: 200 with all rooms and their fields, `minCapacity` filter, `equipment` filter ignoring case and spaces, both filters, empty result as 200 with `[]`, inactive rooms included, ordering by name, 400 for `minCapacity=0` and `minCapacity=abc`, all validated against the contract (FR-002, FR-003, SC-004)
- [X] T010 [P] [US1] Unit tests of listing rules in `TEST/service/RoomServiceTest.java`: equipment key normalisation (`" Projector "` matches `projector`), `minCapacity < 1` raises `InvalidRoomException` (FR-003)
- [X] T011 [US1] Implement `list(minCapacity, equipment)` in `MAIN/service/RoomService.java` (validation and key normalisation, delegating to the repository)
- [X] T012 [US1] Implement `GET /api/rooms` in `MAIN/api/RoomController.java` mapping query parameters to the service (FR-002, FR-003)

---

## Phase 4: User Story 2 - Create and edit a room (P1)

**Goal**: Create and update rooms with validated, unique, normalised data.

**Independent Test**: Create a room, repeat with a name differing only by case/spaces (409), edit it, rename to another room's name (409).

- [X] T013 [P] [US2] Contract tests for `POST /api/rooms` in `TEST/contract/RoomCreateContractTest.java`: 201 with `Location` and an active room, 409 for a duplicate name including case/space variants, 400 for missing name, capacity 0, capacity above 1000, name longer than 100, more than 20 equipment items, all against the contract (FR-004, FR-008, FR-009)
- [X] T014 [P] [US2] Contract tests for `PUT /api/rooms/{id}` in `TEST/contract/RoomUpdateContractTest.java`: 200 with new details and same id, 200 when saved under its own name, 409 when renamed to another room's name, 400 for invalid input, 404 for an unknown id (FR-005, FR-008, FR-010)
- [X] T015 [P] [US2] Unit tests in `TEST/service/RoomServiceTest.java`: trimming of name and items, case-insensitive de-duplication of equipment keeping the first spelling, duplicate-name detection excluding the room itself, each validation limit (FR-001, FR-008, FR-009)
- [X] T016 [US2] Implement `create(RoomInput)` and `update(id, RoomInput)` in `MAIN/service/RoomService.java`: for `update` an unknown id raises `RoomNotFoundException` before the body is validated; then validation, normalisation, `name_key` check, new rooms active; unknown JSON fields are ignored (FR-004, FR-005, FR-008, FR-009, FR-010)
- [X] T017 [US2] Implement `POST /api/rooms` (201 + `Location`) and `PUT /api/rooms/{id}` in `MAIN/api/RoomController.java`

---

## Phase 5: User Story 3 - Activate and deactivate a room (P2)

**Goal**: Flip the active flag without deleting data and report future bookings.

**Independent Test**: Deactivate a room, list it as inactive, reactivate it.

- [X] T018 [P] [US3] Contract tests for `PATCH /api/rooms/{id}/active` in `TEST/contract/RoomActiveContractTest.java`: 200 deactivate with `futureBookings` `[]`, room still listed and inactive, 200 reactivate, 200 idempotent repeat, 400 for a body without `active`, 404 for an unknown id, all against the contract (FR-006, FR-007, FR-010, FR-011)
- [X] T019 [P] [US3] Unit tests in `TEST/service/RoomServiceTest.java`: deactivation returns the provider's future bookings (stubbed non-empty list), no room or equipment row is deleted (FR-007, FR-011)
- [X] T020 [US3] Implement `setActive(id, active)` in `MAIN/service/RoomService.java`: an unknown id raises `RoomNotFoundException` before the body is checked, `active == null` raises `InvalidRoomException`, otherwise return the room and the `FutureBookingsProvider` bookings (FR-006, FR-010, FR-011)
- [X] T021 [US3] Implement `PATCH /api/rooms/{id}/active` in `MAIN/api/RoomController.java`

---

## Phase 6: User Story 4 - Start with demo rooms (P3)

**Goal**: A fresh installation has five to six varied demo rooms, never duplicated.

**Independent Test**: Start on an empty database and list rooms; restart and list again.

- [X] T022 [US4] Create migration `backend/src/main/resources/db/migration/V3__seed_demo_rooms.sql` inserting six rooms with equipment (Aurora 4, Borealis 6, Cirrus 8, Delta 12, Everest 20, Fjord 2) with `name_key` and `item_key` filled (FR-012)
- [X] T023 [US4] Startup test in `TEST/startup/DemoRoomsTest.java`: a fresh database lists exactly six rooms with varied capacity and equipment, and a second start on the same file still lists six (FR-012, SC-003)

---

## Phase 7: Polish & Cross-Cutting

- [X] T024 [P] Add a list test with 500 generated rooms asserting the response arrives within 1 second in `TEST/service/RoomListPerformanceTest.java` (SC-001)
- [X] T025 Update the F00 tests `TEST/startup/DatabaseStartupTest.java` and `TEST/startup/SeedMechanismTest.java`, which assert exactly 1 row in `flyway_schema_history`, to expect the number of migrations now present (3), then run the whole suite `./mvnw test` in `backend/` and confirm the F00 tests (health, errors, startup) still pass (no regression)
- [X] T026 Run the quickstart validation in `specs/002-rooms-api/quickstart.md` against a running backend

---

## Dependencies & Execution Order

- Phase 1 -> Phase 2 -> user stories -> Polish.
- US1..US3 each depend on T002-T008; US3 also on T006. US4 only on T002.
- Within a story: tests first, then service, then controller.

## Parallel Opportunities

- T003, T004, T006 together; T009 and T010; T013-T015; T018 and T019.

## Implementation Strategy

MVP = Phase 1-2 + US1; then US2, US3, US4, polish.

## Phase 8: Convergence

- [X] T027 Add unit tests in `backend/src/test/java/com/roombook/service/RoomServiceTest.java` where the repository insert and update raise a `DataIntegrityViolationException` whose cause mentions `UNIQUE constraint failed: room.name_key`, expecting `DuplicateRoomNameException`, and one with an unrelated cause that must propagate unchanged, per FR-008 (partial)
