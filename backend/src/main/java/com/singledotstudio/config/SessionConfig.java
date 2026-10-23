package com.singledotstudio.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

/**
 * The staff session cookie. It is set explicitly here (rather than inherited from server defaults) so that it is always
 * opaque, HttpOnly, Secure outside local development and SameSite-restricted, in every environment.
 */
@Configuration
public class SessionConfig {

    @Bean
    CookieSerializer cookieSerializer(@Value("${server.servlet.session.cookie.secure:true}") boolean secure,
                                      @Value("${server.servlet.session.cookie.same-site:lax}") String sameSite) {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        serializer.setCookieName("SDS_SESSION");
        serializer.setCookiePath("/");
        serializer.setUseHttpOnlyCookie(true);
        serializer.setUseSecureCookie(secure);
        serializer.setSameSite(sameSite.isBlank() ? "Lax" : sameSite.substring(0, 1).toUpperCase() + sameSite.substring(1).toLowerCase());
        return serializer;
    }
}
