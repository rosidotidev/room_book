package com.roombook.contract;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

class HealthContractTest extends ContractTestBase {

    @Test
    void healthIsUpAndMatchesContract() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.database").value("UP"))
                .andExpect(jsonPath("$.time").value(FIXED_NOW.toString()))
                .andExpect(matchesContract());
    }

    @Test
    void healthIsServiceUnavailableWhenDatabaseFails() throws Exception {
        jdbc.execute("ALTER TABLE health_probe RENAME TO health_probe_off");
        try {
            mockMvc.perform(get("/api/health"))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.status").value("DOWN"))
                    .andExpect(jsonPath("$.database").value("DOWN"))
                    .andExpect(matchesContract());
        } finally {
            jdbc.execute("ALTER TABLE health_probe_off RENAME TO health_probe");
        }
    }
}
