package com.roombook.contract;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class RoomListContractTest extends ContractTestBase {

    private JsonNode list(String query) throws Exception {
        String body = mockMvc.perform(get("/api/rooms" + query))
                .andExpect(status().isOk())
                .andExpect(matchesContract())
                .andReturn().getResponse().getContentAsString();
        return RoomTestSupport.JSON.readTree(body);
    }

    @Test
    void listsAllRoomsWithTheirFields() throws Exception {
        JsonNode rooms = list("");
        assertThat(rooms.size()).isGreaterThanOrEqualTo(6);
        JsonNode first = rooms.get(0);
        assertThat(first.fieldNames()).toIterable().contains("id", "name", "capacity", "equipment", "active");
    }

    @Test
    void filtersByMinimumCapacity() throws Exception {
        JsonNode rooms = list("?minCapacity=10");
        assertThat(rooms.size()).isGreaterThan(0);
        rooms.forEach(room -> assertThat(room.get("capacity").asInt()).isGreaterThanOrEqualTo(10));
    }

    @Test
    void filtersByEquipmentIgnoringCaseAndSpaces() throws Exception {
        String body = mockMvc.perform(get("/api/rooms").param("equipment", " PROJECTOR "))
                .andExpect(status().isOk())
                .andExpect(matchesContract())
                .andReturn().getResponse().getContentAsString();
        JsonNode rooms = RoomTestSupport.JSON.readTree(body);
        assertThat(rooms.size()).isGreaterThan(0);
        rooms.forEach(room -> {
            List<String> items = new ArrayList<>();
            room.get("equipment").forEach(i -> items.add(i.asText().toLowerCase()));
            assertThat(items).contains("projector");
        });
    }

    @Test
    void combinesBothFilters() throws Exception {
        JsonNode rooms = list("?minCapacity=10&equipment=projector");
        assertThat(rooms.size()).isGreaterThan(0);
        rooms.forEach(room -> assertThat(room.get("capacity").asInt()).isGreaterThanOrEqualTo(10));
    }

    @Test
    void noMatchIsAnEmptyListNotAnError() throws Exception {
        mockMvc.perform(get("/api/rooms?equipment=teleporter"))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"))
                .andExpect(matchesContract());
    }

    @Test
    void includesInactiveRoomsMarkedInactive() throws Exception {
        JsonNode created = RoomTestSupport.createRoom(mockMvc, RoomTestSupport.uniqueName("Closed"), 3, List.of());
        RoomTestSupport.setActive(mockMvc, created.get("id").asLong(), false);
        boolean found = false;
        for (JsonNode room : list("")) {
            if (room.get("id").asLong() == created.get("id").asLong()) {
                found = true;
                assertThat(room.get("active").asBoolean()).isFalse();
            }
        }
        assertThat(found).isTrue();
    }

    @Test
    void ordersByNameIgnoringCase() throws Exception {
        List<String> names = new ArrayList<>();
        list("").forEach(room -> names.add(room.get("name").asText()));
        List<String> sorted = new ArrayList<>(names);
        sorted.sort(Comparator.comparing(String::toLowerCase));
        assertThat(names).isEqualTo(sorted);
    }

    @Test
    void rejectsNonPositiveMinimumCapacity() throws Exception {
        mockMvc.perform(get("/api/rooms?minCapacity=0"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("minCapacity")))
                .andExpect(matchesContractResponse());
    }

    @Test
    void rejectsNonNumericMinimumCapacity() throws Exception {
        mockMvc.perform(get("/api/rooms?minCapacity=abc"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(matchesContractResponse());
    }
}
