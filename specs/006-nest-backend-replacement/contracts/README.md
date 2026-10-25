# Contracts: Backend Replacement (Parity Migration)

The HTTP contract is **not** duplicated in this feature. The single source of truth is:

- [`specs/001-project-setup/contracts/openapi.yaml`](../../001-project-setup/contracts/openapi.yaml)

This feature does not modify that file (spec FR-002, SC-002). A contract test compares its SHA-256 with a stored baseline, so any change fails the build.

## Operations covered by the new service

| Operation | Method and path | Success | Documented error statuses |
|-----------|-----------------|---------|---------------------------|
| `getHealth` | GET `/api/health` | 200 | 503 |
| `listRooms` | GET `/api/rooms` | 200 | 400 |
| `createRoom` | POST `/api/rooms` | 201 | 400, 409 |
| `updateRoom` | PUT `/api/rooms/{id}` | 200 | 400, 404, 409 |
| `setRoomActive` | PATCH `/api/rooms/{id}/active` | 200 | 400, 404 |
| `createBooking` | POST `/api/bookings` | 201 | 400, 404, 409, 422 |
| `listBookingsByOrganizer` | GET `/api/bookings?organizer=` | 200 | 400 |
| `cancelBooking` | DELETE `/api/bookings/{id}` | 200 | 404, 409 |
| `getRoomAvailability` | GET `/api/rooms/{id}/availability?date=` | 200 | 400, 404 |

Every documented status code above has at least one contract test (constitution II).

## Error mapping

Each domain error maps to one status and one `title`. The `detail` names the field where the contract requires it. All bodies are `application/problem+json`.

| Domain error | Status | Title | Raised by |
|--------------|--------|-------|-----------|
| Invalid room input | 400 | Invalid room | rooms service (name, capacity, equipment, `minCapacity`, `active`) |
| Booking rule violation or missing booking field | 400 | Booking not allowed | bookings service |
| Malformed body / invalid date-time / invalid path id | 400 | (framework-level, matched by replay) | filter |
| Unknown room | 404 | Room not found | rooms, bookings |
| Unknown booking | 404 | Booking not found | bookings |
| Unknown route | 404 | (framework-level, matched by replay) | filter |
| Duplicate room name | 409 | Room name already exists | rooms |
| Slot overlap | 409 | Slot already booked | bookings |
| Cancellation too late | 409 | Too late to cancel | bookings |
| Deactivated room booked | 422 | Room not available | bookings |
| Unexpected failure | 500 | Internal Server Error | filter (generic detail, no internals) |

The health endpoint returns its `HealthReport` body with 200 or 503 and is not an error envelope.

## Request and response validation in tests

- Requests: bodies are validated against `RoomInput`, `ActiveChange` or `BookingInput` before they are sent, so the tests also prove the input shapes.
- Responses: every response body is validated against its operation's schema for the documented status, and against `Problem` for every error status.
- Schema loading: `yaml` parses the file; `$ref`s into `components` are resolved; `ajv` with `ajv-formats` compiles them.

## Frontend client

The frontend keeps using the client generated from the contract (`openapi-generator-cli`, unchanged). No regeneration is required by this feature, because the contract does not change.
