package com.roombook.api;

import java.time.OffsetDateTime;
import java.util.List;

/** Request and response shapes of the rooms API; they mirror the schemas in the OpenAPI contract. */
public final class RoomDto {

    private RoomDto() {}

    public record Room(long id, String name, int capacity, List<String> equipment, boolean active) {}

    /** Input is nullable on purpose: the service layer validates it and names the invalid field. */
    public record RoomInput(String name, Integer capacity, List<String> equipment) {}

    public record ActiveChange(Boolean active) {}

    public record BookingSummary(long id, String title, String organizer, OffsetDateTime start, OffsetDateTime end) {}

    public record RoomActivationResult(Room room, List<BookingSummary> futureBookings) {}
}
