package com.singledotstudio.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.singledotstudio.estimates.EstimateRepository;
import com.singledotstudio.notifications.NotificationDelivery;
import com.singledotstudio.notifications.NotificationDeliveryRepository;
import com.singledotstudio.notifications.NotificationService;
import jakarta.mail.internet.MimeMessage;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.test.web.servlet.MockMvc;

/** A mail server that is down must never lose a customer's estimate, and failed mail must be retried. */
@SpringBootTest(properties = {"app.rate-limits.form-max=1000", "app.mail.enabled=true", "app.mail.from=studio@example.test",
        "app.mail.lead-inbox=inbox@example.test", "app.mail.max-attempts=3"})
@AutoConfigureMockMvc
@Import(MailFailureIntegrationTest.FlakyMail.class)
class MailFailureIntegrationTest extends PostgresTestSupport {

    static final AtomicBoolean DOWN = new AtomicBoolean(true);
    static final AtomicInteger SENT = new AtomicInteger();

    @TestConfiguration
    static class FlakyMail {
        @Bean
        JavaMailSender javaMailSender() {
            return new JavaMailSenderImpl() {
                @Override
                public void send(MimeMessage message) {
                    if (DOWN.get()) throw new MailSendException("smtp down: secret-host.example password=hunter2");
                    SENT.incrementAndGet();
                }
            };
        }
    }

    @Autowired MockMvc mvc;
    @Autowired EstimateRepository estimates;
    @Autowired NotificationDeliveryRepository deliveries;
    @Autowired NotificationService notifications;
    @Autowired JdbcTemplate jdbc;

    @Test
    void aMailOutageKeepsTheEstimateAndTheFailedMailIsRetriedWithoutLeakingDetails() throws Exception {
        DOWN.set(true);
        SENT.set(0);
        String email = "flaky-" + UUID.randomUUID().toString().substring(0, 8) + "@example.test";
        String body = mvc.perform(post("/api/v1/estimates").header("Origin", "http://localhost:8000").contentType(MediaType.APPLICATION_JSON).content("""
                {"estimateInput":{"propertyType":"showroom","sqft":1200,"items":{"showfloor":1,"showcounter":1},"package":"essential","extras":[]},
                 "name":"Mail Test","phone":"01700000000","email":"%s","address":"Dhaka","consent":true}""".formatted(email)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(body).contains("\"customerEmail\":\"queued\"");

        UUID id = estimates.findAll().stream().filter(e -> e.getCustomerEmail().equals(email)).findFirst().orElseThrow().getId();
        List<NotificationDelivery> rows = await(id, d -> d.getStatus() == NotificationDelivery.Status.FAILED, 2);
        assertThat(rows).hasSize(2).allMatch(d -> d.getAttempts() == 1);
        // the stored error is only the exception type: no host name, password or address
        assertThat(rows).allMatch(d -> d.getLastError().equals("MailSendException"));
        assertThat(estimates.findById(id)).isPresent();

        // mail comes back; once the retry delay has passed the scheduler delivers it
        DOWN.set(false);
        jdbc.update("UPDATE notification_deliveries SET updated_at = now() - interval '1 hour' WHERE subject_id = ?", id);
        notifications.retryFailed();
        List<NotificationDelivery> after = deliveries.findBySubjectTypeAndSubjectId("estimate", id);
        assertThat(after).allMatch(d -> d.getStatus() == NotificationDelivery.Status.SENT && d.getAttempts() == 2);
        assertThat(SENT.get()).isGreaterThanOrEqualTo(2);
    }

    private List<NotificationDelivery> await(UUID id, java.util.function.Predicate<NotificationDelivery> done, int expected) throws InterruptedException {
        long deadline = System.currentTimeMillis() + 8000;
        List<NotificationDelivery> rows = List.of();
        while (System.currentTimeMillis() < deadline) {
            rows = deliveries.findBySubjectTypeAndSubjectId("estimate", id);
            if (rows.size() >= expected && rows.stream().allMatch(done)) return rows;
            Thread.sleep(100);
        }
        return rows;
    }
}
