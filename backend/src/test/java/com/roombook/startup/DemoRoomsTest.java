package com.roombook.startup;

import static org.assertj.core.api.Assertions.assertThat;

import com.roombook.RoomBookApplication;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;

class DemoRoomsTest {

    @TempDir Path tmp;

    private ConfigurableApplicationContext start(Path db) {
        return new SpringApplicationBuilder(RoomBookApplication.class)
                .run("--server.port=0", "--spring.datasource.url=jdbc:sqlite:" + db);
    }

    @Test
    void freshInstallationHasVariedDemoRoomsAndRestartDoesNotDuplicateThem() {
        Path db = tmp.resolve("demo.db");

        try (ConfigurableApplicationContext first = start(db)) {
            JdbcTemplate jdbc = first.getBean(JdbcTemplate.class);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM room", Integer.class)).isEqualTo(6);
            assertThat(jdbc.queryForObject("SELECT count(DISTINCT capacity) FROM room", Integer.class))
                    .isGreaterThanOrEqualTo(5);
            assertThat(jdbc.queryForObject("SELECT count(DISTINCT item_key) FROM room_equipment", Integer.class))
                    .isGreaterThanOrEqualTo(3);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM room WHERE active = 1", Integer.class)).isEqualTo(6);
        }

        try (ConfigurableApplicationContext second = start(db)) {
            JdbcTemplate jdbc = second.getBean(JdbcTemplate.class);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM room", Integer.class)).isEqualTo(6);
        }
    }
}
