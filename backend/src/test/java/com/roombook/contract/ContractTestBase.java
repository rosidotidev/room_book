package com.roombook.contract;

import com.atlassian.oai.validator.OpenApiInteractionValidator;
import com.atlassian.oai.validator.mockmvc.OpenApiValidationMatchers;
import com.atlassian.oai.validator.report.LevelResolver;
import com.atlassian.oai.validator.report.ValidationReport;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultMatcher;

/** Base for contract tests: fixed Clock, isolated SQLite file, validation against the published contract. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(ContractTestBase.FixedClockConfig.class)
public abstract class ContractTestBase {

    public static final Instant FIXED_NOW = Instant.parse("2026-10-19T09:00:00Z");
    public static final Path CONTRACT = Path.of("..", "specs", "001-project-setup", "contracts", "openapi.yaml");

    private static final Path DB_DIR = createTempDir();

    @Autowired protected MockMvc mockMvc;
    @Autowired protected JdbcTemplate jdbc;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DB_DIR.resolve("contract.db"));
    }

    protected static ResultMatcher matchesContract() {
        return OpenApiValidationMatchers.openApi().isValid(CONTRACT.toString());
    }

    /** For negative tests: the request is deliberately invalid, so only the response is validated. */
    protected static ResultMatcher matchesContractResponse() {
        OpenApiInteractionValidator validator = OpenApiInteractionValidator.createFor(CONTRACT.toString())
                .withLevelResolver(LevelResolver.create()
                        .withLevel("validation.request", ValidationReport.Level.IGNORE)
                        .build())
                .build();
        return OpenApiValidationMatchers.openApi().isValid(validator);
    }

    private static Path createTempDir() {
        try {
            return Files.createTempDirectory("roombook-contract");
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @TestConfiguration
    static class FixedClockConfig {
        @Bean
        @Primary
        Clock fixedClock() {
            return Clock.fixed(FIXED_NOW, ZoneOffset.UTC);
        }
    }
}
