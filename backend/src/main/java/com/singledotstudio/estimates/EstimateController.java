package com.singledotstudio.estimates;

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

/** Public quotation request. The price goes to the customer by email; it is not returned to the browser. */
@RestController
@RequestMapping("/api/v1/estimates")
public class EstimateController {

    private final EstimateService service;
    private final RateLimiter rateLimiter;
    private final AppProperties props;

    public EstimateController(EstimateService service, RateLimiter rateLimiter, AppProperties props) {
        this.service = service;
        this.rateLimiter = rateLimiter;
        this.props = props;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public EstimateDtos.Response create(@Valid @RequestBody EstimateDtos.Request request, HttpServletRequest http) {
        rateLimiter.check("estimate", http, props.rateLimits().formMax(), props.rateLimits().formWindowSeconds());
        if (request.website() != null && !request.website().isBlank()) throw new BusinessRuleException("Invalid request.");
        return service.request(request);
    }
}
