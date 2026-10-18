package com.roombook.config;

import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** The single office time zone in which hours, weekdays and days are evaluated. */
@Configuration
public class OfficeZoneConfig {

    @Bean
    public ZoneId officeZone(@Value("${roombook.zone:Europe/Rome}") String zone) {
        return ZoneId.of(zone);
    }
}
