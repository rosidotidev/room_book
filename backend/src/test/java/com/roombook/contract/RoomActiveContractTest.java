package com.roombook.contract;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class RoomActiveContractTest extends ContractTestBase {

    private ResultActions patchActive(long id, String body) throws Exception {
        return mockMvc.perform(patch("/api/rooms/" + id + "/active")
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private long newRoom() throws Exception {
        return RoomTestSupport.createRoom(mockMvc, RoomTestSupport.uniqueName("Act"), 4, List.of("Projector"))
                .get("id").asLong();
    }

    @Test
    void deactivatesWithoutDeletingAndReportsNoFutureBookings() throws Exception {
        long id = newRoom();
        patchActive(id, "{\"active\":false}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.room.active").value(false))
                .andExpect(jsonPath("$.room.equipment[0]").value("Projector"))
                .andExpect(jsonPath("$.futureBookings.length()").value(0))
                .andExpect(matchesContract());

        String list = mockMvc.perform(get("/api/rooms")).andReturn().getResponse().getContentAsString();
        boolean listedAsInactive = false;
        for (JsonNode room : RoomTestSupport.JSON.readTree(list)) {
            if (room.get("id").asLong() == id) {
                listedAsInactive = !room.get("active").asBoolean();
            }
        }
        assertThat(listedAsInactive).isTrue();
    }

    @Test
    void reactivatesARoom() throws Exception {
        long id = newRoom();
        RoomTestSupport.setActive(mockMvc, id, false);
        patchActive(id, "{\"active\":true}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.room.active").value(true))
                .andExpect(matchesContract());
    }

    @Test
    void repeatingTheSameStateIsAccepted() throws Exception {
        long id = newRoom();
        patchActive(id, "{\"active\":true}").andExpect(status().isOk()).andExpect(matchesContract());
        RoomTestSupport.setActive(mockMvc, id, false);
        patchActive(id, "{\"active\":false}").andExpect(status().isOk()).andExpect(matchesContract());
    }

    @Test
    void rejectsABodyWithoutTheActiveField() throws Exception {
        long id = newRoom();
        patchActive(id, "{}")
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("active")))
                .andExpect(matchesContractResponse());
    }

    @Test
    void unknownRoomIsNotFound() throws Exception {
        patchActive(999999, "{\"active\":false}")
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(matchesContract());
    }
}
