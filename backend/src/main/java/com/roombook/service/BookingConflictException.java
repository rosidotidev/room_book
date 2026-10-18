package com.roombook.service;

/** The requested slot overlaps a confirmed booking of the same room. */
public class BookingConflictException extends RuntimeException {

    public BookingConflictException(String message) {
        super(message);
    }
}
