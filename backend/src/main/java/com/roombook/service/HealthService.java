package com.roombook.service;

import com.roombook.repository.HealthProbeRepository;
import java.time.Clock;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class HealthService {

    public enum Status { UP, DOWN }

    public record HealthReport(Status status, Status database, Instant time) {}

    private static final Logger log = LoggerFactory.getLogger(HealthService.class);

    private final HealthProbeRepository repository;
    private final Clock clock;

    public HealthService(HealthProbeRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    public HealthReport check() {
        Instant now = clock.instant();
        Status database;
        try {
            repository.roundTrip(now);
            database = Status.UP;
        } catch (RuntimeException e) {
            log.warn("Database health probe failed", e);
            database = Status.DOWN;
        }
        return new HealthReport(database, database, now);
    }
}
