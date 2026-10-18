package com.roombook.contract;

import static com.roombook.contract.BookingTestSupport.MONDAY_NOW;
import static com.roombook.contract.BookingTestSupport.TUESDAY;
import static com.roombook.contract.BookingTestSupport.bookedId;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** The fixed clock is Monday 11:00 office time. */
class BookingCancelContractTest extends ContractTestBase {

    @Test
    void cancellingKeepsTheBookingAndFreesTheSlot() throws Exception {
        long room = BookingTestSupport.newRoom(mockMvc);
        long id = bookedId(mockMvc, room, "Ana", TUESDAY, "10:00", "11:00");

        mockMvc.perform(delete("/api/bookings/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(matchesContract());

        // the slot is free again
        bookedId(mockMvc, room, "Bea", TUESDAY, "10:00", "11:00");
    }

    @Test
    void cancellingTwiceIsAccepted() throws Exception {
        long id = bookedId(mockMvc, BookingTestSupport.newRoom(mockMvc), "Ana", TUESDAY, "10:00", "11:00");
        mockMvc.perform(delete("/api/bookings/" + id)).andExpect(status().isOk());
        mockMvc.perform(delete("/api/bookings/" + id))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED")).andExpect(matchesContract());
    }

    @Test
    void cancellingInsideTheOneHourWindowIsRefused() throws Exception {
        long id = bookedId(mockMvc, BookingTestSupport.newRoom(mockMvc), "Ana", MONDAY_NOW, "11:30", "12:00");
        mockMvc.perform(delete("/api/bookings/" + id))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value(containsString("one hour")))
                .andExpect(matchesContract());
    }

    @Test
    void cancellingExactlySixtyMinutesBeforeIsAllowed() throws Exception {
        long id = bookedId(mockMvc, BookingTestSupport.newRoom(mockMvc), "Ana", MONDAY_NOW, "12:00", "12:30");
        mockMvc.perform(delete("/api/bookings/" + id))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED")).andExpect(matchesContract());
    }

    @Test
    void anUnknownBookingIsNotFound() throws Exception {
        mockMvc.perform(delete("/api/bookings/999999"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(matchesContract());
    }
}
