package com.roombook.contract;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Helpers for the booking contract tests. They reuse the fixed clock of {@link ContractTestBase}
 * (Monday 2026-10-19 09:00 UTC, 11:00 office time), so every booking below is made from Tuesday on.
 */
final class BookingTestSupport {

    static final ZoneId OFFICE = ZoneId.of("Europe/Rome");
    static final LocalDate TUESDAY = LocalDate.of(2026, 10, 20);
    static final LocalDate WEDNESDAY = LocalDate.of(2026, 10, 21);
    static final LocalDate THURSDAY = LocalDate.of(2026, 10, 22);
    static final LocalDate SATURDAY = LocalDate.of(2026, 10, 24);
    static final LocalDate MONDAY_NOW = LocalDate.of(2026, 10, 19);

    private BookingTestSupport() {}

    /** ISO date-time with the office offset for an office-local day and time such as "10:00". */
    static String at(LocalDate day, String hhmm) {
        // ISO formatter, not toString(): toString() drops zero seconds, which is not an RFC 3339 date-time
        return DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(ZonedDateTime.of(day, LocalTime.parse(hhmm), OFFICE));
    }

    static String bookingJson(Object roomId, String title, String organizer, String start, String end) throws Exception {
        var node = RoomTestSupport.JSON.createObjectNode();
        if (roomId instanceof Number n) {
            node.put("roomId", n.longValue());
        }
        if (title != null) {
            node.put("title", title);
        }
        if (organizer != null) {
            node.put("organizer", organizer);
        }
        if (start != null) {
            node.put("start", start);
        }
        if (end != null) {
            node.put("end", end);
        }
        return RoomTestSupport.JSON.writeValueAsString(node);
    }

    static long newRoom(MockMvc mockMvc) throws Exception {
        return RoomTestSupport.createRoom(mockMvc, RoomTestSupport.uniqueName("Bk"), 6, List.of()).get("id").asLong();
    }

    static MvcResult book(MockMvc mockMvc, long roomId, String organizer, LocalDate day, String from, String to) throws Exception {
        return mockMvc.perform(post("/api/bookings").contentType(MediaType.APPLICATION_JSON)
                .content(bookingJson(roomId, "Meeting", organizer, at(day, from), at(day, to)))).andReturn();
    }

    static long bookedId(MockMvc mockMvc, long roomId, String organizer, LocalDate day, String from, String to) throws Exception {
        MvcResult result = book(mockMvc, roomId, organizer, day, from, to);
        JsonNode node = RoomTestSupport.JSON.readTree(result.getResponse().getContentAsString());
        if (result.getResponse().getStatus() != 201) {
            throw new IllegalStateException("booking was refused: " + result.getResponse().getContentAsString());
        }
        return node.get("id").asLong();
    }
}
