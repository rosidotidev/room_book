package com.roombook.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.roombook.repository.BookingRepository;
import com.roombook.repository.RoomRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;

/** SC-004: room-day and organizer listings return in under one second with 10,000 bookings. */
@SpringBootTest
class BookingListPerformanceTest {

    private static final Path DB_DIR = tempDir();

    @Autowired BookingService service;
    @Autowired BookingRepository bookings;
    @Autowired RoomRepository rooms;
    @Autowired TransactionTemplate tx;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DB_DIR.resolve("perf-bookings.db"));
    }

    @Test
    void listingsStayUnderOneSecondWithTenThousandBookings() {
        long[] roomIds = new long[10];
        for (int i = 0; i < roomIds.length; i++) {
            roomIds[i] = rooms.insert("Perf " + i, "perf " + i, 8, List.of());
        }
        Instant base = LocalDate.of(2030, 1, 1).atStartOfDay().toInstant(ZoneOffset.UTC);
        tx.executeWithoutResult(status -> {
            for (int i = 0; i < 10_000; i++) {
                Instant start = base.plusSeconds((long) (i / 10) * 3600 * 24 + 8 * 3600 + (i % 10) * 3600L);
                String organizer = "Organizer " + (i % 100);
                bookings.insert(roomIds[i % 10], "Meeting " + i, organizer, organizer.toLowerCase(),
                        start, start.plusSeconds(3600), base);
            }
        });

        long begin = System.nanoTime();
        var day = service.availability(roomIds[0], LocalDate.of(2030, 1, 2));
        var mine = service.byOrganizer("organizer 5");
        Duration elapsed = Duration.ofNanos(System.nanoTime() - begin);

        assertThat(mine).hasSize(100);
        assertThat(day).isNotNull();
        assertThat(elapsed).isLessThan(Duration.ofSeconds(1));
    }

    private static Path tempDir() {
        try {
            return Files.createTempDirectory("roombook-perf-bookings");
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
