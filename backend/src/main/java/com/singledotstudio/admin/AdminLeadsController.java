package com.singledotstudio.admin;

import com.singledotstudio.common.NotFoundException;
import com.singledotstudio.config.AppProperties;
import com.singledotstudio.consultations.Consultation;
import com.singledotstudio.consultations.ConsultationRepository;
import com.singledotstudio.estimates.Estimate;
import com.singledotstudio.estimates.EstimatePdfService;
import com.singledotstudio.estimates.EstimateRepository;
import com.singledotstudio.notifications.NotificationDelivery;
import com.singledotstudio.notifications.NotificationDeliveryRepository;
import com.singledotstudio.ratelimit.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Read-only lead views for signed-in staff. The price of an estimate is visible here and in the emailed PDF only. */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminLeadsController {

    public record EstimateRow(UUID id, String reference, Instant createdAt, String name, String email, String phone, String address, boolean whatsapp,
                              String property, String tier, BigDecimal total, BigDecimal low, BigDecimal high, String mail) {}

    public record ConsultationRow(UUID id, String reference, Instant createdAt, String name, String email, String phone, String address,
                                  String segment, String service, String budget, String message, String mail) {}

    public record PageOf<T>(List<T> items, int page, int size, long total) {}

    private final EstimateRepository estimates;
    private final ConsultationRepository consultations;
    private final NotificationDeliveryRepository deliveries;
    private final EstimatePdfService pdf;
    private final RateLimiter rateLimiter;
    private final AppProperties props;

    public AdminLeadsController(EstimateRepository estimates, ConsultationRepository consultations, NotificationDeliveryRepository deliveries,
                                EstimatePdfService pdf, RateLimiter rateLimiter, AppProperties props) {
        this.estimates = estimates;
        this.consultations = consultations;
        this.deliveries = deliveries;
        this.pdf = pdf;
        this.rateLimiter = rateLimiter;
        this.props = props;
    }

    @GetMapping(value = "/estimates", produces = MediaType.APPLICATION_JSON_VALUE)
    public PageOf<EstimateRow> estimates(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size, HttpServletRequest http) {
        limit(http);
        Page<Estimate> p = estimates.findAllByOrderByCreatedAtDesc(PageRequest.of(Math.max(0, page), clamp(size)));
        Map<UUID, String> mail = mailStatus("estimate", p.getContent().stream().map(Estimate::getId).toList());
        List<EstimateRow> rows = p.getContent().stream().map(e -> new EstimateRow(e.getId(), e.getReference(), e.getCreatedAt(), e.getCustomerName(),
                e.getCustomerEmail(), e.getCustomerPhone(), e.getCustomerAddress(), e.isWhatsapp(), EstimatePdfService.propertyLine(e), e.getTier(),
                e.getTotal(), e.getRangeLow(), e.getRangeHigh(), mail.getOrDefault(e.getId(), "none"))).toList();
        return new PageOf<>(rows, p.getNumber(), p.getSize(), p.getTotalElements());
    }

    @GetMapping(value = "/consultations", produces = MediaType.APPLICATION_JSON_VALUE)
    public PageOf<ConsultationRow> consultations(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size, HttpServletRequest http) {
        limit(http);
        Page<Consultation> p = consultations.findAllByOrderByCreatedAtDesc(PageRequest.of(Math.max(0, page), clamp(size)));
        Map<UUID, String> mail = mailStatus("consultation", p.getContent().stream().map(Consultation::getId).toList());
        List<ConsultationRow> rows = p.getContent().stream().map(c -> new ConsultationRow(c.getId(), c.getReference(), c.getCreatedAt(), c.getCustomerName(),
                c.getCustomerEmail(), c.getCustomerPhone(), c.getCustomerAddress(), c.getSegment(), c.getService(), c.getBudget(), c.getMessage(),
                mail.getOrDefault(c.getId(), "none"))).toList();
        return new PageOf<>(rows, p.getNumber(), p.getSize(), p.getTotalElements());
    }

    /** The quotation exactly as it was emailed, rebuilt from the stored estimate. Sent as a download, never cached. */
    @GetMapping("/estimates/{id}/pdf")
    public ResponseEntity<byte[]> pdf(@PathVariable UUID id, HttpServletRequest http) {
        limit(http);
        Estimate e = estimates.findWithItems(id).orElseThrow(() -> new NotFoundException("estimate"));
        byte[] bytes = pdf.build(e);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(e.getReference() + ".pdf").build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.noStore())
                .body(bytes);
    }

    private void limit(HttpServletRequest http) {
        rateLimiter.check("admin", http, props.rateLimits().adminMax(), props.rateLimits().adminWindowSeconds());
    }

    private static int clamp(int size) {
        return Math.min(100, Math.max(1, size));
    }

    /** Collapses a lead's emails into one word: sent, failed, skipped or none. */
    private Map<UUID, String> mailStatus(String type, List<UUID> ids) {
        if (ids.isEmpty()) return Map.of();
        Map<UUID, List<NotificationDelivery>> by = deliveries.findBySubjectTypeAndSubjectIdIn(type, ids).stream()
                .collect(Collectors.groupingBy(NotificationDelivery::getSubjectId));
        return by.entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey, en -> {
            List<NotificationDelivery> l = en.getValue();
            if (l.stream().anyMatch(d -> d.getStatus() == NotificationDelivery.Status.FAILED)) return "failed";
            if (l.stream().allMatch(d -> d.getStatus() == NotificationDelivery.Status.SKIPPED)) return "skipped";
            if (l.stream().anyMatch(d -> d.getStatus() == NotificationDelivery.Status.QUEUED)) return "queued";
            return l.stream().max(Comparator.comparing(NotificationDelivery::getUpdatedAt)).map(d -> "sent").orElse("none");
        }));
    }
}
