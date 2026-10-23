package com.singledotstudio.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.singledotstudio.consultations.ConsultationRepository;
import com.singledotstudio.estimates.EstimateRepository;
import com.singledotstudio.notifications.NotificationDelivery;
import com.singledotstudio.notifications.NotificationDeliveryRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest(properties = {"app.rate-limits.form-max=1000", "app.duplicates.window-seconds=900"})
@AutoConfigureMockMvc
class PublicApiIntegrationTest extends PostgresTestSupport {

    static final String ORIGIN = "http://localhost:8000";

    @Autowired MockMvc mvc;
    @Autowired EstimateRepository estimates;
    @Autowired ConsultationRepository consultations;
    @Autowired NotificationDeliveryRepository deliveries;

    private static String unique() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private static String estimateBody(String email, String extraJson) {
        return """
                {"estimateInput":{"propertyType":"apartment","sqft":1450,"bhk":3,"items":{"master":1,"child":2,"family":1,"kitchen":1},
                 "package":"premium","extras":["smart"],"sizeLabel":"1350-1499"%s},
                 "name":"Asha Rahman","phone":"+8801700000000","email":"%s","address":"Dhaka","whatsapp":true,"consent":true,"website":""}
                """.formatted(extraJson, email);
    }

    private MockHttpServletRequestBuilder json(String path, String body) {
        return post(path).contentType(MediaType.APPLICATION_JSON).header("Origin", ORIGIN).content(body);
    }

    @Test
    void estimateIsStoredPricedOnTheServerAndNeverReturnsThePrice() throws Exception {
        String email = "asha-" + unique() + "@example.test";
        MvcResult result = mvc.perform(json("/api/v1/estimates", estimateBody(email, "")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reference").value(org.hamcrest.Matchers.startsWith("QUO-")))
                .andExpect(jsonPath("$.duplicate").value(false))
                .andReturn();
        String body = result.getResponse().getContentAsString();
        assertThat(body).doesNotContain("total").doesNotContain("low").doesNotContain("high").doesNotContain("price");

        var saved = estimates.findAll().stream().filter(e -> e.getCustomerEmail().equals(email)).findFirst().orElseThrow();
        assertThat(saved.getTier()).isEqualTo("premium");
        assertThat(saved.getTotal().signum()).isPositive();
        var withItems = estimates.findWithItems(saved.getId()).orElseThrow();
        assertThat(withItems.getItems()).extracting("itemKey").contains("master", "child", "family", "kitchen", "smart");
        assertThat(saved.isWhatsapp()).isTrue();
    }

    @Test
    void aClientSuppliedTotalIsIgnored() throws Exception {
        String email = "forge-" + unique() + "@example.test";
        mvc.perform(json("/api/v1/estimates", estimateBody(email, ",\"total\":1,\"low\":1,\"price\":1"))).andExpect(status().isOk());
        var saved = estimates.findAll().stream().filter(e -> e.getCustomerEmail().equals(email)).findFirst().orElseThrow();
        assertThat(saved.getTotal().intValue()).isGreaterThan(100_000);
    }

    @Test
    void mailIsRecordedAsSkippedWhenNoMailServerIsConfigured() throws Exception {
        String email = "mail-" + unique() + "@example.test";
        mvc.perform(json("/api/v1/estimates", estimateBody(email, ""))).andExpect(status().isOk()).andExpect(jsonPath("$.customerEmail").value("not_configured"));
        var id = estimates.findAll().stream().filter(e -> e.getCustomerEmail().equals(email)).findFirst().orElseThrow().getId();
        long deadline = System.currentTimeMillis() + 5000;
        while (deliveries.findBySubjectTypeAndSubjectId("estimate", id).size() < 2 && System.currentTimeMillis() < deadline) Thread.sleep(100);
        var rows = deliveries.findBySubjectTypeAndSubjectId("estimate", id);
        assertThat(rows).hasSize(2).allMatch(d -> d.getStatus() == NotificationDelivery.Status.SKIPPED);
        // The estimate itself is safely stored even though no mail could be sent.
        assertThat(estimates.findById(id)).isPresent();
    }

    @Test
    void validationErrorsAreStructuredAndNeverLeakInternals() throws Exception {
        String bad = estimateBody("not-an-email", "").replace("\"phone\":\"+8801700000000\"", "\"phone\":\"abc\"").replace("\"consent\":true", "\"consent\":false");
        MvcResult r = mvc.perform(json("/api/v1/estimates", bad)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists()).andExpect(jsonPath("$.fields").isArray()).andReturn();
        String body = r.getResponse().getContentAsString();
        assertThat(body).doesNotContain("Exception").doesNotContain("at com.").doesNotContain("org.springframework");
        assertThat(body).contains("email").contains("phone").contains("consent");
    }

    @Test
    void unsupportedOptionsAreRejectedByBusinessRules() throws Exception {
        mvc.perform(json("/api/v1/estimates", estimateBody("rule-" + unique() + "@example.test", "").replace("\"master\":1", "\"hovercraft\":1")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("not available")));
        mvc.perform(json("/api/v1/estimates", estimateBody("rule-" + unique() + "@example.test", "").replace("\"sqft\":1450", "\"sqft\":-5")))
                .andExpect(status().isBadRequest());
        mvc.perform(json("/api/v1/estimates", estimateBody("rule-" + unique() + "@example.test", "").replace("\"sqft\":1450", "\"sqft\":99999")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("Size must be between")));
    }

    @Test
    void honeypotAndMalformedBodiesAreRefused() throws Exception {
        mvc.perform(json("/api/v1/estimates", estimateBody("bot-" + unique() + "@example.test", "").replace("\"website\":\"\"", "\"website\":\"http://spam\"")))
                .andExpect(status().isBadRequest());
        mvc.perform(json("/api/v1/estimates", "{not json")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").exists());
        mvc.perform(post("/api/v1/estimates").contentType(MediaType.TEXT_PLAIN).header("Origin", ORIGIN).content("hello")).andExpect(status().isUnsupportedMediaType());
    }

    @Test
    void identicalSubmissionsAreNotStoredTwice() throws Exception {
        String email = "dup-" + unique() + "@example.test";
        String first = mvc.perform(json("/api/v1/estimates", estimateBody(email, ""))).andExpect(status().isOk()).andExpect(jsonPath("$.duplicate").value(false)).andReturn().getResponse().getContentAsString();
        String second = mvc.perform(json("/api/v1/estimates", estimateBody(email, ""))).andExpect(status().isOk()).andExpect(jsonPath("$.duplicate").value(true)).andReturn().getResponse().getContentAsString();
        assertThat(estimates.findAll().stream().filter(e -> e.getCustomerEmail().equals(email))).hasSize(1);
        assertThat(second).contains(first.replaceAll(".*\"reference\":\"([^\"]+)\".*", "$1"));
    }

    @Test
    void requestsFromAnotherSiteAreRefused() throws Exception {
        mvc.perform(post("/api/v1/estimates").contentType(MediaType.APPLICATION_JSON).header("Origin", "https://evil.example").content(estimateBody("x@example.test", "")))
                .andExpect(status().isForbidden());
    }

    @Test
    void oversizedBodiesAreRefused() throws Exception {
        String huge = "{\"name\":\"" + "a".repeat(70_000) + "\"}";
        mvc.perform(json("/api/v1/estimates", huge)).andExpect(status().isContentTooLarge());
    }

    @Test
    void consultationIsValidatedStoredAndDeduplicated() throws Exception {
        String email = "con-" + unique() + "@example.test";
        String body = """
                {"name":"Rafi Ahmed","phone":"01711000000","email":"%s","address":"Gulshan, Dhaka","segment":"showroom","service":"showroom","budget":"10-20 lakh","message":"Hello\\nWe need a showroom.","consent":true,"website":""}
                """.formatted(email);
        mvc.perform(json("/api/v1/consultations", body)).andExpect(status().isOk()).andExpect(jsonPath("$.reference").value(org.hamcrest.Matchers.startsWith("CON-"))).andExpect(jsonPath("$.duplicate").value(false));
        mvc.perform(json("/api/v1/consultations", body)).andExpect(status().isOk()).andExpect(jsonPath("$.duplicate").value(true));
        assertThat(consultations.findAll().stream().filter(c -> c.getCustomerEmail().equals(email))).hasSize(1);
        assertThat(consultations.findAll().stream().filter(c -> c.getCustomerEmail().equals(email)).findFirst().orElseThrow().getSegment()).isEqualTo("showroom");

        mvc.perform(json("/api/v1/consultations", body.replace("showroom\",\"service", "castle\",\"service"))).andExpect(status().isBadRequest());
        mvc.perform(json("/api/v1/consultations", body.replace("\"consent\":true", "\"consent\":false"))).andExpect(status().isBadRequest());
        mvc.perform(json("/api/v1/consultations", body.replace("Gulshan, Dhaka", "x"))).andExpect(status().isBadRequest());
    }

    @Test
    void headersAndErrorShapesAreSafe() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
        var r = mvc.perform(get("/api/v1/estimates")).andReturn().getResponse();
        assertThat(r.getStatus()).isIn(401, 403, 405);
        assertThat(r.getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(r.getHeader("Content-Security-Policy")).contains("default-src 'none'");
        assertThat(r.getHeader("Cache-Control")).contains("no-store");
        assertThat(r.getContentAsString()).doesNotContain("Exception");
        mvc.perform(get("/api/v1/nothing-here")).andExpect(status().is4xxClientError());
        mvc.perform(get("/actuator/env")).andExpect(status().is4xxClientError());
    }
}
