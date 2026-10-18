package com.roombook.startup;

import static org.assertj.core.api.Assertions.assertThat;

import com.roombook.RoomBookApplication;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;

class DatabaseStartupTest {

    @TempDir Path tmp;

    private ConfigurableApplicationContext start(Path db) {
        return new SpringApplicationBuilder(RoomBookApplication.class)
                .run("--server.port=0", "--spring.datasource.url=jdbc:sqlite:" + db);
    }

    @Test
    void createsMissingFolderAndFileAndKeepsDataAcrossRestart() {
        Path db = tmp.resolve("not").resolve("yet").resolve("roombook.db");
        assertThat(db.getParent()).doesNotExist();

        try (ConfigurableApplicationContext first = start(db)) {
            JdbcTemplate jdbc = first.getBean(JdbcTemplate.class);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history", Integer.class)).isEqualTo(4);
            jdbc.update("INSERT INTO health_probe (id, checked_at) VALUES (42, 'kept')");
        }
        assertThat(Files.exists(db)).isTrue();

        try (ConfigurableApplicationContext second = start(db)) {
            JdbcTemplate jdbc = second.getBean(JdbcTemplate.class);
            assertThat(jdbc.queryForObject("SELECT checked_at FROM health_probe WHERE id = 42", String.class))
                    .isEqualTo("kept");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history", Integer.class)).isEqualTo(4);
        }
    }
}
