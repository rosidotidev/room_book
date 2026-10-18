package com.roombook.startup;

import static org.assertj.core.api.Assertions.assertThat;

import com.roombook.RoomBookApplication;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;

class SeedMechanismTest {

    @TempDir Path tmp;

    @Test
    void seedProfileWithEmptySeedFolderStartsCleanly() {
        try (ConfigurableApplicationContext ctx = new SpringApplicationBuilder(RoomBookApplication.class).run(
                "--server.port=0",
                "--spring.profiles.active=seed",
                "--spring.datasource.url=jdbc:sqlite:" + tmp.resolve("seed.db"))) {
            JdbcTemplate jdbc = ctx.getBean(JdbcTemplate.class);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history", Integer.class)).isEqualTo(4);
        }
    }
}
