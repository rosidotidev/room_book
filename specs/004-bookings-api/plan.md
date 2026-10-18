# Implementation Plan: Room Bookings

**Branch**: `004-bookings-api` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-bookings-api/spec.md`

## Summary

Add bookings to the backend with the business rules that make the product worth specifying: no overlaps (back-to-back allowed), office hours on weekdays on 15-minute boundaries, at most 4 hours, not in the past, a cancellation window of at least 60 minutes, deactivated rooms not bookable, and future bookings reported on room deactivation. The contract is extended first (done); rules live in `BookingService` and use the injectable `Clock`; the overlap check and the insert share one transaction. No frontend changes. Decisions in [research.md](research.md).

## Technical Context

**Language/Version**: Java 21, Spring Boot 3.5

**Primary Dependencies**: Spring Web, Spring JDBC, sqlite-jdbc, Flyway; swagger-request-validator (tests)

**Storage**: SQLite; table `booking` with a foreign key to `room` and an index on `(room_id, start_at)`

**Testing**: JUnit 5; MockMvc contract tests per status code; unit tests per rule with `Clock.fixed`; a 50-thread concurrency test; regression of the F00 and F01 suites

**Target Platform**: Developer workstation

**Project Type**: web application (backend only in this feature)

**Performance Goals**: room-day and organizer listings under 1 s with 10,000 bookings (SC-004)

**Constraints**: Contract before code; rules in the service layer; no `now()` without the `Clock`; schema only through migrations; one pooled SQLite connection (no query while a result set is open)

**Scale/Scope**: 4 operations, 1 table, 5 exceptions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | How the plan satisfies it |
|-----------|--------|---------------------------|
| I. API-First | PASS | `openapi.yaml` extended in the plan phase, before any code |
| II. Contract tests | PASS | Every operation and each status (200, 201, 400, 404, 409, 422) has a contract test |
| III. Rules in service layer | PASS | All rules in `BookingService`; controller maps HTTP only |
| IV. Deterministic time | PASS | `Clock` for "now", a zone bean for the office day; tests use a fixed clock |
| V. Versioned migrations | PASS | `V4__create_booking.sql` |
| VI. Problem+JSON | PASS | New exceptions mapped by `ApiExceptionHandler` |
| VII. Monorepo layout | PASS | Backend and specs only |
| VIII. No authentication | PASS | Organizer is free text |
| IX-XI. UI principles | N/A | No UI in this feature |

No violations; Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/004-bookings-api/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md
├── checklists/
└── tasks.md                 # created by /speckit-tasks
```

### Source Code (repository root)

```text
specs/001-project-setup/contracts/openapi.yaml   # extended in place

backend/src/main/
├── java/com/roombook/
│   ├── config/OfficeZoneConfig.java             # ZoneId bean from roombook.zone
│   ├── api/BookingDto.java                      # BookingInput, Booking
│   ├── api/BookingController.java               # 4 operations
│   ├── api/RoomDto.java                         # BookingSummary uses the office offset
│   ├── api/ApiExceptionHandler.java             # + booking exception mappings
│   ├── service/BookingService.java              # rules, overlap check, cancellation
│   ├── service/BookingRules.java                # pure time rules (testable with a fixed clock)
│   ├── service/Booking*Exception.java           # rule (400), not found (404), conflict (409), too late (409)
│   ├── service/RoomDeactivatedException.java    # 422
│   ├── service/BookingBackedFutureBookings.java # real FutureBookingsProvider (replaces NoBookingsYetProvider)
│   └── repository/BookingRepository.java
└── resources/db/migration/V4__create_booking.sql

backend/src/test/java/com/roombook/
├── contract/BookingCreateContractTest.java      # 201, 400, 404, 409, 422
├── contract/BookingQueryContractTest.java       # availability and organizer: 200, 400, 404
├── contract/BookingCancelContractTest.java      # 200, 404, 409
├── contract/RoomDeactivationBookingsContractTest.java
├── service/BookingRulesTest.java                # every rule with Clock.fixed
├── service/BookingServiceTest.java              # precedence, overlap, back-to-back, cancellation
└── service/BookingConcurrencyTest.java          # 50 threads, one slot
```

**Structure Decision**: Same layered backend; pure time rules are separated from persistence so each rule is unit-tested with a fixed clock.
