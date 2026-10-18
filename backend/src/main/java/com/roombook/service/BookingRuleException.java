package com.roombook.service;

/** A booking rule or required field is violated; the message names the rule in plain language. */
public class BookingRuleException extends RuntimeException {

    public BookingRuleException(String message) {
        super(message);
    }
}
