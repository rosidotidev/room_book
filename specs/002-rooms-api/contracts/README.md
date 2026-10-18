# Contract

The API contract is a single document shared by all features:
[`specs/001-project-setup/contracts/openapi.yaml`](../../001-project-setup/contracts/openapi.yaml).

This feature extended it, before any code, with:

- `GET /api/rooms`, `POST /api/rooms`
- `PUT /api/rooms/{id}`
- `PATCH /api/rooms/{id}/active`
- schemas `Room`, `RoomInput`, `ActiveChange`, `RoomActivationResult`, `BookingSummary`
- reusable `problem+json` responses `BadRequest` (400), `NotFound` (404), `DuplicateName` (409)
