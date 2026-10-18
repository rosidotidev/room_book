package com.roombook.contract;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.parser.OpenAPIV3Parser;
import java.util.Map;

/** Checks a response body against the {@code Problem} schema published in the contract. */
final class ProblemSchemaAssert {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Schema<?> PROBLEM = load();

    private ProblemSchemaAssert() {}

    private static Schema<?> load() {
        OpenAPI api = new OpenAPIV3Parser().read(ContractTestBase.CONTRACT.toString());
        Schema<?> schema = api.getComponents().getSchemas().get("Problem");
        assertThat(schema).as("Problem schema in the contract").isNotNull();
        return schema;
    }

    static void assertMatches(String body, int expectedStatus) throws Exception {
        JsonNode node = JSON.readTree(body);
        assertThat(node.isObject()).isTrue();
        for (String required : PROBLEM.getRequired()) {
            assertThat(node.has(required)).as("required field '%s'", required).isTrue();
        }
        for (Map.Entry<String, Schema> property : ((Map<String, Schema>) (Map<?, ?>) PROBLEM.getProperties()).entrySet()) {
            JsonNode value = node.get(property.getKey());
            if (value == null) {
                continue;
            }
            String type = property.getValue().getType();
            if ("string".equals(type)) {
                assertThat(value.isTextual()).as("'%s' must be a string", property.getKey()).isTrue();
            } else if ("integer".equals(type)) {
                assertThat(value.isIntegralNumber()).as("'%s' must be an integer", property.getKey()).isTrue();
            }
        }
        assertThat(node.get("status").asInt()).isEqualTo(expectedStatus);
    }
}
