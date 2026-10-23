package com.singledotstudio.estimates;

import java.io.IOException;
import java.io.InputStream;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import tools.jackson.databind.json.JsonMapper;

@Configuration
public class PricingConfig {

    @Bean
    public Pricing pricing() throws IOException {
        try (InputStream in = new ClassPathResource("pricing.json").getInputStream()) {
            Pricing p = JsonMapper.builder().build().readValue(in, Pricing.class);
            if (p.items() == null || p.items().isEmpty() || p.packages() == null) {
                throw new IllegalStateException("pricing.json is missing items or packages");
            }
            return p;
        }
    }
}
