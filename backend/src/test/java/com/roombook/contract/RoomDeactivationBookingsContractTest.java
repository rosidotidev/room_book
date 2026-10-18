package com.roombook.contract;

import static com.roombook.contract.BookingTestSupport.THURSDAY;
import static com.roombook.contract.BookingTestSupport.TUESDAY;
import static com.roombook.contract.BookingTestSupport.bookedId;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** Deactivating a room reports its future confirmed bookings and keeps them. */
class RoomDeactivationBookingsContractTest extends ContractTestBase {

    private JsonNode setActive(long room, boolean active) throws Exception {
        String body = mockMvc.perform(patch("/api/rooms/" + room + "/active").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":" + active + "}"))
                .andExpect(status().isOk()).andExpect(matchesContract())
                .andReturn().getResponse().getContentAsString();
        return RoomTestSupport.JSON.readTree(body);
    }

    @Test
    void deactivationListsFutureConfirmedBookingsAndKeepsThem() throws Exception {
        long room = BookingTestSupport.newRoom(mockMvc);
        long first = bookedId(mockMvc, room, "Ana", TUESDAY, "10:00", "11:00");
        long second = bookedId(mockMvc, room, "Bea", THURSDAY, "09:00", "10:00");
        long cancelled = bookedId(mockMvc, room, "Cid", THURSDAY, "14:00", "15:00");
        mockMvc.perform(delete("/api/bookings/" + cancelled)).andExpect(status().isOk());

        JsonNode result = setActive(room, false);

        assertThat(result.get("futureBookings").size()).isEqualTo(2);
        assertThat(result.get("futureBookings").get(0).get("id").asLong()).isEqualTo(first);
        assertThat(result.get("futureBookings").get(1).get("id").asLong()).isEqualTo(second);
        assertThat(result.get("futureBookings").get(0).get("organizer").asText()).isEqualTo("Ana");

        // nothing was deleted or cancelled
        mockMvc.perform(get("/api/rooms/" + room + "/availability").param("date", "2026-10-20"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].status").value("CONFIRMED"));
    }

    @Test
    void aRoomWithNoFutureConfirmedBookingsReportsAnEmptyList() throws Exception {
        long room = BookingTestSupport.newRoom(mockMvc);
        long id = bookedId(mockMvc, room, "Ana", TUESDAY, "10:00", "11:00");
        mockMvc.perform(delete("/api/bookings/" + id)).andExpect(status().isOk());
        assertThat(setActive(room, false).get("futureBookings").size()).isZero();
    }

    @Test
    void reactivationKeepsTheBookingsValid() throws Exception {
        long room = BookingTestSupport.newRoom(mockMvc);
        bookedId(mockMvc, room, "Ana", TUESDAY, "10:00", "11:00");
        setActive(room, false);
        setActive(room, true);
        mockMvc.perform(get("/api/rooms/" + room + "/availability").param("date", "2026-10-20"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].status").value("CONFIRMED"));
    }
}
