package com.roombook.contract;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class RoomUpdateContractTest extends ContractTestBase {

    private ResultActions update(long id, String json) throws Exception {
        return mockMvc.perform(put("/api/rooms/" + id).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    void updatesDetailsKeepingTheId() throws Exception {
        JsonNode room = RoomTestSupport.createRoom(mockMvc, RoomTestSupport.uniqueName("Old"), 4, List.of("Whiteboard"));
        long id = room.get("id").asLong();
        String newName = RoomTestSupport.uniqueName("New");
        update(id, RoomTestSupport.roomJson(newName, 9, List.of("Projector")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.name").value(newName))
                .andExpect(jsonPath("$.capacity").value(9))
                .andExpect(jsonPath("$.equipment[0]").value("Projector"))
                .andExpect(jsonPath("$.equipment.length()").value(1))
                .andExpect(matchesContract());
    }

    @Test
    void acceptsSavingARoomUnderItsOwnName() throws Exception {
        String name = RoomTestSupport.uniqueName("Same");
        long id = RoomTestSupport.createRoom(mockMvc, name, 4, List.of()).get("id").asLong();
        update(id, RoomTestSupport.roomJson(name.toUpperCase(), 6, List.of()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.capacity").value(6))
                .andExpect(matchesContract());
    }

    @Test
    void rejectsRenamingToAnotherRoomsName() throws Exception {
        String taken = RoomTestSupport.uniqueName("Taken");
        RoomTestSupport.createRoom(mockMvc, taken, 4, List.of());
        long id = RoomTestSupport.createRoom(mockMvc, RoomTestSupport.uniqueName("Other"), 4, List.of()).get("id").asLong();
        update(id, RoomTestSupport.roomJson(" " + taken.toLowerCase(), 4, List.of()))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(matchesContract());
    }

    @Test
    void rejectsInvalidInput() throws Exception {
        long id = RoomTestSupport.createRoom(mockMvc, RoomTestSupport.uniqueName("Inv"), 4, List.of()).get("id").asLong();
        update(id, RoomTestSupport.roomJson(RoomTestSupport.uniqueName("X"), 0, List.of()))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("capacity")))
                .andExpect(matchesContractResponse());
    }

    @Test
    void unknownRoomIsNotFoundEvenWithAnInvalidBody() throws Exception {
        update(999999, RoomTestSupport.roomJson("Valid", 4, List.of()))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(matchesContract());
        update(999999, RoomTestSupport.roomJson("Valid", 0, List.of()))
                .andExpect(status().isNotFound())
                .andExpect(matchesContractResponse());
    }
}
