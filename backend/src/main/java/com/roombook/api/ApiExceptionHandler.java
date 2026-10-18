package com.roombook.api;

import com.roombook.service.BookingConflictException;
import com.roombook.service.BookingNotFoundException;
import com.roombook.service.BookingRuleException;
import com.roombook.service.CancellationTooLateException;
import com.roombook.service.DuplicateRoomNameException;
import com.roombook.service.InvalidRoomException;
import com.roombook.service.RoomDeactivatedException;
import com.roombook.service.RoomNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/** Every error leaves the API as application/problem+json; unexpected failures expose no internals. */
@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(RoomNotFoundException.class)
    public ProblemDetail handleNotFound(RoomNotFoundException e) {
        return problem(HttpStatus.NOT_FOUND, "Room not found", e.getMessage());
    }

    @ExceptionHandler(DuplicateRoomNameException.class)
    public ProblemDetail handleDuplicate(DuplicateRoomNameException e) {
        return problem(HttpStatus.CONFLICT, "Room name already exists", e.getMessage());
    }

    @ExceptionHandler(InvalidRoomException.class)
    public ProblemDetail handleInvalid(InvalidRoomException e) {
        return problem(HttpStatus.BAD_REQUEST, "Invalid room", e.getMessage());
    }

    @ExceptionHandler(BookingRuleException.class)
    public ProblemDetail handleBookingRule(BookingRuleException e) {
        return problem(HttpStatus.BAD_REQUEST, "Booking not allowed", e.getMessage());
    }

    @ExceptionHandler(BookingNotFoundException.class)
    public ProblemDetail handleBookingNotFound(BookingNotFoundException e) {
        return problem(HttpStatus.NOT_FOUND, "Booking not found", e.getMessage());
    }

    @ExceptionHandler(BookingConflictException.class)
    public ProblemDetail handleBookingConflict(BookingConflictException e) {
        return problem(HttpStatus.CONFLICT, "Slot already booked", e.getMessage());
    }

    @ExceptionHandler(CancellationTooLateException.class)
    public ProblemDetail handleCancellationTooLate(CancellationTooLateException e) {
        return problem(HttpStatus.CONFLICT, "Too late to cancel", e.getMessage());
    }

    @ExceptionHandler(RoomDeactivatedException.class)
    public ProblemDetail handleRoomDeactivated(RoomDeactivatedException e) {
        return problem(HttpStatus.UNPROCESSABLE_ENTITY, "Room not available", e.getMessage());
    }

    private static ProblemDetail problem(HttpStatus status, String title, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(title);
        return problem;
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleUnexpected(Exception e, HttpServletRequest request) {
        log.error("Unexpected failure on {}", request.getRequestURI(), e);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred. Please try again later.");
        problem.setTitle("Internal Server Error");
        problem.setInstance(java.net.URI.create(request.getRequestURI()));
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(org.springframework.http.MediaType.APPLICATION_PROBLEM_JSON)
                .body(problem);
    }
}
