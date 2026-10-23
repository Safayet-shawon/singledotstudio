package com.singledotstudio.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Refuses to start in the "prod" profile with unsafe or missing settings, so a mistake in the environment is found at
 * deploy time rather than by a customer. Messages name the variable but never print a value.
 */
@Component
public class StartupValidator {

    private final AppProperties props;
    private final Environment env;

    public StartupValidator(AppProperties props, Environment env) {
        this.props = props;
        this.env = env;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void validate() {
        if (!env.acceptsProfiles(org.springframework.core.env.Profiles.of("prod"))) return;
        List<String> problems = new ArrayList<>();
        if (props.frontendOrigins().isEmpty()) problems.add("APP_FRONTEND_ORIGINS must list the website origin(s)");
        props.frontendOrigins().stream().filter(o -> !o.startsWith("https://")).forEach(o -> problems.add("APP_FRONTEND_ORIGINS must use https"));
        if (props.publicBaseUrl() == null || !props.publicBaseUrl().startsWith("https://")) problems.add("APP_PUBLIC_BASE_URL must be an https URL");
        if (!"true".equalsIgnoreCase(env.getProperty("server.servlet.session.cookie.secure", "true"))) problems.add("session cookies must be Secure (COOKIE_SECURE=true)");
        if (props.mail().enabled()) {
            if (env.getProperty("spring.mail.host", "").isBlank()) problems.add("SPRING_MAIL_HOST is required while APP_MAIL_ENABLED=true");
            if (props.mail().from() == null || props.mail().from().isBlank()) problems.add("APP_MAIL_FROM is required while APP_MAIL_ENABLED=true");
            if (props.mail().leadInbox() == null || props.mail().leadInbox().isBlank()) problems.add("APP_MAIL_LEAD_INBOX is required while APP_MAIL_ENABLED=true");
        }
        if (!problems.isEmpty()) {
            throw new IllegalStateException("Unsafe or incomplete production configuration: " + String.join("; ", problems));
        }
    }
}
