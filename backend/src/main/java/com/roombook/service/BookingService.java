package com.roombook.service;

import com.roombook.api.BookingDto.Booking;
import com.roombook.api.BookingDto.BookingInput;
import com.roombook.api.BookingDto.BookingStatus;
import com.roombook.api.RoomDto.Room;
import com.roombook.repository.BookingRepository;
import com.roombook.repository.RoomRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Business rules of bookings. Creation checks and inserts inside one transaction on the single SQLite connection. */
@Service
public class BookingService {

    static final int TEXT_MAX = 100;
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private final BookingRepository bookings;
    private final RoomRepository rooms;
    private final BookingRules rules;
    private final Clock clock;
    private final ZoneId zone;

    public BookingService(BookingRepository bookings, RoomRepository rooms, BookingRules rules,
                          Clock clock, ZoneId officeZone) {
        this.bookings = bookings;
        this.rooms = rooms;
        this.rules = rules;
        this.clock = clock;
        this.zone = officeZone;
    }

    /** Order of checks: fields present (400), room exists (404), room active (422), time rules (400), overlap (409). */
    @Transactional
    public Booking create(BookingInput input) {
        if (input == null) {
            throw new BookingRuleException("A booking description is required.");
        }
        String title = requiredText(input.title(), "title");
        String organizer = requiredText(input.organizer(), "organizer");
        if (input.roomId() == null) {
            throw new BookingRuleException("roomId is required.");
        }
        if (input.start() == null) {
            throw new BookingRuleException("start is required.");
        }
        if (input.end() == null) {
            throw new BookingRuleException("end is required.");
        }

        Room room = rooms.findById(input.roomId()).orElseThrow(() -> new RoomNotFoundException(input.roomId()));
        if (!room.active()) {
            throw new RoomDeactivatedException(room.name());
        }

        Instant start = input.start().toInstant();
        Instant end = input.end().toInstant();
        rules.validate(start, end);

        List<Booking> clashes = bookings.overlappingConfirmed(room.id(), start, end);
        if (!clashes.isEmpty()) {
            Booking first = clashes.get(0);
            throw new BookingConflictException("The room is already booked from "
                    + first.start().format(TIME) + " to " + first.end().format(TIME)
                    + " on " + first.start().format(DateTimeFormatter.ofPattern("EEE d MMM", Locale.ENGLISH)) + ".");
        }

        long id = bookings.insert(room.id(), title, organizer, key(organizer), start, end, clock.instant());
        return bookings.findById(id).orElseThrow(() -> new BookingNotFoundException(id));
    }

    /** Confirmed bookings of the room for an office-local day, ordered by start. */
    public List<Booking> availability(long roomId, LocalDate date) {
        rooms.findById(roomId).orElseThrow(() -> new RoomNotFoundException(roomId));
        Instant from = date.atStartOfDay(zone).toInstant();
        Instant to = date.plusDays(1).atStartOfDay(zone).toInstant();
        return bookings.confirmedStartingBetween(roomId, from, to);
    }

    /** Bookings of an organizer (any status), matched ignoring case and surrounding spaces. */
    public List<Booking> byOrganizer(String organizer) {
        if (organizer == null || organizer.isBlank()) {
            throw new BookingRuleException("organizer is required.");
        }
        return bookings.byOrganizerKey(key(organizer));
    }

    /** Soft cancellation: allowed while at least 60 minutes remain; idempotent for cancelled bookings. */
    @Transactional
    public Booking cancel(long id) {
        Booking booking = bookings.findById(id).orElseThrow(() -> new BookingNotFoundException(id));
        if (booking.status() == BookingStatus.CANCELLED) {
            return booking;
        }
        if (!rules.canCancel(booking.start().toInstant())) {
            throw new CancellationTooLateException();
        }
        bookings.markCancelled(id);
        return bookings.findById(id).orElseThrow(() -> new BookingNotFoundException(id));
    }

    private static String requiredText(String value, String field) {
        String text = value == null ? "" : value.trim();
        if (text.isEmpty()) {
            throw new BookingRuleException(field + " is required.");
        }
        if (text.length() > TEXT_MAX) {
            throw new BookingRuleException(field + " must be at most " + TEXT_MAX + " characters.");
        }
        return text;
    }

    private static String key(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }
}
