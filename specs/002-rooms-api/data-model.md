# Data Model: Rooms Catalog

## Tables (migration `V2__create_room.sql`)

### room
| Column | Type | Rules |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `name` | TEXT NOT NULL | trimmed, 1-100 characters |
| `name_key` | TEXT NOT NULL UNIQUE | `lower(trim(name))`, maintained by the service |
| `capacity` | INTEGER NOT NULL | CHECK (`capacity` > 0); contract maximum 1000 |
| `active` | INTEGER NOT NULL DEFAULT 1 | 1 active, 0 inactive |

### room_equipment
| Column | Type | Rules |
|--------|------|-------|
| `room_id` | INTEGER NOT NULL | FOREIGN KEY -> `room(id)` |
| `item` | TEXT NOT NULL | trimmed, 1-50 characters, as typed |
| `item_key` | TEXT NOT NULL | `lower(trim(item))` |
| | | UNIQUE (`room_id`, `item_key`); up to 20 items per room |

Deactivation only flips `room.active`; no row is ever deleted by this feature.

## Seed data (`V3__seed_demo_rooms.sql`)

Six demo rooms with varied capacity and equipment, for example: Aurora (4, whiteboard), Borealis (6, projector, whiteboard), Cirrus (8, video conferencing, whiteboard), Delta (12, projector, video conferencing), Everest (20, projector, video conferencing, whiteboard), Fjord (2, none).

## API shapes

Defined in `specs/001-project-setup/contracts/openapi.yaml`: `Room`, `RoomInput`, `ActiveChange`, `RoomActivationResult`, `BookingSummary`, plus `Problem` for errors.

## State transitions

`active` <-> `inactive`, reversible, idempotent (setting the current state succeeds with no change).
