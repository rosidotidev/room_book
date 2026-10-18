package com.roombook.contract;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class RoomCreateContractTest extends ContractTestBase {

    private ResultActions create(String json) throws Exception {
        return mockMvc.perform(post("/api/rooms").contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    void createsAnActiveRoomWithLocation() throws Exception {
        String name = RoomTestSupport.uniqueName("Gamma");
        create(RoomTestSupport.roomJson(name, 5, List.of("Whiteboard", " whiteboard ", "Projector")))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", org.hamcrest.Matchers.startsWith("/api/rooms/")))
                .andExpect(jsonPath("$.name").value(name))
                .andExpect(jsonPath("$.capacity").value(5))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.equipment.length()").value(2))
                .andExpect(matchesContract());
    }

    @Test
    void rejectsDuplicateNamesIgnoringCaseAndSpaces() throws Exception {
        String name = RoomTestSupport.uniqueName("Dup");
        create(RoomTestSupport.roomJson(name, 4, List.of())).andExpect(status().isCreated());
        create(RoomTestSupport.roomJson("  " + name.toUpperCase() + " ", 4, List.of()))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("already exists")))
                .andExpect(matchesContract());
    }

    @Test
    void rejectsMissingName() throws Exception {
        invalid(RoomTestSupport.roomJson(null, 4, List.of()), "name");
    }

    @Test
    void rejectsCapacityZero() throws Exception {
        invalid(RoomTestSupport.roomJson(RoomTestSupport.uniqueName("Zero"), 0, List.of()), "capacity");
    }

    @Test
    void rejectsCapacityAboveMaximum() throws Exception {
        invalid(RoomTestSupport.roomJson(RoomTestSupport.uniqueName("Big"), 1001, List.of()), "capacity");
    }

    @Test
    void rejectsTooLongName() throws Exception {
        invalid(RoomTestSupport.roomJson("n".repeat(101), 4, List.of()), "name");
    }

    @Test
    void rejectsMoreThanTwentyEquipmentItems() throws Exception {
        List<String> items = java.util.stream.IntStream.range(0, 21).mapToObj(i -> "item" + i).toList();
        invalid(RoomTestSupport.roomJson(RoomTestSupport.uniqueName("Many"), 4, items), "equipment");
    }

    @Test
    void rejectsMalformedJson() throws Exception {
        create("{not json").andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(matchesContractResponse());
    }

    private void invalid(String json, String field) throws Exception {
        create(json).andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString(field)))
                .andExpect(matchesContractResponse());
        assertThat(Collections.emptyList()).isEmpty();
    }
}
