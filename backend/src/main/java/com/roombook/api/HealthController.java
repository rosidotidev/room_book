package com.roombook.api;

import com.roombook.service.HealthService;
import com.roombook.service.HealthService.HealthReport;
import com.roombook.service.HealthService.Status;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final HealthService service;

    public HealthController(HealthService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<HealthReport> health() {
        HealthReport report = service.check();
        HttpStatus status = report.status() == Status.UP ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
        return ResponseEntity.status(status).body(report);
    }
}
