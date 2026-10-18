CREATE TABLE room (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT    NOT NULL,
    name_key TEXT    NOT NULL UNIQUE,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    active   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE room_equipment (
    room_id  INTEGER NOT NULL REFERENCES room (id),
    item     TEXT    NOT NULL,
    item_key TEXT    NOT NULL,
    UNIQUE (room_id, item_key)
);
