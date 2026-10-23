package com.singledotstudio.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * All application settings that are not Spring's own. Values come from application.yml and environment variables
 * (APP_FRONTEND_ORIGINS, APP_MAIL_LEAD_INBOX, ...). Nothing secret has a default here.
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        List<String> frontendOrigins,
        String publicBaseUrl,
        long maxBodyBytes,
        Mail mail,
        Company company,
        RateLimits rateLimits,
        Admin admin,
        Duplicates duplicates) {

    public AppProperties {
        frontendOrigins = frontendOrigins == null ? List.of() : List.copyOf(frontendOrigins);
        if (maxBodyBytes <= 0) maxBodyBytes = 65_536;
        if (mail == null) mail = new Mail(null, null, true, 3, 10);
        if (company == null) company = new Company(null, null, null, null, null, null, 15, null, null);
        if (rateLimits == null) rateLimits = new RateLimits(8, 600, 10, 900, 120, 60);
        if (admin == null) admin = new Admin(null, null, 5, 900);
        if (duplicates == null) duplicates = new Duplicates(900);
    }

    /** Outgoing mail. {@code from} must be an address the SMTP account is allowed to send as. */
    public record Mail(String from, String leadInbox, boolean enabled, int maxAttempts, int retryAfterMinutes) {
        public Mail {
            if (maxAttempts <= 0) maxAttempts = 3;
            if (retryAfterMinutes <= 0) retryAfterMinutes = 10;
        }
    }

    /** Studio details printed on the quotation PDF. Leave blank until the verified details are available. */
    public record Company(String name, String tagline, String address, String phone, String email, String website,
                          int quotationValidDays, String paymentTerms, String footer) {
        public Company {
            if (name == null || name.isBlank()) name = "Single Dot Studio";
            if (tagline == null || tagline.isBlank()) tagline = "Interiors · Design & Build";
            if (quotationValidDays <= 0) quotationValidDays = 15;
            if (paymentTerms == null) paymentTerms = "";
            if (footer == null || footer.isBlank()) footer = "Thank you for your interest.";
            address = address == null ? "" : address;
            phone = phone == null ? "" : phone;
            email = email == null ? "" : email;
            website = website == null ? "" : website;
        }
    }

    /** Requests per window, per client, for each public endpoint. Windows are in seconds. */
    public record RateLimits(int formMax, int formWindowSeconds, int loginMax, int loginWindowSeconds,
                             int adminMax, int adminWindowSeconds) {}

    /** First administrator. Only a password HASH is accepted, never a plain password. */
    public record Admin(String bootstrapEmail, String bootstrapPasswordHash, int maxFailedLogins, int lockSeconds) {
        public Admin {
            if (maxFailedLogins <= 0) maxFailedLogins = 5;
            if (lockSeconds <= 0) lockSeconds = 900;
        }
    }

    /** Identical submissions inside this window are treated as one. */
    public record Duplicates(int windowSeconds) {
        public Duplicates {
            if (windowSeconds <= 0) windowSeconds = 900;
        }
    }
}
