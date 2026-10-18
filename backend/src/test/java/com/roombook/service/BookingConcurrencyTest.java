package com.roombook.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.roombook.api.BookingDto.BookingInput;
import com.roombook.repository.RoomRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** SC-001: with 50 simultaneous requests for the same slot, exactly one is confirmed. */
@SpringBootTest
class BookingConcurrencyTest {

    private static final Path DB_DIR = tempDir();
    private static final ZoneId OFFICE = ZoneId.of("Europe/Rome");

    @Autowired BookingService service;
    @Autowired RoomRepository rooms;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DB_DIR.resolve("concurrency.db"));
    }

    @Test
    void fiftySimultaneousRequestsForTheSameSlotConfirmExactlyOne() throws Exception {
        long room = rooms.insert("Race room", "race room", 6, List.of());
        LocalDate day = LocalDate.now(OFFICE).plusDays(21);
        while (day.getDayOfWeek() == DayOfWeek.SATURDAY || day.getDayOfWeek() == DayOfWeek.SUNDAY) {
            day = day.plusDays(1);
        }
        BookingInput input = new BookingInput(room, "Contested", "Racer",
                ZonedDateTime.of(day, LocalTime.of(10, 0), OFFICE).toOffsetDateTime(),
                ZonedDateTime.of(day, LocalTime.of(11, 0), OFFICE).toOffsetDateTime());

        int threads = 50;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch go = new CountDownLatch(1);
        AtomicInteger confirmed = new AtomicInteger();
        AtomicInteger clashes = new AtomicInteger();
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            Callable<Void> task = () -> {
                ready.countDown();
                go.await();
                try {
                    service.create(input);
                    confirmed.incrementAndGet();
                } catch (BookingConflictException e) {
                    clashes.incrementAndGet();
                }
                return null;
            };
            futures.add(pool.submit(task));
        }
        ready.await();
        go.countDown();
        for (Future<?> f : futures) {
            f.get();
        }
        pool.shutdown();

        assertThat(confirmed.get()).isEqualTo(1);
        assertThat(clashes.get()).isEqualTo(threads - 1);
        assertThat(service.availability(room, day)).hasSize(1);
    }

    private static Path tempDir() {
        try {
            return Files.createTempDirectory("roombook-concurrency");
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
