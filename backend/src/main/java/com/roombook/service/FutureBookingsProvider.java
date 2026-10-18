package com.roombook.service;

import com.roombook.api.RoomDto.BookingSummary;
import java.util.List;

/** Source of a room's future bookings; replaced by the bookings feature when it exists. */
public interface FutureBookingsProvider {

    List<BookingSummary> futureBookingsOf(long roomId);
}
