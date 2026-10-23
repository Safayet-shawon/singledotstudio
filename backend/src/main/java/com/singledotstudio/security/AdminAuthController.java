package com.singledotstudio.security;

import com.singledotstudio.common.Text;
import com.singledotstudio.config.AppProperties;
import com.singledotstudio.ratelimit.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Session login for staff. The browser keeps only an opaque, HttpOnly session cookie; the session itself lives in PostgreSQL. */
@RestController
@RequestMapping("/api/v1/admin/auth")
public class AdminAuthController {

    public record LoginRequest(@NotBlank @Size(max = 120) String email, @NotBlank @Size(max = 200) String password) {}

    private final AdminAuthService auth;
    private final RateLimiter rateLimiter;
    private final AppProperties props;
    private final SecurityContextRepository contextRepository;
    private final FindByIndexNameSessionRepository<? extends Session> sessions;
    private final SecurityContextHolderStrategy holder = SecurityContextHolder.getContextHolderStrategy();

    public AdminAuthController(AdminAuthService auth, RateLimiter rateLimiter, AppProperties props, SecurityContextRepository contextRepository,
                               FindByIndexNameSessionRepository<? extends Session> sessions) {
        this.auth = auth;
        this.rateLimiter = rateLimiter;
        this.props = props;
        this.contextRepository = contextRepository;
        this.sessions = sessions;
    }

    /** The single-page admin asks for a CSRF token first and sends it back on every change. */
    @GetMapping(value = "/csrf", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
    }

    @PostMapping(value = "/login", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        AppProperties.RateLimits rl = props.rateLimits();
        rateLimiter.check("login-ip", request, rl.loginMax(), rl.loginWindowSeconds());
        rateLimiter.check("login-acct", Text.sha256("acct:" + Text.lower(body.email())).substring(0, 32), rl.loginMax(), rl.loginWindowSeconds());
        try {
            Authentication authentication = auth.authenticate(body.email(), body.password());
            // A fresh session id on login prevents session fixation.
            if (request.getSession(false) != null) request.changeSessionId();
            SecurityContext context = new SecurityContextImpl(authentication);
            holder.setContext(context);
            contextRepository.saveContext(context, request, response);
            return ResponseEntity.ok(Map.of("email", authentication.getName()));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid email or password."));
        }
    }

    @GetMapping(value = "/me", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, String> me(Authentication authentication) {
        return Map.of("email", authentication.getName());
    }

    @PostMapping(value = "/logout", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Boolean> logout(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        new SecurityContextLogoutHandler().logout(request, response, authentication);
        return Map.of("ok", true);
    }

    /** Ends every session of the signed-in account (for example after a lost laptop). */
    @PostMapping(value = "/sessions/revoke-all", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Integer> revokeAll(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        Map<String, ? extends Session> mine = sessions.findByPrincipalName(authentication.getName());
        mine.keySet().forEach(sessions::deleteById);
        new SecurityContextLogoutHandler().logout(request, response, authentication);
        return Map.of("revoked", mine.size());
    }
}
