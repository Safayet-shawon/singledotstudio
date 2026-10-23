package com.singledotstudio.api;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.io.IOException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** Starts one real PostgreSQL for the whole test run (no Docker needed) and points the application at it. */
public abstract class PostgresTestSupport {

    static final EmbeddedPostgres POSTGRES;
    static final String ADMIN_EMAIL = "owner@example.test";
    static final String ADMIN_PASSWORD = "Correct-Horse-9";

    static {
        try {
            POSTGRES = EmbeddedPostgres.builder().start();
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                try {
                    POSTGRES.close();
                } catch (IOException ignored) {
                    // best effort on shutdown
                }
            }));
        } catch (IOException e) {
            throw new ExceptionInInitializerError(e);
        }
    }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> POSTGRES.getJdbcUrl("postgres", "postgres"));
        registry.add("spring.datasource.username", () -> "postgres");
        registry.add("spring.datasource.password", () -> "postgres");
        registry.add("app.admin.bootstrap-email", () -> ADMIN_EMAIL);
        registry.add("app.admin.bootstrap-password-hash", () -> "{bcrypt}" + new BCryptPasswordEncoder(4).encode(ADMIN_PASSWORD));
        registry.add("app.frontend-origins", () -> "http://localhost:8000");
        registry.add("server.servlet.session.cookie.secure", () -> "false");
    }
}
