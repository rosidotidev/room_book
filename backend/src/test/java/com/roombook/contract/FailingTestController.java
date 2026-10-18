package com.roombook.contract;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Test-only endpoint that raises an unexpected failure. */
@RestController
public class FailingTestController {

    @GetMapping("/test/fail")
    public String fail() {
        throw new IllegalStateException("secret internal detail jdbc:sqlite:/private/path");
    }
}
