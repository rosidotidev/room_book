package com.roombook.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.roombook.api.BookingDto.Booking;
import com.roombook.api.BookingDto.BookingInput;
import com.roombook.api.BookingDto.BookingStatus;
import com.roombook.api.RoomDto.Room;
import com.roombook.repository.BookingRepository;
import com.roombook.repository.RoomRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Booking service behavior with a fixed clock (Monday 2026-10-19 09:00 office time) and mocked persistence. */
class BookingServiceTest {

    static final ZoneId OFFICE = ZoneId.of("Europe/Rome");
    static final LocalDate TUE = LocalDate.of(2026, 10, 20);
    static final Instant NOW = BookingRulesTest.at(LocalDate.of(2026, 10, 19), "09:00");

    BookingRepository bookings = mock(BookingRepository.class);
    RoomRepository rooms = mock(RoomRepository.class);
    BookingService service;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(NOW, OFFICE);
        service = new BookingService(bookings, rooms, new BookingRules(clock, OFFICE), clock, OFFICE);
        when(rooms.findById(1L)).thenReturn(Optional.of(new Room(1, "Aurora", 4, List.of(), true)));
        when(rooms.findById(2L)).thenReturn(Optional.of(new Room(2, "Closed", 4, List.of(), false)));
        when(rooms.findById(404L)).thenReturn(Optional.empty());
        when(bookings.overlappingConfirmed(anyLong(), any(), any())).thenReturn(List.of());
        when(bookings.insert(anyLong(), anyString(), anyString(), anyString(), any(), any(), any())).thenReturn(10L);
        when(bookings.findById(10L)).thenReturn(Optional.of(booking(10, "10:00", "11:00", BookingStatus.CONFIRMED)));
    }

    static OffsetDateTime odt(LocalDate day, String hhmm) {
        return ZonedDateTime.of(day, java.time.LocalTime.parse(hhmm), OFFICE).toOffsetDateTime();
    }

    static Booking booking(long id, String from, String to, BookingStatus status) {
        return new Booking(id, 1, "Meeting", "Ana", odt(TUE, from), odt(TUE, to), status, odt(LocalDate.of(2026, 10, 19), "08:00"));
    }

    BookingInput input(long roomId, String from, String to) {
        return new BookingInput(roomId, "Planning", "Ana", odt(TUE, from), odt(TUE, to));
    }

    // --- overlap ---

    @Test
    void anOverlapIsRefusedAndNothingIsInserted() {
        when(bookings.overlappingConfirmed(eq(1L), any(), any()))
                .thenReturn(List.of(booking(5, "10:00", "11:00", BookingStatus.CONFIRMED)));
        assertThatThrownBy(() -> service.create(input(1, "10:30", "11:30")))
                .isInstanceOf(BookingConflictException.class).hasMessageContaining("10:00 to 11:00");
        verify(bookings, never()).insert(anyLong(), anyString(), anyString(), anyString(), any(), any(), any());
    }

    @Test
    void theOverlapQueryUsesTheRequestedInterval() {
        service.create(input(1, "11:00", "12:00"));
        verify(bookings).overlappingConfirmed(1L, BookingRulesTest.at(TUE, "11:00"), BookingRulesTest.at(TUE, "12:00"));
    }

    @Test
    void aBackToBackBookingIsAcceptedBecauseTheQueryFindsNoClash() {
        // the repository treats touching ends as no overlap (existing.start < end AND start < existing.end)
        Booking created = service.create(input(1, "11:00", "12:00"));
        assertThat(created.status()).isEqualTo(BookingStatus.CONFIRMED);
        verify(bookings).insert(eq(1L), eq("Planning"), eq("Ana"), eq("ana"), any(), any(), eq(NOW));
    }

    // --- precedence ---

    @Test
    void missingFieldsComeFirst() {
        assertThatThrownBy(() -> service.create(new BookingInput(404L, null, "Ana", odt(TUE, "10:00"), odt(TUE, "11:00"))))
                .isInstanceOf(BookingRuleException.class).hasMessageContaining("title");
    }

    @Test
    void unknownRoomBeatsDeactivatedAndRuleViolations() {
        assertThatThrownBy(() -> service.create(input(404, "07:00", "08:00"))).isInstanceOf(RoomNotFoundException.class);
    }

    @Test
    void deactivatedRoomBeatsRuleViolations() {
        assertThatThrownBy(() -> service.create(input(2, "07:00", "08:00"))).isInstanceOf(RoomDeactivatedException.class);
    }

    @Test
    void ruleViolationsBeatOverlap() {
        when(bookings.overlappingConfirmed(eq(1L), any(), any()))
                .thenReturn(List.of(booking(5, "10:00", "11:00", BookingStatus.CONFIRMED)));
        assertThatThrownBy(() -> service.create(input(1, "07:00", "08:00"))).isInstanceOf(BookingRuleException.class);
    }

    // --- text fields ---

    @Test
    void titleAndOrganizerAreTrimmedRequiredAndLimited() {
        service.create(new BookingInput(1L, "  Planning  ", "  ANA ", odt(TUE, "10:00"), odt(TUE, "11:00")));
        verify(bookings).insert(eq(1L), eq("Planning"), eq("ANA"), eq("ana"), any(), any(), any());

        for (String bad : new String[] {null, "", "   ", "x".repeat(101)}) {
            assertThatThrownBy(() -> service.create(new BookingInput(1L, bad, "Ana", odt(TUE, "10:00"), odt(TUE, "11:00"))))
                    .isInstanceOf(BookingRuleException.class).hasMessageContaining("title");
            assertThatThrownBy(() -> service.create(new BookingInput(1L, "T", bad, odt(TUE, "10:00"), odt(TUE, "11:00"))))
                    .isInstanceOf(BookingRuleException.class).hasMessageContaining("organizer");
        }
        assertThat("x".repeat(100)).hasSize(100);
        service.create(new BookingInput(1L, "x".repeat(100), "y".repeat(100), odt(TUE, "10:00"), odt(TUE, "11:00")));
    }

    // --- cancellation ---

    private void givenBookingStarting(String hhmmOnTuesday, BookingStatus status, Instant clockNow) {
        Clock clock = Clock.fixed(clockNow, OFFICE);
        service = new BookingService(bookings, rooms, new BookingRules(clock, OFFICE), clock, OFFICE);
        Booking b = booking(7, hhmmOnTuesday, "23:00".compareTo(hhmmOnTuesday) > 0 ? "19:00" : "20:00", status);
        when(bookings.findById(7L)).thenReturn(Optional.of(b));
    }

    @Test
    void cancellationIsAllowedFromSixtyMinutesBefore() {
        Instant start = BookingRulesTest.at(TUE, "10:00");
        for (long minutesBefore : new long[] {61, 60, 600}) {
            givenBookingStarting("10:00", BookingStatus.CONFIRMED, start.minusSeconds(minutesBefore * 60));
            service.cancel(7);
        }
        verify(bookings, org.mockito.Mockito.times(3)).markCancelled(7L);
    }

    @Test
    void cancellationIsRefusedInsideTheWindowAndAfterTheStart() {
        Instant start = BookingRulesTest.at(TUE, "10:00");
        for (long secondsBefore : new long[] {59 * 60, 60, 0, -60, -3 * 3600}) {
            givenBookingStarting("10:00", BookingStatus.CONFIRMED, start.minusSeconds(secondsBefore));
            assertThatThrownBy(() -> service.cancel(7)).isInstanceOf(CancellationTooLateException.class);
        }
        verify(bookings, never()).markCancelled(anyLong());
    }

    @Test
    void aBookingThatAlreadyEndedCannotBeCancelled() {
        givenBookingStarting("10:00", BookingStatus.CONFIRMED, BookingRulesTest.at(TUE, "12:00"));
        assertThatThrownBy(() -> service.cancel(7)).isInstanceOf(CancellationTooLateException.class);
    }

    @Test
    void cancellingACancelledBookingIsAcceptedWithoutChange() {
        givenBookingStarting("10:00", BookingStatus.CANCELLED, BookingRulesTest.at(TUE, "09:50"));
        Booking result = service.cancel(7);
        assertThat(result.status()).isEqualTo(BookingStatus.CANCELLED);
        verify(bookings, never()).markCancelled(anyLong());
    }

    @Test
    void cancellingAnUnknownBookingIsNotFound() {
        when(bookings.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.cancel(99)).isInstanceOf(BookingNotFoundException.class);
    }

    // --- queries ---

    @Test
    void organizerNamesAreNormalisedAndRequired() {
        service.byOrganizer("  ANA ");
        verify(bookings).byOrganizerKey("ana");
        assertThatThrownBy(() -> service.byOrganizer("  ")).isInstanceOf(BookingRuleException.class);
    }

    @Test
    void availabilityUsesTheOfficeDayBoundaries() {
        service.availability(1, TUE);
        verify(bookings).confirmedStartingBetween(1L, BookingRulesTest.at(TUE, "00:00"), BookingRulesTest.at(TUE.plusDays(1), "00:00"));
        assertThatThrownBy(() -> service.availability(404, TUE)).isInstanceOf(RoomNotFoundException.class);
    }
}
