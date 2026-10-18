package com.roombook.service;

import com.roombook.api.RoomDto.BookingSummary;
import com.roombook.repository.BookingRepository;
import java.time.Clock;
import java.util.List;
import org.springframework.stereotype.Component;

/** Reports a room's future confirmed bookings when it is deactivated; the bookings themselves are kept. */
@Component
public class BookingBackedFutureBookings implements FutureBookingsProvider {

    private final BookingRepository bookings;
    private final Clock clock;

    public BookingBackedFutureBookings(BookingRepository bookings, Clock clock) {
        this.bookings = bookings;
        this.clock = clock;
    }

    @Override
    public List<BookingSummary> futureBookingsOf(long roomId) {
        return bookings.futureConfirmed(roomId, clock.instant()).stream()
                .map(b -> new BookingSummary(b.id(), b.title(), b.organizer(), b.start(), b.end()))
                .toList();
    }
}
