package com.roombook.config;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;

/** Creates the folder of the SQLite file before the datasource opens it (SQLite does not create folders). */
public class DataDirectoryInitializer implements EnvironmentPostProcessor {

    private static final String PREFIX = "jdbc:sqlite:";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String url = environment.getProperty("spring.datasource.url");
        if (url == null || !url.startsWith(PREFIX)) {
            return;
        }
        Path parent = Path.of(url.substring(PREFIX.length())).toAbsolutePath().getParent();
        try {
            if (parent != null) {
                Files.createDirectories(parent);
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot create database folder " + parent, e);
        }
    }
}
