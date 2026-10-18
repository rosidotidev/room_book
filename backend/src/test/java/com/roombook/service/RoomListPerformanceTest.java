package com.roombook.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.roombook.api.RoomDto.Room;
import com.roombook.repository.RoomRepository;
import com.roombook.repository.RoomRepository.Item;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** SC-001: listing and filtering stay under one second with up to 500 rooms. */
@SpringBootTest
class RoomListPerformanceTest {

    private static final Path DB_DIR = tempDir();

    @Autowired RoomRepository repository;
    @Autowired RoomService service;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DB_DIR.resolve("perf.db"));
    }

    @Test
    void listsAndFiltersFiveHundredRoomsUnderOneSecond() {
        for (int i = 0; i < 500; i++) {
            repository.insert("Perf room " + i, "perf room " + i, 1 + i % 40,
                    List.of(new Item("Projector", "projector"), new Item("Whiteboard", "whiteboard")));
        }

        long start = System.nanoTime();
        List<Room> all = service.list(null, null);
        List<Room> filtered = service.list(20, "PROJECTOR");
        Duration elapsed = Duration.ofNanos(System.nanoTime() - start);

        assertThat(all.size()).isGreaterThanOrEqualTo(500);
        assertThat(filtered).isNotEmpty();
        assertThat(elapsed).isLessThan(Duration.ofSeconds(1));
    }

    private static Path tempDir() {
        try {
            return Files.createTempDirectory("roombook-perf");
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
