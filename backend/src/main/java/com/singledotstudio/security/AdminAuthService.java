package com.singledotstudio.security;

import com.singledotstudio.config.AppProperties;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Checks staff credentials. Every failure (unknown email, wrong password, disabled or locked account) produces the same
 * error, and a password check always runs, so the response does not reveal which accounts exist. Repeated failures lock
 * the account for a while; the lock lives in the database, so it holds across instances.
 */
@Service
public class AdminAuthService {

    /** A hash of a random value nobody knows, compared against when the account does not exist (keeps timing even). */
    private final String dummyHash;

    private final AdminUserRepository users;
    private final PasswordEncoder encoder;
    private final AppProperties.Admin settings;

    public AdminAuthService(AdminUserRepository users, PasswordEncoder encoder, AppProperties props) {
        this.users = users;
        this.encoder = encoder;
        this.settings = props.admin();
        this.dummyHash = encoder.encode(java.util.UUID.randomUUID().toString());
    }

    @Transactional(noRollbackFor = BadCredentialsException.class)
    public Authentication authenticate(String email, String password) {
        Instant now = Instant.now();
        Optional<AdminUser> found = users.findByEmailIgnoreCase(email == null ? "" : email.strip());
        String hash = found.map(AdminUser::getPasswordHash).orElse(dummyHash);
        boolean matches = encoder.matches(password == null ? "" : password, hash);

        if (found.isEmpty()) throw new BadCredentialsException("Invalid credentials");
        AdminUser user = found.get();
        if (!user.isEnabled() || user.isLocked(now)) throw new BadCredentialsException("Invalid credentials");

        if (!matches) {
            int failures = user.getFailedAttempts() + 1;
            user.setFailedAttempts(failures);
            if (failures >= settings.maxFailedLogins()) {
                user.setLockedUntil(now.plusSeconds(settings.lockSeconds()));
                user.setFailedAttempts(0);
            }
            users.save(user);
            throw new BadCredentialsException("Invalid credentials");
        }
        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(now);
        users.save(user);
        return UsernamePasswordAuthenticationToken.authenticated(user.getEmail(), null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }
}
