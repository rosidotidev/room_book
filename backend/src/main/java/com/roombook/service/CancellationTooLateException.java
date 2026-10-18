package com.roombook.service;

/** Fewer than 60 minutes remain before the start, or the booking already started or ended. */
public class CancellationTooLateException extends RuntimeException {

    public CancellationTooLateException() {
        super("A booking can only be cancelled until one hour before it starts.");
    }
}
