package com.roombook.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import org.junit.jupiter.api.Test;

/** Every time rule, evaluated against a fixed clock: Monday 2026-10-19 09:00 office time. */
class BookingRulesTest {

    static final ZoneId OFFICE = ZoneId.of("Europe/Rome");
    static final Instant NOW = at(LocalDate.of(2026, 10, 19), "09:00");
    static final LocalDate TUE = LocalDate.of(2026, 10, 20);
    static final LocalDate FRI = LocalDate.of(2026, 10, 23);
    static final LocalDate SAT = LocalDate.of(2026, 10, 24);
    static final LocalDate SUN = LocalDate.of(2026, 10, 25);

    private final BookingRules rules = new BookingRules(Clock.fixed(NOW, OFFICE), OFFICE);

    static Instant at(LocalDate day, String hhmm) {
        return ZonedDateTime.of(day, LocalTime.parse(hhmm), OFFICE).toInstant();
    }

    private void accepted(LocalDate day, String from, String to) {
        assertThatCode(() -> rules.validate(at(day, from), at(day, to))).doesNotThrowAnyException();
    }

    private void refused(Instant start, Instant end, String reason) {
        assertThatThrownBy(() -> rules.validate(start, end)).isInstanceOf(BookingRuleException.class).hasMessageContaining(reason);
    }

    private void refused(LocalDate day, String from, String to, String reason) {
        refused(at(day, from), at(day, to), reason);
    }

    @Test
    void weekdaysAreAcceptedAndWeekendsRefused() {
        accepted(TUE, "10:00", "11:00");
        accepted(FRI, "10:00", "11:00");
        refused(SAT, "10:00", "11:00", "Monday to Friday");
        refused(SUN, "10:00", "11:00", "Monday to Friday");
    }

    @Test
    void openingHoursAreInclusiveAtBothEnds() {
        accepted(TUE, "08:00", "09:00");
        accepted(TUE, "19:00", "20:00");
        refused(TUE, "07:45", "09:00", "08:00 and 20:00");
        refused(TUE, "19:00", "20:15", "08:00 and 20:00");
        refused(TUE, "20:15", "20:30", "08:00 and 20:00");
    }

    @Test
    void onlyQuarterHourBoundariesAreAccepted() {
        for (String ok : new String[] {"10:00", "10:15", "10:30", "10:45"}) {
            accepted(TUE, ok, "12:00");
        }
        refused(TUE, "10:10", "11:00", "15-minute");
        refused(TUE, "10:00", "10:50", "15-minute");
        refused(TUE, "10:01", "11:00", "15-minute");
    }

    @Test
    void secondsAndFractionsAreNotOnAQuarterHour() {
        refused(at(TUE, "10:00").plusSeconds(1), at(TUE, "11:00"), "15-minute");
        refused(at(TUE, "10:00"), at(TUE, "11:00").plusNanos(1), "15-minute");
    }

    @Test
    void aBookingCannotCrossMidnight() {
        refused(at(TUE, "19:00"), at(LocalDate.of(2026, 10, 21), "09:00"), "same day");
    }

    @Test
    void endMustBeAfterStart() {
        refused(TUE, "11:00", "10:00", "end after it starts");
        refused(TUE, "10:00", "10:00", "end after it starts");
    }

    @Test
    void durationIsAtMostFourHours() {
        accepted(TUE, "09:00", "13:00");
        refused(TUE, "09:00", "13:15", "at most 4 hours");
        refused(TUE, "08:00", "20:00", "at most 4 hours");
    }

    @Test
    void aBookingCannotStartInThePast() {
        LocalDate monday = LocalDate.of(2026, 10, 19);
        refused(monday, "08:00", "08:45", "past");
        refused(monday, "08:45", "09:30", "past"); // in progress at 09:00
        accepted(monday, "09:00", "09:30");        // starting exactly now
        accepted(monday, "09:15", "10:00");
    }

    @Test
    void whenSeveralRulesAreBrokenTheFirstInOrderIsReported() {
        // Saturday, outside hours, off boundary, past: weekday comes first
        refused(at(SAT, "07:10"), at(SAT, "21:00"), "Monday to Friday");
        // weekday ok, outside hours and off boundary: hours before boundaries
        refused(at(TUE, "07:10"), at(TUE, "09:00"), "08:00 and 20:00");
        // hours ok, off boundary and 5 hours: boundaries before duration
        refused(at(TUE, "09:10"), at(TUE, "14:10"), "15-minute");
    }

    @Test
    void hoursAreEvaluatedInTheOfficeZoneNotInUtc() {
        // 08:00 office time on a summer day is 06:00 UTC: accepted, even though 06:00 is before 08:00
        assertThat(at(TUE, "08:00").toString()).isEqualTo("2026-10-20T06:00:00Z");
        accepted(TUE, "08:00", "09:00");
    }

    @Test
    void cancellationNeedsAtLeastSixtyMinutes() {
        assertThat(rules.canCancel(NOW.plusSeconds(61 * 60))).isTrue();
        assertThat(rules.canCancel(NOW.plusSeconds(60 * 60))).isTrue();
        assertThat(rules.canCancel(NOW.plusSeconds(59 * 60))).isFalse();
        assertThat(rules.canCancel(NOW)).isFalse();
        assertThat(rules.canCancel(NOW.minusSeconds(60))).isFalse();
    }

    // --- daylight saving: Europe/Rome moves from +02:00 to +01:00 on Sunday 2026-10-25 ---

    @Test
    void theSameOfficeWindowIsAcceptedBeforeAndAfterTheDaylightSavingChange() {
        LocalDate winterMonday = LocalDate.of(2026, 10, 26);
        assertThat(at(TUE, "08:00").toString()).isEqualTo("2026-10-20T06:00:00Z");           // +02:00
        assertThat(at(winterMonday, "08:00").toString()).isEqualTo("2026-10-26T07:00:00Z");   // +01:00
        accepted(TUE, "08:00", "09:00");
        accepted(winterMonday, "08:00", "09:00");
        accepted(winterMonday, "19:00", "20:00");
        refused(winterMonday, "07:45", "09:00", "08:00 and 20:00");
        refused(winterMonday, "19:00", "20:15", "08:00 and 20:00");
    }

    @Test
    void anOfficeDayIsTwentyFiveHoursLongWhenTheClocksGoBack() {
        LocalDate change = LocalDate.of(2026, 10, 25);
        long hours = java.time.Duration.between(at(change, "00:00"), at(change.plusDays(1), "00:00")).toHours();
        assertThat(hours).isEqualTo(25);
        LocalDate ordinary = LocalDate.of(2026, 10, 20);
        assertThat(java.time.Duration.between(at(ordinary, "00:00"), at(ordinary.plusDays(1), "00:00")).toHours()).isEqualTo(24);
    }
}
