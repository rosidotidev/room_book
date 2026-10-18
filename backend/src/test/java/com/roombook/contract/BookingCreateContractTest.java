package com.roombook.contract;

import static com.roombook.contract.BookingTestSupport.SATURDAY;
import static com.roombook.contract.BookingTestSupport.TUESDAY;
import static com.roombook.contract.BookingTestSupport.WEDNESDAY;
import static com.roombook.contract.BookingTestSupport.at;
import static com.roombook.contract.BookingTestSupport.bookingJson;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class BookingCreateContractTest extends ContractTestBase {

    private ResultActions send(String json) throws Exception {
        return mockMvc.perform(post("/api/bookings").contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private ResultActions book(long roomId, LocalDate day, String from, String to) throws Exception {
        return send(bookingJson(roomId, "Planning", "Ana", at(day, from), at(day, to)));
    }

    private void refused(long roomId, LocalDate day, String from, String to, String reason) throws Exception {
        book(roomId, day, from, to)
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value(containsString(reason)))
                .andExpect(matchesContractResponse());
    }

    @Test
    void createsAConfirmedBookingInOfficeTime() throws Exception {
        long room = BookingTestSupport.newRoom(mockMvc);
        book(room, TUESDAY, "10:00", "11:00")
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", startsWith("/api/bookings/")))
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.roomId").value(room))
                .andExpect(jsonPath("$.title").value("Planning"))
                .andExpect(jsonPath("$.start").value(endsWith("+02:00")))
                .andExpect(jsonPath("$.start").value(startsWith("2026-10-20T10:00")))
                .andExpect(matchesContract());
    }

    @Test
    void overlapIsRefusedWithAMessageNamingTheClash() throws Exception {
        long room = BookingTestSupport.newRoom(mockMvc);
        book(room, TUESDAY, "10:00", "11:00").andExpect(status().isCreated());
        for (String[] clash : new String[][] {{"10:30", "11:30"}, {"09:00", "10:15"}, {"10:15", "10:45"}, {"10:00", "11:00"}, {"09:00", "12:00"}}) {
            book(room, TUESDAY, clash[0], clash[1])
                    .andExpect(status().isConflict())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.detail").value(containsString("already booked from 10:00 to 11:00")))
                    .andExpect(matchesContract());
        }
    }

    @Test
    void backToBackAndOtherRoomsAreAccepted() throws Exception {
        long room = BookingTestSupport.newRoom(mockMvc);
        long other = BookingTestSupport.newRoom(mockMvc);
        book(room, WEDNESDAY, "10:00", "11:00").andExpect(status().isCreated());
        book(room, WEDNESDAY, "11:00", "12:00").andExpect(status().isCreated());
        book(room, WEDNESDAY, "09:00", "10:00").andExpect(status().isCreated());
        book(other, WEDNESDAY, "10:00", "11:00").andExpect(status().isCreated());
    }

    @Test
    void ruleViolationsAreRefusedWithTheRuleInTheMessage() throws Exception {
        long room = BookingTestSupport.newRoom(mockMvc);
        refused(room, SATURDAY, "10:00", "11:00", "Monday to Friday");
        refused(room, TUESDAY, "07:45", "09:00", "between 08:00 and 20:00");
        refused(room, TUESDAY, "19:00", "20:15", "between 08:00 and 20:00");
        refused(room, TUESDAY, "10:10", "11:00", "15-minute boundary");
        refused(room, TUESDAY, "10:00", "10:50", "15-minute boundary");
        refused(room, TUESDAY, "11:00", "10:00", "end after it starts");
        refused(room, TUESDAY, "10:00", "10:00", "end after it starts");
        refused(room, TUESDAY, "09:00", "13:15", "at most 4 hours");
        refused(room, BookingTestSupport.MONDAY_NOW, "10:00", "10:45", "in the past");
    }

    @Test
    void aBookingCrossingMidnightIsRefused() throws Exception {
        long room = BookingTestSupport.newRoom(mockMvc);
        send(bookingJson(room, "Late", "Ana", at(TUESDAY, "19:00"), at(WEDNESDAY, "09:00")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("same day")))
                .andExpect(matchesContractResponse());
    }

    @Test
    void missingOrBlankFieldsAreRefused() throws Exception {
        long room = BookingTestSupport.newRoom(mockMvc);
        String start = at(TUESDAY, "10:00");
        String end = at(TUESDAY, "11:00");
        for (String[] bad : new String[][] {{null, "Ana", "title"}, {"  ", "Ana", "title"}, {"T", null, "organizer"}, {"T", "", "organizer"},
                {"t".repeat(101), "Ana", "title"}, {"T", "a".repeat(101), "organizer"}}) {
            send(bookingJson(room, bad[0], bad[1], start, end))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.detail").value(containsString(bad[2])))
                    .andExpect(matchesContractResponse());
        }
        send(bookingJson(null, "T", "Ana", start, end)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("roomId"))).andExpect(matchesContractResponse());
        send(bookingJson(room, "T", "Ana", null, end)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("start"))).andExpect(matchesContractResponse());
        send(bookingJson(room, "T", "Ana", start, null)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("end"))).andExpect(matchesContractResponse());
        send("{not json").andExpect(status().isBadRequest()).andExpect(matchesContractResponse());
    }

    @Test
    void anUnknownRoomIsNotFound() throws Exception {
        book(999999, TUESDAY, "10:00", "11:00")
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(matchesContract());
    }

    @Test
    void aDeactivatedRoomCannotBeBooked() throws Exception {
        long room = BookingTestSupport.newRoom(mockMvc);
        RoomTestSupport.setActive(mockMvc, room, false);
        book(room, TUESDAY, "10:00", "11:00")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value(containsString("deactivated")))
                .andExpect(matchesContract());
    }
}
