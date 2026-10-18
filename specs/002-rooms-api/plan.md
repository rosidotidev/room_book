# Implementation Plan: Rooms Catalog

**Branch**: `002-rooms-api` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-rooms-api/spec.md`

## Summary

Add the room catalog to the backend: list with filters, create, update and activate/deactivate, with unique case-insensitive names, validated input and a seeded set of demo rooms. The contract is extended first (already done); then migrations, repository, service and controller; every endpoint and status code is covered by contract tests. No frontend changes. Decisions in [research.md](research.md).

## Technical Context

**Language/Version**: Java 21, Spring Boot 3.5 (as the foundation)

**Primary Dependencies**: Spring Web, Spring JDBC, sqlite-jdbc, Flyway; swagger-request-validator (tests)

**Storage**: SQLite; tables `room` and `room_equipment`, seed through a Flyway migration

**Testing**: JUnit 5, MockMvc contract tests against `openapi.yaml`, service unit tests with a fixed `Clock` where time is involved (none needed here)

**Target Platform**: Developer workstation

**Project Type**: web application (backend only in this feature)

**Performance Goals**: list and filter in under 1 s with up to 500 rooms (SC-001)

**Constraints**: Contract changed before code; rules in the service layer; errors as `problem+json`; schema only via migrations

**Scale/Scope**: 4 endpoints, 2 tables, about 6 seed rooms

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | How the plan satisfies it |
|-----------|--------|---------------------------|
| I. API-First | PASS | `openapi.yaml` extended in the plan phase, before any code |
| II. Contract tests | PASS | Each of the four endpoints and each documented status (200, 201, 400, 404, 409) has a contract test |
| III. Rules in service layer | PASS | Validation, uniqueness and normalisation in `RoomService`; controller maps HTTP only |
| IV. Deterministic time | PASS | No time-dependent logic in this feature |
| V. Versioned migrations | PASS | `V2__create_room.sql`, `V3__seed_demo_rooms.sql` |
| VI. Problem+JSON | PASS | New exceptions mapped by `ApiExceptionHandler` |
| VII. Monorepo layout | PASS | Backend only, plus specs |
| VIII. No authentication | PASS | Admin operations are open |
| IX-XI. UI principles | N/A | No UI in this feature |

No violations; Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-rooms-api/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/README.md      # points to the shared openapi.yaml
├── checklists/
└── tasks.md                 # created by /speckit-tasks
```

### Source Code (repository root)

```text
specs/001-project-setup/contracts/openapi.yaml   # extended in place

backend/src/main/
├── java/com/roombook/
│   ├── api/RoomController.java
│   ├── api/RoomDto.java                  # Room, RoomInput, ActiveChange, RoomActivationResult, BookingSummary records
│   ├── api/ApiExceptionHandler.java      # + room exception mappings
│   ├── service/RoomService.java
│   ├── service/RoomNotFoundException.java
│   ├── service/DuplicateRoomNameException.java
│   ├── service/InvalidRoomException.java
│   ├── service/FutureBookingsProvider.java
│   ├── service/NoBookingsYetProvider.java
│   └── repository/RoomRepository.java
└── resources/db/migration/
    ├── V2__create_room.sql
    └── V3__seed_demo_rooms.sql

backend/src/test/java/com/roombook/
├── contract/RoomListContractTest.java
├── contract/RoomCreateContractTest.java
├── contract/RoomUpdateContractTest.java
├── contract/RoomActiveContractTest.java
├── service/RoomServiceTest.java
└── startup/DemoRoomsTest.java
```

**Structure Decision**: Same layered backend as the foundation; the single contract document is extended in place, so there is no per-feature contract file.
