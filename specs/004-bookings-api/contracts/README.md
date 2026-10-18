# Contract

Single shared document:
[`specs/001-project-setup/contracts/openapi.yaml`](../../001-project-setup/contracts/openapi.yaml).

This feature extended it, before any code, with:

- `POST /api/bookings` (201, 400, 404, 409, 422)
- `GET /api/bookings?organizer=` (200, 400)
- `DELETE /api/bookings/{id}` (200, 404, 409)
- `GET /api/rooms/{id}/availability?date=` (200, 400, 404)
- schemas `BookingInput`, `Booking`, `BookingStatus`
- responses `Conflict` (409) and `RoomDeactivated` (422)

The room deactivation result of the rooms catalog already carries `futureBookings`; this feature fills it with real data and does not change its shape.

The bookings screens (a later feature) treat this contract as fixed.
