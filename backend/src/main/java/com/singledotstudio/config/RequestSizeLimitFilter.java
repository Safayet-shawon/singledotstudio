package com.singledotstudio.config;

import com.singledotstudio.common.RequestTooLargeException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Caps request bodies. A declared Content-Length over the limit is refused immediately; a body with no declared
 * length (chunked) is counted as it is read and aborted once it passes the limit.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RequestSizeLimitFilter extends OncePerRequestFilter {

    private final long max;

    public RequestSizeLimitFilter(AppProperties props) {
        this.max = props.maxBodyBytes();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        if (request.getContentLengthLong() > max) {
            reject(response);
            return;
        }
        try {
            chain.doFilter(new Limited(request, max), response);
        } catch (RequestTooLargeException e) {
            if (!response.isCommitted()) reject(response);
        }
    }

    private static void reject(HttpServletResponse response) throws IOException {
        response.setStatus(413);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"The request is too large.\"}");
    }

    private static final class Limited extends HttpServletRequestWrapper {
        private final long max;

        Limited(HttpServletRequest request, long max) {
            super(request);
            this.max = max;
        }

        @Override
        public ServletInputStream getInputStream() throws IOException {
            ServletInputStream in = super.getInputStream();
            return new ServletInputStream() {
                private long read;

                @Override
                public int read() throws IOException {
                    int b = in.read();
                    if (b >= 0 && ++read > max) throw new RequestTooLargeException();
                    return b;
                }

                @Override
                public int read(byte[] buf, int off, int len) throws IOException {
                    int n = in.read(buf, off, len);
                    if (n > 0) {
                        read += n;
                        if (read > max) throw new RequestTooLargeException();
                    }
                    return n;
                }

                @Override
                public boolean isFinished() { return in.isFinished(); }

                @Override
                public boolean isReady() { return in.isReady(); }

                @Override
                public void setReadListener(ReadListener listener) { in.setReadListener(listener); }
            };
        }
    }
}
