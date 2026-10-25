# Feature Specification: Backend Replacement (Parity Migration)

**Feature Branch**: `006-nest-backend-replacement` (not created; no branch hook is registered)

**Created**: 2026-10-24

**Status**: Draft

**Input**: User description: "Replace the RoomBook backend with a new implementation in backend-nest/, without changing visible behaviour. The HTTP contract defined in specs/001-project-setup/contracts/openapi.yaml stays unchanged and the frontend is not modified. The business rules (overlaps, opening hours 08:00–20:00 Monday to Friday, 15-minute slots, maximum duration 4 hours, no booking in the past, cancellation up to one hour before the start, disabled rooms not bookable) stay identical. Errors stay in application/problem+json format with the same status codes. The data already present in backend/data/roombook.db must be readable by the new backend through a copy of the file. No new feature is included."

## Clarifications

### Session 2026-10-24

- Q: Since the frontend has no test files, what should count as proof that the new backend behaves exactly like the current one? → A: Replay a recorded set of at least 50 requests against both services on identical data copies and compare status, content type and body.
- Q: When the new service starts on a database copy, should it accept the copy only if the four recorded versions match by number and success flag, or also by file checksum? → A: Version numbers and success flags only; descriptions and checksums are not compared.
- Q: When two organizers submit overlapping bookings for the same room at the same moment, should exactly one be confirmed and the other rejected with 409? → A: Yes, exactly one is confirmed; the other is rejected with 409 as for any overlap.

### Amendment 2026-10-24 (structure of the new implementation)

**Input**: amendment to feature 006 requested by the owner. No new user-facing behaviour: the HTTP contract, the business rules and the error format are unchanged. The amendment only fixes how the new implementation is organised internally, so that it follows the same DTO pattern used by the earlier specs (002 and 004) and so that transactions sit only in the service layer (Constitution III).

**Decisions taken without asking (recorded as assumptions below)**:

- The amendment is applied to this feature directory, not to a new feature, because it changes the implementation of feature 006 itself.
- The DTO pattern is the one of specs 002 and 004: one DTO file per module, holding the input types (fields nullable, as bound from the request) and the output types.
- Transactions are opened only by services. Repositories run single statements.

## Scope

This is a replacement, not a new product increment. The RoomBook service that today runs from `backend/` is re-implemented in `backend-nest/`. From the point of view of the Angular frontend and of any other HTTP client, the new service must be indistinguishable from the current one: same endpoints, same request and response bodies, same status codes, same error bodies, same business outcomes.

The frontend is not modified by this feature. The API contract `specs/001-project-setup/contracts/openapi.yaml` is not modified by this feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The frontend works unchanged on the new service (Priority: P1)

An existing user of RoomBook (a person using the room list or booking screens) keeps using the application exactly as before. Every screen that currently works against the old service works the same way against the new one: listing and filtering rooms, creating, editing and activating or deactivating rooms, booking a room, listing an organizer's bookings, viewing a room's day availability, and cancelling a booking.

**Why this priority**: If the frontend does not work without changes, the replacement has failed. This is the primary acceptance condition.

**Independent Test**: With the new service running and the frontend pointed at it, replay the recorded parity request set (SC-003) against the current and the new service and confirm every response matches. The frontend is not changed.

**Acceptance Scenarios**:

1. **Given** the new service is running with the copied data, **When** the frontend loads the room list, **Then** the same rooms, capacities, equipment and active flags are shown as with the current service.
2. **Given** the new service is running, **When** a user creates a booking that is valid under the business rules, **Then** the booking is confirmed and appears in the room's availability and in the organizer's list.
3. **Given** a booking exists, **When** the user cancels it at least one hour before its start, **Then** it is shown as cancelled and the slot becomes free again.

---

### User Story 2 - Existing data keeps working through a copy of the database file (Priority: P1)

The rooms and bookings already stored in `backend/data/roombook.db` (six rooms with their equipment, and existing bookings in confirmed and cancelled state) are visible and usable from the new service. The new service works on a copy of that file, so the original file is never changed by it and the old service and the new service never write to the same file.

**Why this priority**: Without the existing data, the replacement cannot be used or compared with the current service. Using a copy also protects the data during the coexistence period.

**Independent Test**: Make a copy of `backend/data/roombook.db`, point the new service at the copy, and request the room list and the bookings of each organizer present in the data. The results match the results of the current service on the original file. The original file's contents and modification are unchanged after the test.

**Acceptance Scenarios**:

1. **Given** a copy of the existing database file, **When** the new service starts, **Then** it starts without error and does not alter any existing room or booking.
2. **Given** the copy contains bookings stored with UTC times, **When** they are returned by the service, **Then** their start and end times are presented in the same office-time form as the current service returns.
3. **Given** the copy already records the four schema versions that the current service applied, **When** the new service starts, **Then** it does not attempt to re-create existing tables or re-apply those versions, and it does not change the recorded history.
4. **Given** the new service is configured to use the copy, **When** the original file is also in use by the current service, **Then** neither service writes to the other's file.

---

### User Story 3 - Booking rules behave exactly as before (Priority: P2)

A booking is accepted only if it satisfies all rules that the current service enforces, and each rejected booking is rejected for the same reason and with the same status code as today. The rules are: the room must exist and be active; start and end must be on Monday to Friday; start and end must be between 08:00 and 20:00 (office time); start and end must fall on 15-minute boundaries (:00, :15, :30, :45); start and end must be on the same day; the end must be after the start; the duration must not exceed 4 hours; the start must not be in the past; the slot must not overlap a confirmed booking of the same room. Back-to-back bookings (one ending exactly when the next starts) are allowed. A booking can be cancelled while at least 60 minutes remain before its start; cancelling an already cancelled booking is accepted without error.

**Why this priority**: These rules are the product's behaviour. Any drift changes what users can and cannot book.

**Independent Test**: Run a fixed set of booking requests, covering each rule at its boundary and just outside it, against the current service and the new service on identical copies of the data, with the same notion of "now". The outcome (accepted or rejected, status code, and the rejection reason) is identical for every request.

**Acceptance Scenarios**:

1. **Given** a request starting at 19:45 and ending at 20:00 on a weekday, **When** it is submitted, **Then** it is accepted.
2. **Given** a request ending at 20:15, **When** it is submitted, **Then** it is rejected with status 400.
3. **Given** a request on a Saturday, **When** it is submitted, **Then** it is rejected with status 400.
4. **Given** a request lasting 4 hours and 15 minutes, **When** it is submitted, **Then** it is rejected with status 400.
5. **Given** a confirmed booking from 10:00 to 11:00 in a room, **When** another booking from 10:30 to 11:30 is submitted for that room, **Then** it is rejected with status 409; a booking from 11:00 to 12:00 is accepted.
6. **Given** a booking whose start is 59 minutes away, **When** the organizer cancels it, **Then** the request is rejected with status 409; a booking starting in 60 minutes or more can be cancelled.
7. **Given** a deactivated room, **When** a booking is submitted for it, **Then** the request is rejected with status 422. **Given** a room with future bookings, **When** it is deactivated, **Then** the result lists those future bookings and nothing is deleted.

---

### User Story 4 - Errors keep their format and status codes (Priority: P2)

Every error response is `application/problem+json` with the same fields and the same status code as the current service. The detail text names the invalid field where the contract says it does. Requests for unknown rooms or bookings return 404; duplicate room names return 409; invalid input returns 400; deactivated rooms return 422; slot conflicts and late cancellations return 409.

**Why this priority**: The frontend shows these errors to users as readable messages; a change in format or code would break the screens.

**Independent Test**: Send a fixed set of invalid requests (missing fields, wrong types, unknown identifiers, duplicate names, malformed bodies, unknown paths) to both services and compare status code, content type and body structure.

**Acceptance Scenarios**:

1. **Given** a request for a room that does not exist, **When** it is submitted, **Then** the response is 404 with a problem document.
2. **Given** a room name that already exists ignoring letter case and surrounding spaces, **When** a room is created with it, **Then** the response is 409 with a problem document.
3. **Given** a request with a malformed body or a missing required field, **When** it is submitted, **Then** the response is 400 with a problem document whose detail names the field.
4. **Given** a request to a path that does not exist, **When** it is submitted, **Then** the response has the same status code and problem format as the current service.

---

### User Story 5 - Health check reports the real state (Priority: P3)

The health endpoint reports whether the service is up and whether the database answers a write and a read, with the same 200 and 503 outcomes as the current service.

**Why this priority**: Operators and the start-up scripts rely on it, but it is not part of the day-to-day booking flow.

**Independent Test**: Call the health endpoint with the database available (expect 200 with both statuses UP) and with the database file unavailable or read-only (expect 503 with the database status DOWN).

**Acceptance Scenarios**:

1. **Given** a working database, **When** the health endpoint is called, **Then** it returns 200 with status UP, database UP and the current time.
2. **Given** the database cannot be written, **When** the health endpoint is called, **Then** it returns 503 with the database reported as DOWN.

---

### Edge Cases

- A room name that differs only by letter case or surrounding spaces from an existing name is a duplicate.
- Organizer matching in the bookings list ignores letter case and surrounding spaces, and cancelled bookings are included there but not in the day availability.
- Equipment filtering ignores letter case and surrounding spaces.
- A booking that starts exactly at the current time is not "in the past"; a booking whose start is before the current time is rejected.
- Times supplied with a UTC offset are evaluated in office time; a time that is on a weekday in UTC but on a weekend in office time is rejected.
- Daylight-saving transitions in the office time zone do not change the opening hours, slot boundaries or the 4-hour maximum as they are evaluated today.
- A deactivated room keeps its bookings; the activation result lists its future bookings and nothing is deleted.
- Setting a room to the state it already has is accepted.
- Two overlapping booking requests for the same room arriving at the same moment: exactly one is confirmed; the other is rejected with 409.
- Cancelling a booking that is already cancelled returns the booking, not an error, even if the 60-minute window has passed.
- A copy of the database that has not yet recorded the four versions, or has a different recorded history, must not be silently altered; the service must refuse to start rather than change the data.
- If the copy file is missing, the service must not create an empty database in its place and present it as the existing data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The new implementation MUST live in `backend-nest/` and replace the current service's behaviour for every endpoint defined in `specs/001-project-setup/contracts/openapi.yaml`.
- **FR-002**: The API contract file `specs/001-project-setup/contracts/openapi.yaml` MUST NOT be changed by this feature; its content must be byte-identical before and after.
- **FR-003**: The frontend MUST NOT be changed by this feature.
- **FR-004**: For each endpoint, the new service MUST return the same status codes, the same response body fields and value formats, and the same content types as the contract and the current service do for the same input and data.
- **FR-005**: The new service MUST read the rooms, equipment and bookings from a copy of `backend/data/roombook.db` and MUST NOT modify the original file.
- **FR-006**: The new service MUST recognise the four schema versions already recorded in the copied database and MUST NOT re-create existing tables or alter recorded history.
- **FR-007**: The new service MUST refuse to start, with a clear error, when the database file is missing or when its recorded schema history does not match the expected versions, and MUST NOT create or alter data in that case. A match means versions 1 to 4 are recorded and marked successful; descriptions and checksums are not compared.
- **FR-008**: The new service MUST reject a booking that overlaps a confirmed booking of the same room, and MUST allow back-to-back bookings.
- **FR-009**: The new service MUST accept booking times only between 08:00 and 20:00 office time, Monday to Friday, on 15-minute boundaries, on a single day, with an end after the start and a duration of at most 4 hours.
- **FR-010**: The new service MUST reject a booking whose start is in the past relative to the current time.
- **FR-011**: The new service MUST allow cancellation of a booking only while at least 60 minutes remain before its start, MUST treat cancellation of an already cancelled booking as successful, and MUST keep cancelled bookings in the record (soft cancellation).
- **FR-012**: The new service MUST reject bookings for deactivated rooms, and MUST report the future bookings of a room when its active state changes, without deleting anything.
- **FR-013**: The new service MUST enforce room rules as today: name required and at most 100 characters, unique ignoring case and surrounding spaces; capacity between 1 and 1000; equipment at most 20 items, each non-empty and at most 50 characters, with duplicates ignored ignoring case.
- **FR-014**: The new service MUST enforce booking field rules as today: title and organizer required and at most 100 characters; organizer matching ignores letter case and surrounding spaces.
- **FR-015**: Business rules MUST be evaluated against the current time as supplied by the service, so that the same rules can be checked with a fixed, known time.
- **FR-016**: Every error response MUST be `application/problem+json` containing the fields defined by the contract's Problem schema, and MUST use the same status code as the current service for the same error.
- **FR-017**: Times MUST be evaluated in the office time zone (Europe/Rome) and returned in the office time zone offset, as the current service does, even though the stored data uses UTC.
- **FR-018**: The health endpoint MUST return 200 when the database answers a write and a read, and 503 with the database reported as DOWN otherwise.
- **FR-019**: The feature MUST NOT add any endpoint, field, rule, or user-visible capability beyond what the current service provides.
- **FR-020**: Every operation defined in `specs/001-project-setup/contracts/openapi.yaml` MUST have at least one contract test, and every status code documented for that operation MUST be asserted by at least one contract test. Contract tests validate request and response bodies against the contract and are written before the code they test.
- **FR-021**: The feature MUST NOT remove, rename, or modify the current service in `backend/`, or the frontend in `frontend/`. The current service stays in place as the parity reference and as the running service until the owner decides otherwise in a separate, explicit change. No task in this feature deletes or renames `backend/`.

- **FR-022**: Each module (rooms, bookings, health) MUST keep its data transfer shapes in one DTO file per module. That file holds the input types, whose fields are nullable as bound from the request, and the output types returned to the controller. Controllers MUST bind the request into these input types and services MUST receive them. A DTO MUST NOT hold a business rule; rules stay in the service (Constitution III).
- **FR-023**: Database transactions MUST be opened only in the service layer. Repositories MUST execute single statements and MUST NOT open or commit a transaction. The health probe's write, read and delete round trip is coordinated by `HealthService`; the room writes that span several statements are coordinated by `RoomsService`. Each transaction keeps its current behaviour: create and cancel of bookings use an immediate transaction; the migration runner is infrastructure outside the service layer and keeps its own transaction.

### Key Entities *(include if feature involves data)*

- **Room**: a meeting room with a unique name, a capacity, a set of equipment items and an active flag. Existing rooms and their equipment must be preserved as they are.
- **Booking**: a reservation of one room by an organizer, with a title, a start and end time, a status (confirmed or cancelled) and a creation time. Cancelled bookings are kept.
- **Organizer**: a free-text name attached to bookings; it is not an account and has no authentication.
- **Database copy**: the working copy of `backend/data/roombook.db` that the new service reads and writes. It holds the schema history of the four versions already applied by the current service.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every request in the recorded parity set (SC-003) returns the same status code, content type and body from the new service as from the current service, with no change to the frontend.
- **SC-002**: The API contract file is identical before and after the feature, verified by comparing its content.
- **SC-003**: For a fixed set of at least 50 requests covering every endpoint, every business rule and every documented error, the new service and the current service return the same status code, the same content type and the same response body on identical copies of the data, with the same current time.
- **SC-004**: The original database file is unchanged (same content) after the new service has run its full test set against a copy.
- **SC-005**: The new service starts successfully on a copy of the existing database and lists all six rooms and all existing bookings.
- **SC-006**: The new service refuses to start on a missing or mismatched database in 100% of tested cases, and in none of them creates or modifies data.
- **SC-007**: No new user-visible feature, endpoint, field or rule is observable compared with the current service.

## Assumptions

- The current service's observable behaviour, including its error messages' status codes and body structure, is the reference. Where the contract is silent but the current service has a behaviour (for example the exact wording of detail text), the current behaviour is kept.
- The database copy is placed at a configurable path; its default location is `backend-nest/data/roombook.db`. The copy is made by the operator before the new service is started; the feature does not automate the copy.
- Coexistence: during the migration period, the current service and the new service are never pointed at the same database file.
- Authentication, roles, notifications, recurring bookings, external calendars and multi-site support remain out of scope, as in the constitution.
- The office time zone is Europe/Rome, as configured today.
- Removing `backend/` and renaming `backend-nest/` (the "cutover") is not part of this feature. It is not a behaviour of the service, is not specified here, and is excluded from its tasks (see FR-021). It requires a separate, explicit decision by the owner.
- Testing the new service against the current service on identical data is the evidence of parity; the exact test tooling is a planning decision.
- Amendment 2026-10-24: the DTO file of each module is named `<module>.dto.ts` in `backend-nest/src/<module>/`; the existing `booking.mapper.ts` is merged into `bookings.dto.ts`, and the DTO of the rooms module is `rooms.dto.ts`. The migration runner is not a repository and keeps its transaction.
- The recorded parity request set and the contract document are the acceptance references and are not modified. The frontend has no automated test files, so it is not an acceptance reference.
