# Research: Rooms Catalog

| Topic | Decision | Rationale | Alternatives considered |
|-------|----------|-----------|-------------------------|
| Contract location | Extend `specs/001-project-setup/contracts/openapi.yaml` in place (already done in this plan phase). `specs/002-rooms-api/contracts/README.md` points to it | Constitution I and F00 decision: one document, extended by later features | A second contract file per feature (violates "single document") |
| Persistence | Plain `JdbcTemplate` repositories, as in F00 | Consistent with the foundation; explicit SQL | JPA |
| Tables | `room` (`id` autoincrement, `name`, `name_key` UNIQUE, `capacity` CHECK > 0, `active`) and `room_equipment` (`room_id` FK, `item`, `item_key`, UNIQUE (`room_id`,`item_key`)) | `name_key` and `item_key` hold `lower(trim(...))` so uniqueness and matching ignore case and spaces (spec clarifications); a child table makes the equipment filter a simple EXISTS | One JSON/CSV column (awkward filtering) |
| Validation | In `RoomService`, raising `InvalidRoomException`; limits from the contract: name 1-100, capacity 1-1000, up to 20 equipment items of 1-50 characters; `minCapacity` >= 1 | Constitution III: rules live in the service layer, the controller only maps HTTP | Bean Validation annotations on DTOs (rules in the web layer) |
| Normalisation | Name and equipment items are trimmed; equipment items are de-duplicated ignoring case; first spelling is kept | Spec clarifications | Reject duplicates in a request |
| Duplicate name | Service pre-checks `name_key`; the UNIQUE constraint is the safety net and a constraint violation is also mapped to 409. Saving a room under its own name is allowed | FR-008, concurrency safety | Pre-check only |
| Error mapping | `RoomNotFoundException` -> 404, `DuplicateRoomNameException` -> 409, `InvalidRoomException` -> 400, via the existing `ApiExceptionHandler`; type mismatch on `minCapacity` -> 400 by the framework handler | Constitution VI | New handler class |
| Future bookings | `FutureBookingsProvider` interface in the service layer; this feature wires an implementation returning an empty list. The bookings feature replaces it | FR-011 without a bookings table yet | Hard-coded empty list in the controller |
| Seed | Migration `V3__seed_demo_rooms.sql` in `db/migration` inserting 6 rooms | FR-012: must exist on first start with no manual step; Flyway runs it once so restarts never duplicate. The optional `db/seed` profile from F00 stays available | Runner at startup (not versioned, violates constitution V) |
| 201 response | `POST` returns 201 with the room and a `Location` header | Contract | 200 |
| List ordering | By `name_key` ascending | Deterministic output for tests and UI | Unordered |
| PATCH body | `{ "active": true|false }` | Contract | Separate activate/deactivate endpoints |

## Open items

None.
