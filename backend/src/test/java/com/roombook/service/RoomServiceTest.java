package com.roombook.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.roombook.api.RoomDto.BookingSummary;
import com.roombook.api.RoomDto.Room;
import com.roombook.api.RoomDto.RoomActivationResult;
import com.roombook.api.RoomDto.RoomInput;
import com.roombook.repository.RoomRepository;
import com.roombook.repository.RoomRepository.Item;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class RoomServiceTest {

    private RoomRepository repository;
    private FutureBookingsProvider bookings;
    private RoomService service;

    @BeforeEach
    void setUp() {
        repository = mock(RoomRepository.class);
        bookings = mock(FutureBookingsProvider.class);
        service = new RoomService(repository, bookings);
        when(repository.insert(anyString(), anyString(), anyInt(), anyList())).thenReturn(7L);
        when(repository.findById(anyLong())).thenAnswer(inv ->
                Optional.of(new Room(inv.getArgument(0), "Any", 4, List.of(), true)));
    }

    // --- listing ---

    @Test
    void equipmentFilterIsNormalisedToATrimmedLowerCaseKey() {
        service.list(null, "  Projector ");
        verify(repository).findAll(isNull(), eq("projector"));
    }

    @Test
    void blankEquipmentFilterMeansNoFilter() {
        service.list(null, "   ");
        verify(repository).findAll(isNull(), isNull());
    }

    @Test
    void minimumCapacityBelowOneIsInvalid() {
        assertThatThrownBy(() -> service.list(0, null)).isInstanceOf(InvalidRoomException.class)
                .hasMessageContaining("minCapacity");
        assertThatThrownBy(() -> service.list(-3, null)).isInstanceOf(InvalidRoomException.class);
    }

    // --- create / update normalisation ---

    @Test
    void trimsNameAndEquipmentAndDeduplicatesIgnoringCaseKeepingTheFirstSpelling() {
        service.create(new RoomInput("  Gamma  ", 5, List.of(" Whiteboard ", "whiteboard", "Projector")));

        ArgumentCaptor<List<Item>> items = ArgumentCaptor.forClass(List.class);
        verify(repository).insert(eq("Gamma"), eq("gamma"), eq(5), items.capture());
        assertThat(items.getValue()).containsExactly(
                new Item("Whiteboard", "whiteboard"), new Item("Projector", "projector"));
    }

    @Test
    void missingEquipmentMeansNoEquipment() {
        service.create(new RoomInput("Solo", 2, null));
        ArgumentCaptor<List<Item>> items = ArgumentCaptor.forClass(List.class);
        verify(repository).insert(eq("Solo"), eq("solo"), eq(2), items.capture());
        assertThat(items.getValue()).isEmpty();
    }

    // --- uniqueness ---

    @Test
    void duplicateNameIsRejectedOnCreate() {
        when(repository.nameKeyTaken("gamma", null)).thenReturn(true);
        assertThatThrownBy(() -> service.create(new RoomInput(" GAMMA", 5, List.of())))
                .isInstanceOf(DuplicateRoomNameException.class);
        verify(repository, never()).insert(anyString(), anyString(), anyInt(), anyList());
    }

    @Test
    void updateExcludesTheRoomItselfFromTheDuplicateCheck() {
        when(repository.nameKeyTaken("gamma", 3L)).thenReturn(false);
        service.update(3, new RoomInput("Gamma", 5, List.of()));
        verify(repository).nameKeyTaken("gamma", 3L);
        verify(repository).update(eq(3L), eq("Gamma"), eq("gamma"), eq(5), anyList());
    }

    @Test
    void renamingToAnotherRoomsNameIsRejected() {
        when(repository.nameKeyTaken("taken", 3L)).thenReturn(true);
        assertThatThrownBy(() -> service.update(3, new RoomInput("Taken", 5, List.of())))
                .isInstanceOf(DuplicateRoomNameException.class);
    }

    @Test
    void updatingAnUnknownRoomIsNotFoundBeforeTheBodyIsValidated() {
        when(repository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.update(99, new RoomInput("", 0, null)))
                .isInstanceOf(RoomNotFoundException.class);
    }

    @Test
    void uniqueConstraintViolationFromAConcurrentRequestBecomesADuplicateName() {
        org.springframework.dao.DataIntegrityViolationException violation =
                new org.springframework.dao.DataIntegrityViolationException("insert failed",
                        new java.sql.SQLException("[SQLITE_CONSTRAINT_UNIQUE] UNIQUE constraint failed: room.name_key"));
        when(repository.insert(anyString(), anyString(), anyInt(), anyList())).thenThrow(violation);
        assertThatThrownBy(() -> service.create(new RoomInput("Race", 4, List.of())))
                .isInstanceOf(DuplicateRoomNameException.class);

        org.mockito.Mockito.doThrow(violation).when(repository).update(eq(3L), anyString(), anyString(), anyInt(), anyList());
        assertThatThrownBy(() -> service.update(3, new RoomInput("Race", 4, List.of())))
                .isInstanceOf(DuplicateRoomNameException.class);
    }

    @Test
    void otherDatabaseFailuresPropagateUnchanged() {
        org.springframework.dao.DataIntegrityViolationException other =
                new org.springframework.dao.DataIntegrityViolationException("insert failed",
                        new java.sql.SQLException("disk I/O error"));
        when(repository.insert(anyString(), anyString(), anyInt(), anyList())).thenThrow(other);
        assertThatThrownBy(() -> service.create(new RoomInput("Boom", 4, List.of()))).isSameAs(other);
    }

    // --- validation limits ---

    @Test
    void validatesEveryLimit() {
        assertInvalid(new RoomInput(null, 4, List.of()), "name");
        assertInvalid(new RoomInput("   ", 4, List.of()), "name");
        assertInvalid(new RoomInput("n".repeat(101), 4, List.of()), "name");
        assertInvalid(new RoomInput("Ok", null, List.of()), "capacity");
        assertInvalid(new RoomInput("Ok", 0, List.of()), "capacity");
        assertInvalid(new RoomInput("Ok", -1, List.of()), "capacity");
        assertInvalid(new RoomInput("Ok", 1001, List.of()), "capacity");
        assertInvalid(new RoomInput("Ok", 4, java.util.Collections.nCopies(21, "x")), "equipment");
        assertInvalid(new RoomInput("Ok", 4, List.of("  ")), "equipment");
        assertInvalid(new RoomInput("Ok", 4, List.of("e".repeat(51))), "equipment");
    }

    @Test
    void acceptsTheBoundaryValues() {
        service.create(new RoomInput("n".repeat(100), 1, List.of("e".repeat(50))));
        service.create(new RoomInput("Max", 1000, java.util.stream.IntStream.range(0, 20).mapToObj(i -> "i" + i).toList()));
    }

    private void assertInvalid(RoomInput input, String field) {
        assertThatThrownBy(() -> service.create(input)).isInstanceOf(InvalidRoomException.class)
                .hasMessageContaining(field);
    }

    // --- activation ---

    @Test
    void deactivationReportsTheProvidersFutureBookingsAndDeletesNothing() {
        List<BookingSummary> future = List.of(new BookingSummary(1, "Standup", "Ana",
                OffsetDateTime.parse("2026-11-02T09:00:00+01:00"), OffsetDateTime.parse("2026-11-02T09:30:00+01:00")));
        when(bookings.futureBookingsOf(5L)).thenReturn(future);

        RoomActivationResult result = service.setActive(5, false);

        assertThat(result.futureBookings()).isEqualTo(future);
        verify(repository).setActive(5L, false);
        // the repository exposes no delete operation at all: deactivation can only flip the flag
        assertThat(RoomRepository.class.getDeclaredMethods())
                .noneMatch(m -> m.getName().toLowerCase().contains("delete"));
    }

    @Test
    void activeIsRequired() {
        assertThatThrownBy(() -> service.setActive(5, null)).isInstanceOf(InvalidRoomException.class)
                .hasMessageContaining("active");
        verify(repository, never()).setActive(anyLong(), any(Boolean.class));
    }

    @Test
    void unknownRoomIsNotFoundWhenChangingTheActiveState() {
        when(repository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.setActive(99, true)).isInstanceOf(RoomNotFoundException.class);
    }
}
