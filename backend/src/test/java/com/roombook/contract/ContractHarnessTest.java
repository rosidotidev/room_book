package com.roombook.contract;

import static org.assertj.core.api.Assertions.assertThat;

import com.atlassian.oai.validator.OpenApiInteractionValidator;
import com.atlassian.oai.validator.model.Request;
import com.atlassian.oai.validator.model.SimpleRequest;
import com.atlassian.oai.validator.model.SimpleResponse;
import com.atlassian.oai.validator.report.ValidationReport;
import org.junit.jupiter.api.Test;

/** Proves the harness is able to fail: a deviating response must not validate. */
class ContractHarnessTest {

    private final OpenApiInteractionValidator validator =
            OpenApiInteractionValidator.createFor(ContractTestBase.CONTRACT.toString()).build();

    private final Request request = SimpleRequest.Builder.get("/api/health").build();

    @Test
    void conformingResponsePasses() {
        var response = SimpleResponse.Builder.ok()
                .withContentType("application/json")
                .withBody("{\"status\":\"UP\",\"database\":\"UP\",\"time\":\"2026-10-19T09:00:00Z\"}")
                .build();
        ValidationReport report = validator.validate(request, response);
        assertThat(report.hasErrors()).isFalse();
    }

    @Test
    void deviatingResponseFails() {
        var response = SimpleResponse.Builder.ok()
                .withContentType("application/json")
                .withBody("{\"status\":\"SIDEWAYS\",\"time\":\"yesterday\"}")
                .build();
        ValidationReport report = validator.validate(request, response);
        assertThat(report.hasErrors()).isTrue();
    }
}
