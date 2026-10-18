package com.roombook.service;

/** Raised for invalid room input; the message names the invalid field. */
public class InvalidRoomException extends RuntimeException {

    public InvalidRoomException(String message) {
        super(message);
    }
}
