package com.roombook.api;

import java.time.OffsetDateTime;

/** Request and response shapes of the bookings API; they mirror the schemas in the OpenAPI contract. */
public final class BookingDto {

    private BookingDto() {}

    public enum BookingStatus { CONFIRMED, CANCELLED }

    /** Nullable on purpose: the service layer validates it and names the missing or invalid field. */
    public record BookingInput(Long roomId, String title, String organizer, OffsetDateTime start, OffsetDateTime end) {}

    /** Times are expressed with the office time zone offset. */
    public record Booking(long id, long roomId, String title, String organizer,
                          OffsetDateTime start, OffsetDateTime end, BookingStatus status, OffsetDateTime createdAt) {}
}
