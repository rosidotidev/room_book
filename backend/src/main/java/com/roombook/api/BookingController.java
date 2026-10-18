package com.roombook.api;

import com.roombook.api.BookingDto.Booking;
import com.roombook.api.BookingDto.BookingInput;
import com.roombook.service.BookingService;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Maps HTTP to {@link BookingService}; all rules live in the service. */
@RestController
public class BookingController {

    private final BookingService service;

    public BookingController(BookingService service) {
        this.service = service;
    }

    @PostMapping("/api/bookings")
    public ResponseEntity<Booking> create(@RequestBody BookingInput input) {
        Booking booking = service.create(input);
        return ResponseEntity.created(URI.create("/api/bookings/" + booking.id())).body(booking);
    }

    @GetMapping("/api/bookings")
    public List<Booking> byOrganizer(@RequestParam String organizer) {
        return service.byOrganizer(organizer);
    }

    @DeleteMapping("/api/bookings/{id}")
    public Booking cancel(@PathVariable long id) {
        return service.cancel(id);
    }

    @GetMapping("/api/rooms/{id}/availability")
    public List<Booking> availability(@PathVariable long id,
                                      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.availability(id, date);
    }
}
