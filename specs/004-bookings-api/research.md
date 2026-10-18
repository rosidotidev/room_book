# Research: Room Bookings

| Topic | Decision | Rationale | Alternatives considered |
|-------|----------|-----------|-------------------------|
| Contract | Extend `specs/001-project-setup/contracts/openapi.yaml` in place, done in this plan phase before any code: `BookingInput`, `Booking`, `BookingStatus`, the four operations, and the responses `Conflict` (409) and `RoomDeactivated` (422) next to the existing `BadRequest` and `NotFound` | Constitution I; single contract document | Separate file |
| Room deactivation | Contract unchanged: `RoomActivationResult.futureBookings` already exists; the real `FutureBookingsProvider` replaces `NoBookingsYetProvider` | FR-011 extends F01 behavior without a contract change | New field |
| Time zone | One office zone from property `roombook.zone`, default `Europe/Rome`, exposed as a `ZoneId` bean; requests accept any UTC offset, responses use the office offset | Clarification; the UI can read local hours directly | Always UTC (the UI would need the zone) |
| Storage of instants | `start_at`, `end_at` and `created_at` as TEXT in a fixed UTC format (`yyyy-MM-ddTHH:mm:ssZ`), so lexical order equals chronological order; the index `(room_id, start_at)` serves the overlap and day queries | Constitution V (migration), simple SQLite handling | Epoch integers (unreadable); local times (zone changes) |
| Overlap rule | Two confirmed bookings overlap when `a.start < b.end AND b.start < a.end`; touching ends do not overlap | Back-to-back allowed | Closed intervals |
| Rule order | Fields present (400) -> room exists (404) -> room active (422) -> time rules (400) -> overlap (409) | Deterministic, documented in the contract | Unspecified |
| Time rules | In the office zone: weekday Monday-Friday; minutes in {00,15,30,45} with zero seconds; start >= 08:00 and end <= 20:00; same local date; end after start; duration <= 4 h; start not before `Clock.instant()` | Spec FR-004, FR-005 and clarifications | Rounding |
| Cancellation | Allowed when `start - now >= 60 minutes`; idempotent for already cancelled bookings; a started or ended booking is refused with 409 | Clarification | Strict greater-than |
| Concurrency | `BookingService.create` is `@Transactional`; the overlap query and the insert run on the same connection, and the SQLite datasource has a single pooled connection, so two simultaneous requests are serialized: the second sees the first and gets 409. A concurrent test with 50 threads proves it | Spec FR-006, SC-001 | Application lock; unique-constraint trick (cannot express ranges) |
| Transactions with one connection | Repository methods must never run a query while another result set is open (learned in F01) | Pool size 1 | Larger pool plus `BEGIN IMMEDIATE` |
| Organizer matching | `organizer_key = lower(trim(organizer))`, stored with the booking | Clarification | Case-sensitive match |
| Limits | Title and organizer required, trimmed, at most 100 characters | Clarification | None |
| Response for DELETE | `200` with the cancelled `Booking` | The caller sees the new status; contract says soft delete | `204` |
| Error mapping | New exceptions `BookingRuleException` (400), `BookingConflictException` (409), `CancellationTooLateException` (409), `RoomDeactivatedException` (422), `BookingNotFoundException` (404), all as `problem+json` | Constitution VI | Generic exception |
| Tests | Contract tests per status code; unit tests per rule with `Clock.fixed`; concurrency test; regression of F01 and F00 suites | Plan input | |

## Open items

None.
