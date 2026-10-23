package com.singledotstudio.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Defence in depth on top of CORS and CSRF: a state-changing browser request must come from the configured frontend.
 * Browsers always send Origin on cross-site POSTs, so a request from another site is refused. The public forms also
 * accept requests with no Origin (curl, server-to-server), because they carry no cookies and are rate limited;
 * admin changes always require a trusted Origin.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class OriginCheckFilter extends OncePerRequestFilter {

    private static final Set<String> SAFE = Set.of("GET", "HEAD", "OPTIONS", "TRACE");
    private final Set<String> allowed;

    public OriginCheckFilter(AppProperties props) {
        this.allowed = props.frontendOrigins().stream().map(o -> o.replaceAll("/+$", "")).collect(Collectors.toUnmodifiableSet());
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/") || SAFE.contains(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        String origin = request.getHeader("Origin");
        boolean admin = request.getRequestURI().startsWith("/api/v1/admin/");
        boolean ok = origin == null ? !admin : allowed.contains(origin.replaceAll("/+$", ""));
        if (!ok) {
            response.setStatus(403);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Invalid request.\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
