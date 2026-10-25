CREATE TABLE booking (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id       INTEGER NOT NULL REFERENCES room (id),
    title         TEXT    NOT NULL,
    organizer     TEXT    NOT NULL,
    organizer_key TEXT    NOT NULL,
    start_at      TEXT    NOT NULL,
    end_at        TEXT    NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED')),
    created_at    TEXT    NOT NULL
);

CREATE INDEX idx_booking_room_start ON booking (room_id, start_at);
CREATE INDEX idx_booking_organizer ON booking (organizer_key);
