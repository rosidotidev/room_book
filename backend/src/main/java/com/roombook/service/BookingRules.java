package com.roombook.service;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import org.springframework.stereotype.Component;

/**
 * The time rules of a booking, all evaluated in the office time zone and against the injectable {@link Clock}.
 * Checked in this order: weekday, hours, boundaries, same day, order and duration, not in the past.
 */
@Component
public class BookingRules {

    static final LocalTime OPENING = LocalTime.of(8, 0);
    static final LocalTime CLOSING = LocalTime.of(20, 0);
    static final Duration MAX_DURATION = Duration.ofHours(4);
    static final Duration CANCELLATION_WINDOW = Duration.ofMinutes(60);

    private final Clock clock;
    private final ZoneId zone;

    public BookingRules(Clock clock, ZoneId officeZone) {
        this.clock = clock;
        this.zone = officeZone;
    }

    public void validate(Instant startInstant, Instant endInstant) {
        ZonedDateTime start = startInstant.atZone(zone);
        ZonedDateTime end = endInstant.atZone(zone);

        if (isWeekend(start) || isWeekend(end)) {
            throw new BookingRuleException("Bookings are only possible from Monday to Friday.");
        }
        if (!withinOpeningHours(start) || !withinOpeningHours(end)) {
            throw new BookingRuleException("Bookings must start and end between 08:00 and 20:00.");
        }
        if (!onBoundary(start) || !onBoundary(end)) {
            throw new BookingRuleException("Bookings must start and end on a 15-minute boundary (:00, :15, :30, :45).");
        }
        if (!start.toLocalDate().equals(end.toLocalDate())) {
            throw new BookingRuleException("A booking must start and end on the same day.");
        }
        if (!endInstant.isAfter(startInstant)) {
            throw new BookingRuleException("A booking must end after it starts.");
        }
        if (Duration.between(startInstant, endInstant).compareTo(MAX_DURATION) > 0) {
            throw new BookingRuleException("A booking can last at most 4 hours.");
        }
        if (startInstant.isBefore(clock.instant())) {
            throw new BookingRuleException("A booking cannot start in the past.");
        }
    }

    /** Cancellation is allowed while at least 60 minutes remain before the start. */
    public boolean canCancel(Instant start) {
        return Duration.between(clock.instant(), start).compareTo(CANCELLATION_WINDOW) >= 0;
    }

    private static boolean isWeekend(ZonedDateTime t) {
        DayOfWeek day = t.getDayOfWeek();
        return day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY;
    }

    private static boolean withinOpeningHours(ZonedDateTime t) {
        LocalTime time = t.toLocalTime();
        return !time.isBefore(OPENING) && !time.isAfter(CLOSING);
    }

    private static boolean onBoundary(ZonedDateTime t) {
        return t.getMinute() % 15 == 0 && t.getSecond() == 0 && t.getNano() == 0;
    }
}
