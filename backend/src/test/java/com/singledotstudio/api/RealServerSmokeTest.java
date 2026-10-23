package com.singledotstudio.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

/** Starts the real embedded Tomcat on a random port and talks to it over HTTP, as a browser or load balancer would. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "app.rate-limits.form-max=1000")
class RealServerSmokeTest extends PostgresTestSupport {

    @LocalServerPort int port;

    private HttpResponse<String> send(HttpRequest request) throws Exception {
        return HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void healthEndpointIsUpAndRevealsNothing() throws Exception {
        HttpResponse<String> r = send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/actuator/health")).build());
        assertThat(r.statusCode()).isEqualTo(200);
        assertThat(r.body()).contains("\"status\":\"UP\"").doesNotContain("components").doesNotContain("details").doesNotContain("jdbc");
        assertThat(r.headers().firstValue("X-Content-Type-Options")).contains("nosniff");
    }

    @Test
    void otherActuatorEndpointsAreNotExposed() throws Exception {
        for (String path : new String[] {"/actuator/env", "/actuator/beans", "/actuator/heapdump", "/actuator/mappings"}) {
            HttpResponse<String> r = send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).build());
            assertThat(r.statusCode()).as(path).isBetween(400, 404);
            assertThat(r.body()).doesNotContain("password").doesNotContain("jdbc:");
        }
    }

    @Test
    void errorsAreJsonWithoutStackTraces() throws Exception {
        HttpResponse<String> r = send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/estimates"))
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString("{broken")).build());
        assertThat(r.statusCode()).isEqualTo(400);
        assertThat(r.headers().firstValue("Content-Type").orElse("")).contains("application/json");
        assertThat(r.body()).doesNotContain("Exception").doesNotContain("\tat ").doesNotContain("Whitelabel");
    }

    @Test
    void aChunkedBodyOverTheLimitIsCutOff() throws Exception {
        HttpResponse<String> r = send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/consultations"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofInputStream(() -> new java.io.ByteArrayInputStream(("{\"name\":\"" + "a".repeat(200_000) + "\"}").getBytes()))).build());
        assertThat(r.statusCode()).isEqualTo(413);
    }
}
