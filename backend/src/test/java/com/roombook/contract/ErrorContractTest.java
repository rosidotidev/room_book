package com.roombook.contract;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Addresses that are not declared in the contract have no operation to match, so these responses
 * are checked against the contract's {@code Problem} schema instead (see {@link ProblemSchemaAssert}).
 */
class ErrorContractTest extends ContractTestBase {

    @Test
    void unknownPathReturnsProblemJson404() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/unknown"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.instance").value("/api/unknown"))
                .andReturn();
        ProblemSchemaAssert.assertMatches(result.getResponse().getContentAsString(), 404);
    }

    @Test
    void unsupportedMethodUsesTheSameFormat() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/health"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andReturn();
        ProblemSchemaAssert.assertMatches(result.getResponse().getContentAsString(), 405);
    }

    @Test
    void unexpectedFailureReturnsProblemJson500WithoutInternals() throws Exception {
        MvcResult result = mockMvc.perform(get("/test/fail"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andReturn();
        String body = result.getResponse().getContentAsString();
        ProblemSchemaAssert.assertMatches(body, 500);
        assertThat(body).doesNotContain("secret", "IllegalStateException", "jdbc:", "at com.");
    }
}
