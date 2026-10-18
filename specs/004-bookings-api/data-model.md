# Data Model: Room Bookings

## Table `booking` (migration `V4__create_booking.sql`)

| Column | Type | Rules |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `room_id` | INTEGER NOT NULL | FOREIGN KEY -> `room(id)` |
| `title` | TEXT NOT NULL | trimmed, 1-100 characters |
| `organizer` | TEXT NOT NULL | trimmed, 1-100 characters, as typed |
| `organizer_key` | TEXT NOT NULL | `lower(trim(organizer))` |
| `start_at` | TEXT NOT NULL | UTC instant, format `yyyy-MM-ddTHH:mm:ssZ` |
| `end_at` | TEXT NOT NULL | UTC instant, same format, after `start_at` |
| `status` | TEXT NOT NULL | `CONFIRMED` or `CANCELLED` (CHECK), default `CONFIRMED` |
| `created_at` | TEXT NOT NULL | UTC instant |

Indexes: `(room_id, start_at)` for overlap and day queries; `(organizer_key)` for the organizer listing.

Nothing is ever deleted: cancellation only sets `status = 'CANCELLED'`; deactivating a room does not touch its bookings.

## Rules in the service layer

| Rule | Check | Outcome |
|------|-------|---------|
| Required fields | `roomId`, `title`, `organizer`, `start`, `end` present, text trimmed and 1-100 characters | 400 |
| Room exists | `room` row found | 404 |
| Room active | `room.active = 1` | 422 |
| Weekday | start and end dates are Monday-Friday in the office zone | 400 |
| Hours | start >= 08:00, end <= 20:00 local | 400 |
| Boundaries | minute in {0,15,30,45} and zero seconds for start and end | 400 |
| Same day | start and end have the same local date | 400 |
| Order and duration | end after start, duration <= 4 hours | 400 |
| Not past | start >= now (`Clock`) | 400 |
| No overlap | no confirmed booking of the room with `existing.start < new.end AND new.start < existing.end` | 409 |
| Cancellation window | `start - now >= 60 minutes` | 409 when fewer remain, or already started or ended |

## State transitions

`CONFIRMED -> CANCELLED` only; cancelling a `CANCELLED` booking is accepted without change.

## API shapes

`BookingInput`, `Booking`, `BookingStatus`, `BookingSummary` (reused in the room deactivation result): see `specs/001-project-setup/contracts/openapi.yaml`.
