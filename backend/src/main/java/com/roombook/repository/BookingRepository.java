package com.roombook.repository;

import com.roombook.api.BookingDto.Booking;
import com.roombook.api.BookingDto.BookingStatus;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

/**
 * Instants are stored as UTC text with seconds (yyyy-MM-ddTHH:mm:ssZ) so that text order is chronological order.
 * The datasource has a single pooled connection: no query may run while a result set is open.
 */
@Repository
public class BookingRepository {

    private static final String COLUMNS =
            "id, room_id, title, organizer, start_at, end_at, status, created_at";

    private final JdbcTemplate jdbc;
    private final ZoneId zone;
    private final RowMapper<Booking> mapper;

    public BookingRepository(JdbcTemplate jdbc, ZoneId officeZone) {
        this.jdbc = jdbc;
        this.zone = officeZone;
        this.mapper = (rs, i) -> new Booking(
                rs.getLong("id"), rs.getLong("room_id"), rs.getString("title"), rs.getString("organizer"),
                local(rs.getString("start_at")), local(rs.getString("end_at")),
                BookingStatus.valueOf(rs.getString("status")), local(rs.getString("created_at")));
    }

    public long insert(long roomId, String title, String organizer, String organizerKey,
                       Instant start, Instant end, Instant createdAt) {
        jdbc.update("INSERT INTO booking (room_id, title, organizer, organizer_key, start_at, end_at, status, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?, 'CONFIRMED', ?)",
                roomId, title, organizer, organizerKey, text(start), text(end), text(createdAt));
        Long id = jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);
        return id;
    }

    public Optional<Booking> findById(long id) {
        return jdbc.query("SELECT " + COLUMNS + " FROM booking WHERE id = ?", mapper, id).stream().findFirst();
    }

    /** Confirmed bookings of the room that overlap [start, end): existing.start < end AND start < existing.end. */
    public List<Booking> overlappingConfirmed(long roomId, Instant start, Instant end) {
        return jdbc.query("SELECT " + COLUMNS + " FROM booking WHERE room_id = ? AND status = 'CONFIRMED' "
                        + "AND start_at < ? AND ? < end_at ORDER BY start_at",
                mapper, roomId, text(end), text(start));
    }

    /** Confirmed bookings of the room starting within [from, to), ordered by start. */
    public List<Booking> confirmedStartingBetween(long roomId, Instant from, Instant to) {
        return jdbc.query("SELECT " + COLUMNS + " FROM booking WHERE room_id = ? AND status = 'CONFIRMED' "
                        + "AND start_at >= ? AND start_at < ? ORDER BY start_at",
                mapper, roomId, text(from), text(to));
    }

    public List<Booking> byOrganizerKey(String organizerKey) {
        return jdbc.query("SELECT " + COLUMNS + " FROM booking WHERE organizer_key = ? ORDER BY start_at, id",
                mapper, organizerKey);
    }

    public List<Booking> futureConfirmed(long roomId, Instant now) {
        return jdbc.query("SELECT " + COLUMNS + " FROM booking WHERE room_id = ? AND status = 'CONFIRMED' "
                        + "AND start_at > ? ORDER BY start_at",
                mapper, roomId, text(now));
    }

    public void markCancelled(long id) {
        jdbc.update("UPDATE booking SET status = 'CANCELLED' WHERE id = ?", id);
    }

    private static String text(Instant instant) {
        return instant.truncatedTo(ChronoUnit.SECONDS).toString();
    }

    private OffsetDateTime local(String utcText) {
        return OffsetDateTime.ofInstant(Instant.parse(utcText), zone);
    }
}
