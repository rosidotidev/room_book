package com.roombook.contract;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** Helpers that let contract tests create rooms with unique names so that tests do not depend on each other. */
final class RoomTestSupport {

    static final ObjectMapper JSON = new ObjectMapper();

    private RoomTestSupport() {}

    static String uniqueName(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    static String roomJson(String name, Object capacity, List<String> equipment) throws Exception {
        var node = JSON.createObjectNode();
        if (name != null) {
            node.put("name", name);
        }
        if (capacity instanceof Integer c) {
            node.put("capacity", c);
        }
        if (equipment != null) {
            var array = node.putArray("equipment");
            equipment.forEach(array::add);
        }
        return JSON.writeValueAsString(node);
    }

    static JsonNode createRoom(MockMvc mockMvc, String name, int capacity, List<String> equipment) throws Exception {
        String body = mockMvc.perform(post("/api/rooms").contentType(MediaType.APPLICATION_JSON)
                        .content(roomJson(name, capacity, equipment)))
                .andReturn().getResponse().getContentAsString();
        return JSON.readTree(body);
    }

    static void setActive(MockMvc mockMvc, long id, boolean active) throws Exception {
        mockMvc.perform(patch("/api/rooms/" + id + "/active").contentType(MediaType.APPLICATION_JSON)
                .content("{\"active\":" + active + "}"));
    }
}
