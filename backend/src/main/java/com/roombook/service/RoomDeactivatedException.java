package com.roombook.service;

public class RoomDeactivatedException extends RuntimeException {

    public RoomDeactivatedException(String roomName) {
        super("The room '" + roomName + "' is deactivated and cannot be booked.");
    }
}
