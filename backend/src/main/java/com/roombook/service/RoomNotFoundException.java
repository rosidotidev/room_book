package com.roombook.service;

public class RoomNotFoundException extends RuntimeException {

    public RoomNotFoundException(long id) {
        super("Room " + id + " does not exist.");
    }
}
