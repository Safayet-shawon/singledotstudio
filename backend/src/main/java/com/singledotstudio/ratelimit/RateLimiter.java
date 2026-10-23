package com.singledotstudio.ratelimit;

import com.singledotstudio.common.RateLimitExceededException;
import com.singledotstudio.common.Text;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Fixed-window request limiter that keeps its counters in PostgreSQL, so the limit is shared by every backend
 * instance. A client is identified by a hash of its IP address; the address itself is never stored.
 * If the database is unavailable the request is refused (fail closed), because the rest of the API would be down too.
 */
@Component
public class RateLimiter {

    private static final Logger log = LoggerFactory.getLogger(RateLimiter.class);

    private final JdbcTemplate jdbc;

    public RateLimiter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Counts one request and throws {@link RateLimitExceededException} when the client is over the limit. */
    public void check(String bucket, HttpServletRequest request, int max, int windowSeconds) {
        check(bucket, clientKey(request), max, windowSeconds);
    }

    public void check(String bucket, String clientKey, int max, int windowSeconds) {
        long now = Instant.now().getEpochSecond();
        long windowStart = now - (now % windowSeconds);
        String key = bucket + ":" + clientKey;
        Integer hits = jdbc.queryForObject(
                "INSERT INTO rate_limit_counters (bucket_key, window_start, hits) VALUES (?, ?, 1) "
                        + "ON CONFLICT (bucket_key, window_start) DO UPDATE SET hits = rate_limit_counters.hits + 1 RETURNING hits",
                Integer.class, key, windowStart);
        if (hits != null && hits > max) {
            throw new RateLimitExceededException((int) Math.max(1, windowStart + windowSeconds - now));
        }
    }

    /** Hash of the caller's address (as resolved by the servlet container, which only trusts configured proxies). */
    public static String clientKey(HttpServletRequest request) {
        return Text.sha256("ip:" + request.getRemoteAddr()).substring(0, 32);
    }

    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT5M")
    public void purgeOldWindows() {
        try {
            long cutoff = Instant.now().minusSeconds(86_400).getEpochSecond();
            int n = jdbc.update("DELETE FROM rate_limit_counters WHERE window_start < ?", cutoff);
            if (n > 0) log.debug("Purged {} expired rate-limit windows", n);
        } catch (RuntimeException e) {
            log.warn("Rate-limit purge failed: {}", e.getClass().getSimpleName());
        }
    }
}
