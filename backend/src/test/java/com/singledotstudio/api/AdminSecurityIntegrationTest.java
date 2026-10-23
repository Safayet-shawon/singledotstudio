package com.singledotstudio.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.singledotstudio.security.AdminUser;
import com.singledotstudio.security.AdminUserRepository;
import jakarta.servlet.http.Cookie;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(properties = {"app.rate-limits.form-max=1000", "app.rate-limits.login-max=1000", "app.admin.max-failed-logins=5"})
@AutoConfigureMockMvc
class AdminSecurityIntegrationTest extends PostgresTestSupport {

    static final String ORIGIN = "http://localhost:8000";
    static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired MockMvc mvc;
    @Autowired AdminUserRepository users;
    @Autowired PasswordEncoder encoder;

    /** A tiny browser: keeps the opaque session cookie the server sets, exactly as a real browser would. */
    final class Browser {
        Cookie session;

        ResultActions send(MockHttpServletRequestBuilder request) throws Exception {
            if (session != null) request.cookie(session);
            ResultActions result = mvc.perform(request);
            Cookie fresh = result.andReturn().getResponse().getCookie("SDS_SESSION");
            if (fresh != null) session = fresh.getMaxAge() == 0 ? null : fresh;
            return result;
        }

        String csrf() throws Exception {
            MvcResult r = send(get("/api/v1/admin/auth/csrf")).andExpect(status().isOk()).andReturn();
            return JSON.readTree(r.getResponse().getContentAsString()).get("token").asString();
        }

        ResultActions login(String email, String password) throws Exception {
            String token = csrf();
            return send(post("/api/v1/admin/auth/login").header("Origin", ORIGIN).header("X-CSRF-TOKEN", token)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"));
        }
    }

    private static String uniq() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    @Test
    void theSessionCookieIsHttpOnlySameSiteAndOpaque() throws Exception {
        String header = mvc.perform(get("/api/v1/admin/auth/csrf")).andReturn().getResponse().getHeader("Set-Cookie");
        assertThat(header).startsWith("SDS_SESSION=").contains("HttpOnly").contains("SameSite=Lax").contains("Path=/");
        assertThat(header).doesNotContain(PostgresTestSupport.ADMIN_EMAIL);
    }

    @Test
    void adminRoutesRequireSignIn() throws Exception {
        mvc.perform(get("/api/v1/admin/estimates")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.error").exists());
        mvc.perform(get("/api/v1/admin/consultations")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/estimates/" + UUID.randomUUID() + "/pdf")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void wrongPasswordAndUnknownAccountLookIdentical() throws Exception {
        String wrong = new Browser().login(ADMIN_EMAIL, "nope-nope-nope-1").andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        String unknown = new Browser().login("nobody@example.test", "nope-nope-nope-1").andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        assertThat(wrong).isEqualTo(unknown).contains("Invalid email or password");
    }

    @Test
    void loginRequiresACsrfTokenAndATrustedOrigin() throws Exception {
        Browser b = new Browser();
        String body = "{\"email\":\"" + ADMIN_EMAIL + "\",\"password\":\"" + ADMIN_PASSWORD + "\"}";
        String token = b.csrf();
        // no CSRF token
        b.send(post("/api/v1/admin/auth/login").header("Origin", ORIGIN).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        // wrong CSRF token
        b.send(post("/api/v1/admin/auth/login").header("Origin", ORIGIN).header("X-CSRF-TOKEN", "forged").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        // another site's origin
        b.send(post("/api/v1/admin/auth/login").header("Origin", "https://evil.example").header("X-CSRF-TOKEN", token).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        // no origin at all
        b.send(post("/api/v1/admin/auth/login").header("X-CSRF-TOKEN", token).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
    }

    @Test
    void signedInStaffCanReadLeadsDownloadAPdfAndSignOut() throws Exception {
        String email = "lead-" + uniq() + "@example.test";
        mvc.perform(post("/api/v1/estimates").header("Origin", ORIGIN).contentType(MediaType.APPLICATION_JSON).content("""
                {"estimateInput":{"propertyType":"office","sqft":1800,"bhk":1,"items":{"reception":1,"workstation":12},"package":"premium","extras":[]},
                 "name":"Office Lead","phone":"+8801800000000","email":"%s","address":"Banani","consent":true}""".formatted(email))).andExpect(status().isOk());

        Browser b = new Browser();
        b.login(ADMIN_EMAIL, ADMIN_PASSWORD).andExpect(status().isOk()).andExpect(jsonPath("$.email").value(ADMIN_EMAIL));
        b.send(get("/api/v1/admin/auth/me")).andExpect(status().isOk());

        MvcResult list = b.send(get("/api/v1/admin/estimates?size=100")).andExpect(status().isOk()).andExpect(jsonPath("$.items").isArray()).andReturn();
        String id = null;
        for (var row : JSON.readTree(list.getResponse().getContentAsString()).get("items")) if (email.equals(row.get("email").asString())) id = row.get("id").asString();
        assertThat(id).isNotNull();
        b.send(get("/api/v1/admin/consultations")).andExpect(status().isOk());

        MvcResult pdf = b.send(get("/api/v1/admin/estimates/" + id + "/pdf")).andExpect(status().isOk()).andReturn();
        assertThat(pdf.getResponse().getContentType()).isEqualTo("application/pdf");
        assertThat(pdf.getResponse().getHeader("Content-Disposition")).contains("attachment").contains(".pdf");
        assertThat(pdf.getResponse().getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(pdf.getResponse().getHeader("Cache-Control")).contains("no-store");
        assertThat(new String(pdf.getResponse().getContentAsByteArray(), 0, 5)).isEqualTo("%PDF-");
        b.send(get("/api/v1/admin/estimates/" + UUID.randomUUID() + "/pdf")).andExpect(status().isNotFound());

        // a state change without the CSRF token is refused; with it, the session ends
        b.send(post("/api/v1/admin/auth/logout").header("Origin", ORIGIN)).andExpect(status().isForbidden());
        b.send(post("/api/v1/admin/auth/logout").header("Origin", ORIGIN).header("X-CSRF-TOKEN", b.csrf())).andExpect(status().isOk());
        b.send(get("/api/v1/admin/estimates")).andExpect(status().isUnauthorized());
    }

    @Test
    void aSessionCanBeRevokedFromTheServer() throws Exception {
        Browser laptop = new Browser();
        Browser phone = new Browser();
        laptop.login(ADMIN_EMAIL, ADMIN_PASSWORD).andExpect(status().isOk());
        phone.login(ADMIN_EMAIL, ADMIN_PASSWORD).andExpect(status().isOk());
        laptop.send(post("/api/v1/admin/auth/sessions/revoke-all").header("Origin", ORIGIN).header("X-CSRF-TOKEN", laptop.csrf())).andExpect(status().isOk());
        // the other device's session no longer works either
        phone.send(get("/api/v1/admin/estimates")).andExpect(status().isUnauthorized());
    }

    @Test
    void repeatedWrongPasswordsLockTheAccountEvenForTheRightPassword() throws Exception {
        String email = "lock-" + uniq() + "@example.test";
        users.save(new AdminUser(UUID.randomUUID(), email, encoder.encode("Right-Password-1")));
        for (int i = 0; i < 5; i++) new Browser().login(email, "wrong-wrong-1").andExpect(status().isUnauthorized());
        new Browser().login(email, "Right-Password-1").andExpect(status().isUnauthorized());
        assertThat(users.findByEmailIgnoreCase(email).orElseThrow().getLockedUntil()).isNotNull();
    }

    @Test
    void disabledAccountsCannotSignIn() throws Exception {
        String email = "off-" + uniq() + "@example.test";
        AdminUser u = new AdminUser(UUID.randomUUID(), email, encoder.encode("Right-Password-1"));
        u.setEnabled(false);
        users.save(u);
        new Browser().login(email, "Right-Password-1").andExpect(status().isUnauthorized());
    }
}
