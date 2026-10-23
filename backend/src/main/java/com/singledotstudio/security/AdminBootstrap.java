package com.singledotstudio.security;

import com.singledotstudio.config.AppProperties;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Creates the first administrator, and only when no administrator exists and both APP_ADMIN_BOOTSTRAP_EMAIL and
 * APP_ADMIN_BOOTSTRAP_PASSWORD_HASH are set. It takes a password HASH (see PasswordHashTool), never a plain password,
 * and there is no default account and no public sign-up.
 */
@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final AdminUserRepository users;
    private final AppProperties.Admin settings;

    public AdminBootstrap(AdminUserRepository users, AppProperties props) {
        this.users = users;
        this.settings = props.admin();
    }

    @Override
    public void run(ApplicationArguments args) {
        String email = settings.bootstrapEmail();
        String hash = settings.bootstrapPasswordHash();
        if (users.count() > 0 || email == null || email.isBlank() || hash == null || hash.isBlank()) return;
        if (!hash.startsWith("{bcrypt}$2")) {
            log.error("APP_ADMIN_BOOTSTRAP_PASSWORD_HASH is not a bcrypt hash; no administrator was created");
            return;
        }
        users.save(new AdminUser(UUID.randomUUID(), email.strip().toLowerCase(), hash.strip()));
        log.info("Created the first administrator account");
    }
}
