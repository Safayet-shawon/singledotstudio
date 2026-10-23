package com.singledotstudio.consultations;

import com.singledotstudio.common.BusinessRuleException;
import com.singledotstudio.config.AppProperties;
import com.singledotstudio.ratelimit.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/consultations")
public class ConsultationController {

    private final ConsultationService service;
    private final RateLimiter rateLimiter;
    private final AppProperties props;

    public ConsultationController(ConsultationService service, RateLimiter rateLimiter, AppProperties props) {
        this.service = service;
        this.rateLimiter = rateLimiter;
        this.props = props;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ConsultationDtos.Response create(@Valid @RequestBody ConsultationDtos.Request request, HttpServletRequest http) {
        rateLimiter.check("consult", http, props.rateLimits().formMax(), props.rateLimits().formWindowSeconds());
        // Honeypot: real visitors never see this field. Bots that fill it get the same generic error as any bad request.
        if (request.website() != null && !request.website().isBlank()) throw new BusinessRuleException("Invalid request.");
        return service.submit(request);
    }
}
