package com.roombook.repository;

import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class HealthProbeRepository {

    private final JdbcTemplate jdbc;

    public HealthProbeRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Writes a row, reads it back and deletes it in one transaction; throws if any step fails. */
    @Transactional
    public void roundTrip(Instant at) {
        jdbc.update("INSERT INTO health_probe (id, checked_at) VALUES (1, ?)", at.toString());
        String stored = jdbc.queryForObject("SELECT checked_at FROM health_probe WHERE id = 1", String.class);
        if (!at.toString().equals(stored)) {
            throw new IllegalStateException("health probe read back a different value");
        }
        jdbc.update("DELETE FROM health_probe WHERE id = 1");
    }
}
