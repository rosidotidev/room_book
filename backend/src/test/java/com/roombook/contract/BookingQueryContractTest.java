package com.roombook.contract;

import static com.roombook.contract.BookingTestSupport.THURSDAY;
import static com.roombook.contract.BookingTestSupport.TUESDAY;
import static com.roombook.contract.BookingTestSupport.WEDNESDAY;
import static com.roombook.contract.BookingTestSupport.bookedId;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class BookingQueryContractTest extends ContractTestBase {

    private JsonNode json(String url, String param, String value) throws Exception {
        String body = mockMvc.perform(get(url).param(param, value))
                .andExpect(status().isOk()).andExpect(matchesContract())
                .andReturn().getResponse().getContentAsString();
        return RoomTestSupport.JSON.readTree(body);
    }

    private List<Long> ids(JsonNode list) {
        List<Long> ids = new ArrayList<>();
        list.forEach(b -> ids.add(b.get("id").asLong()));
        return ids;
    }

    // --- availability ---

    @Test
    void availabilityListsOnlyThatRoomAndDayOrderedByStart() throws Exception {
        long room = BookingTestSupport.newRoom(mockMvc);
        long other = BookingTestSupport.newRoom(mockMvc);
        long late = bookedId(mockMvc, room, "Ana", TUESDAY, "14:00", "15:00");
        long early = bookedId(mockMvc, room, "Ana", TUESDAY, "09:00", "10:00");
        bookedId(mockMvc, room, "Ana", WEDNESDAY, "09:00", "10:00");
        bookedId(mockMvc, other, "Ana", TUESDAY, "09:00", "10:00");

        JsonNode day = json("/api/rooms/" + room + "/availability", "date", "2026-10-20");
        assertThat(ids(day)).containsExactly(early, late);
    }

    @Test
    void availabilityDoesNotListCancelledBookings() throws Exception {
        long room = BookingTestSupport.newRoom(mockMvc);
        long id = bookedId(mockMvc, room, "Ana", TUESDAY, "09:00", "10:00");
        mockMvc.perform(delete("/api/bookings/" + id)).andExpect(status().isOk());
        assertThat(json("/api/rooms/" + room + "/availability", "date", "2026-10-20").size()).isZero();
    }

    @Test
    void availabilityOfAnEmptyDayIsAnEmptyList() throws Exception {
        long room = BookingTestSupport.newRoom(mockMvc);
        mockMvc.perform(get("/api/rooms/" + room + "/availability").param("date", "2026-12-01"))
                .andExpect(status().isOk()).andExpect(content().json("[]")).andExpect(matchesContract());
    }

    @Test
    void availabilityRejectsAMissingOrInvalidDateAndAnUnknownRoom() throws Exception {
        long room = BookingTestSupport.newRoom(mockMvc);
        mockMvc.perform(get("/api/rooms/" + room + "/availability").param("date", "tomorrow"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(matchesContractResponse());
        mockMvc.perform(get("/api/rooms/" + room + "/availability"))
                .andExpect(status().isBadRequest()).andExpect(matchesContractResponse());
        mockMvc.perform(get("/api/rooms/999999/availability").param("date", "2026-10-20"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(matchesContract());
    }

    // --- organizer ---

    @Test
    void organizerListingIncludesCancelledAndIsOrderedByStart() throws Exception {
        long room = BookingTestSupport.newRoom(mockMvc);
        String who = RoomTestSupport.uniqueName("Org");
        long later = bookedId(mockMvc, room, who, THURSDAY, "10:00", "11:00");
        long sooner = bookedId(mockMvc, room, who, TUESDAY, "10:00", "11:00");
        mockMvc.perform(delete("/api/bookings/" + later)).andExpect(status().isOk());
        bookedId(mockMvc, room, "Someone else", WEDNESDAY, "10:00", "11:00");

        JsonNode list = json("/api/bookings", "organizer", who);
        assertThat(ids(list)).containsExactly(sooner, later);
        assertThat(list.get(0).get("status").asText()).isEqualTo("CONFIRMED");
        assertThat(list.get(1).get("status").asText()).isEqualTo("CANCELLED");
    }

    @Test
    void organizerMatchingIgnoresCaseAndSurroundingSpaces() throws Exception {
        long room = BookingTestSupport.newRoom(mockMvc);
        String who = RoomTestSupport.uniqueName("Mixed");
        long id = bookedId(mockMvc, room, "  " + who.toUpperCase() + " ", TUESDAY, "10:00", "11:00");
        assertThat(ids(json("/api/bookings", "organizer", " " + who.toLowerCase() + "  "))).containsExactly(id);
    }

    @Test
    void anUnknownOrganizerHasNoBookingsAndAMissingNameIsRejected() throws Exception {
        mockMvc.perform(get("/api/bookings").param("organizer", "nobody-at-all"))
                .andExpect(status().isOk()).andExpect(content().json("[]")).andExpect(matchesContract());
        mockMvc.perform(get("/api/bookings").param("organizer", "  "))
                .andExpect(status().isBadRequest()).andExpect(matchesContractResponse());
        mockMvc.perform(get("/api/bookings")).andExpect(status().isBadRequest()).andExpect(matchesContractResponse());
    }
}
