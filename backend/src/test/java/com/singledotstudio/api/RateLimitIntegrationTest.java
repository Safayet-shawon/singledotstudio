package com.singledotstudio.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {"app.rate-limits.form-max=3", "app.rate-limits.form-window-seconds=600"})
@AutoConfigureMockMvc
class RateLimitIntegrationTest extends PostgresTestSupport {

    @Autowired MockMvc mvc;

    private String body() {
        return """
                {"name":"Rate Test","phone":"01700000000","email":"rl-%s@example.test","address":"Dhaka","segment":"home","service":"","budget":"","message":"%s","consent":true}
                """.formatted(UUID.randomUUID().toString().substring(0, 8), UUID.randomUUID());
    }

    @Test
    void thePublicFormsAreLimitedPerClientAndSayWhenToRetry() throws Exception {
        for (int i = 0; i < 3; i++) {
            mvc.perform(post("/api/v1/consultations").header("Origin", "http://localhost:8000").contentType(MediaType.APPLICATION_JSON).content(body()).with(r -> {
                r.setRemoteAddr("203.0.113.9");
                return r;
            })).andExpect(status().isOk());
        }
        var blocked = mvc.perform(post("/api/v1/consultations").header("Origin", "http://localhost:8000").contentType(MediaType.APPLICATION_JSON).content(body()).with(r -> {
            r.setRemoteAddr("203.0.113.9");
            return r;
        })).andExpect(status().isTooManyRequests()).andReturn().getResponse();
        assertThat(Integer.parseInt(blocked.getHeader("Retry-After"))).isBetween(1, 600);

        // another client is unaffected: the counters are per client
        mvc.perform(post("/api/v1/consultations").header("Origin", "http://localhost:8000").contentType(MediaType.APPLICATION_JSON).content(body()).with(r -> {
            r.setRemoteAddr("203.0.113.77");
            return r;
        })).andExpect(status().isOk());
    }
}
