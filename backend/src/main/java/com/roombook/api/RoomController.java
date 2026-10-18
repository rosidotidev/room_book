package com.roombook.api;

import com.roombook.api.RoomDto.ActiveChange;
import com.roombook.api.RoomDto.Room;
import com.roombook.api.RoomDto.RoomActivationResult;
import com.roombook.api.RoomDto.RoomInput;
import com.roombook.service.RoomService;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Maps HTTP to {@link RoomService}; all rules live in the service. */
@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService service;

    public RoomController(RoomService service) {
        this.service = service;
    }

    @GetMapping
    public List<Room> list(@RequestParam(required = false) Integer minCapacity,
                           @RequestParam(required = false) String equipment) {
        return service.list(minCapacity, equipment);
    }

    @PostMapping
    public ResponseEntity<Room> create(@RequestBody RoomInput input) {
        Room room = service.create(input);
        return ResponseEntity.created(URI.create("/api/rooms/" + room.id())).body(room);
    }

    @PutMapping("/{id}")
    public Room update(@PathVariable long id, @RequestBody RoomInput input) {
        return service.update(id, input);
    }

    @PatchMapping("/{id}/active")
    public RoomActivationResult setActive(@PathVariable long id, @RequestBody ActiveChange change) {
        return service.setActive(id, change.active());
    }
}
