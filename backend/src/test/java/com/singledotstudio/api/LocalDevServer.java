package com.singledotstudio.api;

import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Not a test: a development helper that starts the API on http://localhost:8080 against a throw-away PostgreSQL, so the
 * static front end can be tried end to end without installing a database. Run it with
 * {@code ./mvnw test -Dtest=LocalDevServer -DdevServer=true} (it runs for an hour, or until you stop it).
 * Staff login for this throw-away setup: owner@example.test / Correct-Horse-9. Mail is not configured, so it is skipped.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT, properties = {"server.port=8080", "app.rate-limits.form-max=200"})
@EnabledIfSystemProperty(named = "devServer", matches = "true")
class LocalDevServer extends PostgresTestSupport {

    @Test
    void serve() throws InterruptedException {
        TimeUnit.HOURS.sleep(1);
    }
}
