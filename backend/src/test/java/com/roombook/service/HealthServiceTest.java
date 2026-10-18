package com.roombook.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.roombook.repository.HealthProbeRepository;
import com.roombook.service.HealthService.HealthReport;
import com.roombook.service.HealthService.Status;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;

class HealthServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-19T09:00:00Z");
    private final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
    private final HealthProbeRepository repository = mock(HealthProbeRepository.class);
    private final HealthService service = new HealthService(repository, clock);

    @Test
    void reportsUpWithTimeFromClock() {
        HealthReport report = service.check();
        assertThat(report.status()).isEqualTo(Status.UP);
        assertThat(report.database()).isEqualTo(Status.UP);
        assertThat(report.time()).isEqualTo(NOW);
        verify(repository).roundTrip(NOW);
    }

    @Test
    void reportsDownWhenRepositoryFails() {
        doThrow(new DataAccessResourceFailureException("locked")).when(repository).roundTrip(any());
        HealthReport report = service.check();
        assertThat(report.status()).isEqualTo(Status.DOWN);
        assertThat(report.database()).isEqualTo(Status.DOWN);
        assertThat(report.time()).isEqualTo(NOW);
    }
}
