# Data Model: Backend Replacement (Parity Migration)

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

The schema is the one created by the existing versioned migrations V1–V4, reused unchanged. This document maps each entity to its tables, the API shape defined by `specs/001-project-setup/contracts/openapi.yaml`, and the rules that apply. No table or column is added by this feature.

## Storage objects

| Object | Source | Role in the new service |
|--------|--------|-------------------------|
| `flyway_schema_history` | Created by Flyway in the current service | Read-only baseline check: versions 1–4 must exist with `success = 1` (FR-006, FR-007). Never written. |
| `health_probe` | V1 | Write/read/delete probe for `/api/health`. |
| `room` | V2 | Rooms. |
| `room_equipment` | V2 | Equipment items per room. |
| `booking` | V4 | Bookings. |
| `schema_migrations` | Created by the new runner only when a version V5+ is pending | Tracks versions applied by the new runner. Absent in the copy today. |

Seed data from V3 (six demo rooms) is already in the copy; V3 is not re-run.

## Room

Contract schema: `Room` (`id`, `name`, `capacity`, `equipment[]`, `active`). Input: `RoomInput` (`name` 1–100, `capacity` 1–1000, `equipment[]` ≤ 20 items, each 1–50 characters).

| Field | Column | Type | Rules |
|-------|--------|------|-------|
| id | `room.id` | integer (int64) | Autoincrement; never supplied by clients. |
| name | `room.name` | text | Trimmed; required; ≤ 100 characters. |
| name key | `room.name_key` | text, UNIQUE | `trim(name).toLowerCase()`. Duplicate → 409 "Room name already exists". |
| capacity | `room.capacity` | integer | 1–1000 (service rule); DB `CHECK (capacity > 0)`. |
| equipment | `room_equipment.item`, `item_key` | text | Each trimmed, non-empty, ≤ 50 characters; duplicates ignored by `item_key` (`trim().toLowerCase()`), first spelling kept. Max 20 items per request. |
| active | `room.active` | integer 0/1 | Mapped to boolean. Default `true` on create. |

**Relationships**: a room has zero or more equipment items (`room_equipment.room_id → room.id`) and zero or more bookings.

**State**: `active` toggles freely (`PATCH /api/rooms/{id}/active`). Setting the current state is accepted. Nothing is deleted on deactivation; the response lists the room's future confirmed bookings (`BookingSummary`).

**Listing**: all rooms including inactive ones; optional `minCapacity` (≥ 1, else 400 "Invalid room") and `equipment` (matched by `item_key`).

## Booking

Contract schema: `Booking` (`id`, `roomId`, `title`, `organizer`, `start`, `end`, `status`, `createdAt`). Input: `BookingInput` (`roomId`, `title` 1–100, `organizer` 1–100, `start`, `end` with UTC offset).

| Field | Column | Type | Rules |
|-------|--------|------|-------|
| id | `booking.id` | integer | Autoincrement. |
| roomId | `booking.room_id` | integer | Must reference an existing room (else 404). |
| title | `booking.title` | text | Trimmed; required; ≤ 100 characters. |
| organizer | `booking.organizer` | text | Trimmed; required; ≤ 100 characters. |
| organizer key | `booking.organizer_key` | text, indexed | `trim().toLowerCase()`; used for `GET /api/bookings?organizer=`. |
| start | `booking.start_at` | text `yyyy-MM-ddTHH:mm:ssZ` (UTC) | Input may carry any offset; stored as UTC without fractional seconds (truncated). Output: office offset. |
| end | `booking.end_at` | text (same format) | Must be after start. |
| status | `booking.status` | text `CONFIRMED` / `CANCELLED` | Default `CONFIRMED`; DB CHECK constraint. |
| createdAt | `booking.created_at` | text (UTC) | Set from the Clock on creation. |

**Validation rules** (checked in this order, after fields are present):

1. Field presence: `title`, `organizer`, `roomId`, `start`, `end` — 400 naming the field.
2. Room exists — 404 "Room not found".
3. Room active — 422 "Room not available".
4. Office-local weekday: start and end on Monday–Friday — 400.
5. Start and end between 08:00 and 20:00 inclusive (office time) — 400.
6. Start and end on a 15-minute boundary (minute ∈ {0, 15, 30, 45}, seconds 0) — 400.
7. Start and end on the same office-local calendar day — 400.
8. End strictly after start — 400.
9. Duration ≤ 4 hours (elapsed time) — 400.
10. Start not before the current time (from the Clock) — 400.
11. No overlap with a CONFIRMED booking of the same room: `existing.start < new.end AND new.start < existing.end` (half-open; back-to-back allowed) — 409 "Slot already booked".

**Cancellation** (`DELETE /api/bookings/{id}`):
- Booking missing → 404.
- Already CANCELLED → return the booking unchanged (200), regardless of the window.
- Otherwise allowed only while `start − now ≥ 60 minutes`; else 409 "Too late to cancel".
- Transition: `CONFIRMED → CANCELLED` (soft; row kept). No other transitions exist.

**Listing rules**:
- By organizer: any status, ordered by `start_at, id`; organizer matched by `organizer_key`.
- Availability (`GET /api/rooms/{id}/availability?date=`): CONFIRMED only, bookings whose start falls within the office-local day, ordered by `start_at`. Unknown room → 404.

## Health report

Contract schema `HealthReport`: `status` (UP/DOWN), `database` (UP/DOWN), `time` (date-time).

- Probe: insert, read back, delete one row in `health_probe` (id 1), in one transaction.
- Both `status` and `database` are UP when the probe succeeds, otherwise both DOWN; HTTP 200 or 503 accordingly.

## Schema history check (startup)

Not part of the API. Internal entity used by the runner:

| Field | Source | Rule |
|-------|--------|------|
| version | `flyway_schema_history.version` | Must include `1`, `2`, `3`, `4`. |
| success | `flyway_schema_history.success` | Must be `1` for each of those versions. |

Description and checksum are not compared (clarification 2). A missing file, a missing version, or a version with `success = 0` → the process exits with a message; no data is written.

## Error envelope

Shape of every error body (contract schema `Problem`): `type` (default `about:blank`), `title`, `status`, `detail`, `instance`. Content type `application/problem+json`. Status and title per error are listed in [contracts/README.md](./contracts/README.md).

## Time handling summary

| Context | Representation |
|---------|----------------|
| Storage (`start_at`, `end_at`, `created_at`) | UTC text, second precision, `Z` suffix |
| Input (`start`, `end`) | ISO-8601 with any offset |
| Rule evaluation | Office zone `Europe/Rome` (weekday, hour, date); elapsed time for duration and cancellation window |
| Output (`start`, `end`, `createdAt`) | Office zone offset, e.g. `2026-10-19T10:00:00+02:00` |
| Health `time` | UTC instant from the Clock |

## DTO files and transaction ownership (amendment 2026-10-24)

Each module has one DTO file, following the pattern of specs 002 and 004:

| File | Input types (nullable, as bound from the request) | Output types |
|------|---------------------------------------------------|--------------|
| `rooms/rooms.dto.ts` | `RoomInput`, `ActiveChange` | `Room`, `RoomActivationResult`, `BookingSummary` |
| `bookings/bookings.dto.ts` | `BookingInput` | `Booking` (replaces `booking.mapper.ts`) |
| `health/health.dto.ts` | none | `HealthReport` |

- The controller binds the JSON body and parameters into an input type; the service receives it and applies the rules (FR-022).
- The mapping from internal records to output types lives in the same DTO file.
- Transactions: `RoomsService`, `BookingsService` and `HealthService` open them; repositories run single statements (FR-023). The migration runner keeps its own transaction as infrastructure.

## Concurrency

Create-booking runs the room lookup, validation, overlap query and insert inside one `BEGIN IMMEDIATE` transaction. Because the process has a single connection and the driver is synchronous, two simultaneous requests for overlapping slots result in exactly one CONFIRMED booking and one 409 (spec edge case).
