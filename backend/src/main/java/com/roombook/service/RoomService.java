package com.roombook.service;

import com.roombook.api.RoomDto.Room;
import com.roombook.api.RoomDto.RoomActivationResult;
import com.roombook.api.RoomDto.RoomInput;
import com.roombook.repository.RoomRepository;
import com.roombook.repository.RoomRepository.Item;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

/** Business rules of the room catalog: validation, normalisation and name uniqueness. */
@Service
public class RoomService {

    static final int NAME_MAX = 100;
    static final int CAPACITY_MAX = 1000;
    static final int EQUIPMENT_MAX_ITEMS = 20;
    static final int EQUIPMENT_ITEM_MAX = 50;

    private final RoomRepository repository;
    private final FutureBookingsProvider futureBookings;

    public RoomService(RoomRepository repository, FutureBookingsProvider futureBookings) {
        this.repository = repository;
        this.futureBookings = futureBookings;
    }

    public List<Room> list(Integer minCapacity, String equipment) {
        if (minCapacity != null && minCapacity < 1) {
            throw new InvalidRoomException("minCapacity must be a whole number greater than zero.");
        }
        String equipmentKey = equipment == null || equipment.isBlank() ? null : key(equipment);
        return repository.findAll(minCapacity, equipmentKey);
    }

    public Room create(RoomInput input) {
        Valid valid = validate(input);
        if (repository.nameKeyTaken(valid.nameKey, null)) {
            throw new DuplicateRoomNameException(valid.name);
        }
        long id;
        try {
            id = repository.insert(valid.name, valid.nameKey, valid.capacity, valid.equipment);
        } catch (DataAccessException e) {
            throw translateDuplicate(e, valid.name);
        }
        return repository.findById(id).orElseThrow(() -> new RoomNotFoundException(id));
    }

    public Room update(long id, RoomInput input) {
        repository.findById(id).orElseThrow(() -> new RoomNotFoundException(id));
        Valid valid = validate(input);
        if (repository.nameKeyTaken(valid.nameKey, id)) {
            throw new DuplicateRoomNameException(valid.name);
        }
        try {
            repository.update(id, valid.name, valid.nameKey, valid.capacity, valid.equipment);
        } catch (DataAccessException e) {
            throw translateDuplicate(e, valid.name);
        }
        return repository.findById(id).orElseThrow(() -> new RoomNotFoundException(id));
    }

    /** Flips the active flag (idempotent); never deletes anything. */
    public RoomActivationResult setActive(long id, Boolean active) {
        repository.findById(id).orElseThrow(() -> new RoomNotFoundException(id));
        if (active == null) {
            throw new InvalidRoomException("active is required and must be true or false.");
        }
        repository.setActive(id, active);
        Room room = repository.findById(id).orElseThrow(() -> new RoomNotFoundException(id));
        return new RoomActivationResult(room, futureBookings.futureBookingsOf(id));
    }

    private record Valid(String name, String nameKey, int capacity, List<Item> equipment) {}

    private Valid validate(RoomInput input) {
        if (input == null) {
            throw new InvalidRoomException("A room description is required.");
        }
        String name = input.name() == null ? "" : input.name().trim();
        if (name.isEmpty()) {
            throw new InvalidRoomException("name is required.");
        }
        if (name.length() > NAME_MAX) {
            throw new InvalidRoomException("name must be at most " + NAME_MAX + " characters.");
        }
        Integer capacity = input.capacity();
        if (capacity == null || capacity < 1) {
            throw new InvalidRoomException("capacity must be a whole number greater than zero.");
        }
        if (capacity > CAPACITY_MAX) {
            throw new InvalidRoomException("capacity must be at most " + CAPACITY_MAX + ".");
        }
        return new Valid(name, key(name), capacity, normaliseEquipment(input.equipment()));
    }

    private List<Item> normaliseEquipment(List<String> raw) {
        if (raw == null) {
            return List.of();
        }
        if (raw.size() > EQUIPMENT_MAX_ITEMS) {
            throw new InvalidRoomException("equipment must have at most " + EQUIPMENT_MAX_ITEMS + " items.");
        }
        Map<String, Item> unique = new LinkedHashMap<>();
        for (String entry : raw) {
            String text = entry == null ? "" : entry.trim();
            if (text.isEmpty()) {
                throw new InvalidRoomException("equipment items must not be empty.");
            }
            if (text.length() > EQUIPMENT_ITEM_MAX) {
                throw new InvalidRoomException(
                        "equipment items must be at most " + EQUIPMENT_ITEM_MAX + " characters.");
            }
            unique.putIfAbsent(key(text), new Item(text, key(text)));
        }
        return new ArrayList<>(unique.values());
    }

    private static String key(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private RuntimeException translateDuplicate(DataAccessException e, String name) {
        String message = String.valueOf(e.getMostSpecificCause().getMessage());
        return message.contains("UNIQUE") ? new DuplicateRoomNameException(name) : e;
    }
}
