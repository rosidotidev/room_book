package com.roombook.repository;

import com.roombook.api.RoomDto.Room;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class RoomRepository {

    /** An equipment item as typed plus its lower-cased, trimmed key. */
    public record Item(String text, String key) {}

    private final JdbcTemplate jdbc;

    public RoomRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Rooms ordered by name, optionally with at least {@code minCapacity} seats and the equipment item {@code equipmentKey}. */
    public List<Room> findAll(Integer minCapacity, String equipmentKey) {
        StringBuilder sql = new StringBuilder("SELECT id, name, capacity, active FROM room WHERE 1 = 1");
        List<Object> args = new ArrayList<>();
        if (minCapacity != null) {
            sql.append(" AND capacity >= ?");
            args.add(minCapacity);
        }
        if (equipmentKey != null) {
            sql.append(" AND EXISTS (SELECT 1 FROM room_equipment e WHERE e.room_id = room.id AND e.item_key = ?)");
            args.add(equipmentKey);
        }
        sql.append(" ORDER BY name_key");

        Map<Long, List<String>> equipment = loadEquipment();
        return jdbc.query(sql.toString(), (rs, i) -> {
            long id = rs.getLong("id");
            return new Room(id, rs.getString("name"), rs.getInt("capacity"),
                    equipment.getOrDefault(id, List.of()), rs.getInt("active") == 1);
        }, args.toArray());
    }

    public Optional<Room> findById(long id) {
        // Read the row first: the pool has a single connection, so no query may run while a result set is open.
        List<Room> rooms = jdbc.query("SELECT id, name, capacity, active FROM room WHERE id = ?",
                (rs, i) -> new Room(rs.getLong("id"), rs.getString("name"), rs.getInt("capacity"),
                        List.of(), rs.getInt("active") == 1),
                id);
        return rooms.stream().findFirst().map(r -> new Room(r.id(), r.name(), r.capacity(), equipmentOf(id), r.active()));
    }

    /** True when another room (not {@code excludingId}) already uses this name key. */
    public boolean nameKeyTaken(String nameKey, Long excludingId) {
        Integer count = jdbc.queryForObject(
                "SELECT count(*) FROM room WHERE name_key = ? AND (? IS NULL OR id <> ?)",
                Integer.class, nameKey, excludingId, excludingId);
        return count != null && count > 0;
    }

    @Transactional
    public long insert(String name, String nameKey, int capacity, List<Item> equipment) {
        jdbc.update("INSERT INTO room (name, name_key, capacity, active) VALUES (?, ?, ?, 1)", name, nameKey, capacity);
        Long id = jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);
        replaceEquipment(id, equipment);
        return id;
    }

    @Transactional
    public void update(long id, String name, String nameKey, int capacity, List<Item> equipment) {
        jdbc.update("UPDATE room SET name = ?, name_key = ?, capacity = ? WHERE id = ?", name, nameKey, capacity, id);
        replaceEquipment(id, equipment);
    }

    public void setActive(long id, boolean active) {
        jdbc.update("UPDATE room SET active = ? WHERE id = ?", active ? 1 : 0, id);
    }

    private void replaceEquipment(long roomId, List<Item> equipment) {
        jdbc.update("DELETE FROM room_equipment WHERE room_id = ?", roomId);
        for (Item item : equipment) {
            jdbc.update("INSERT INTO room_equipment (room_id, item, item_key) VALUES (?, ?, ?)",
                    roomId, item.text(), item.key());
        }
    }

    private List<String> equipmentOf(long roomId) {
        return jdbc.queryForList("SELECT item FROM room_equipment WHERE room_id = ? ORDER BY rowid", String.class, roomId);
    }

    private Map<Long, List<String>> loadEquipment() {
        Map<Long, List<String>> byRoom = new HashMap<>();
        jdbc.query("SELECT room_id, item FROM room_equipment ORDER BY rowid", rs -> {
            byRoom.computeIfAbsent(rs.getLong("room_id"), k -> new ArrayList<>()).add(rs.getString("item"));
        });
        return byRoom;
    }
}
