package com.singledotstudio.estimates;

import com.singledotstudio.common.Text;
import com.singledotstudio.config.AppProperties;
import com.singledotstudio.notifications.LeadCreatedEvent;
import com.singledotstudio.notifications.NotificationService;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EstimateService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final EstimateCalculator calculator;
    private final EstimateRepository repository;
    private final ApplicationEventPublisher events;
    private final NotificationService notifications;
    private final AppProperties props;

    public EstimateService(EstimateCalculator calculator, EstimateRepository repository, ApplicationEventPublisher events,
                           NotificationService notifications, AppProperties props) {
        this.calculator = calculator;
        this.repository = repository;
        this.events = events;
        this.notifications = notifications;
        this.props = props;
    }

    /**
     * Validates the options, works the price out on the server, stores the result and queues the emails.
     * The same customer sending the same options again within the window gets the original reference back.
     */
    @Transactional
    public EstimateDtos.Response request(EstimateDtos.Request r) {
        EstimateDtos.Input in = r.estimateInput();
        EstimateCalculator.Result result = calculator.compute(new EstimateCalculator.Request(
                in.propertyType(), in.sqft(), in.bhk(), in.items(), in.packageKey(), in.extras(), in.targetBudget(), in.sizeLabel()));
        EstimateCalculator.Validated v = result.input();

        String email = Text.lower(r.email());
        String itemsKey = v.items().entrySet().stream().sorted(java.util.Map.Entry.comparingByKey()).map(e -> e.getKey() + "=" + e.getValue()).collect(Collectors.joining(","));
        String fingerprint = Text.sha256(String.join("|", "estimate", email, Text.digitsOnly(r.phone()), v.propertyType(), v.sqft().toPlainString(),
                String.valueOf(v.bhk()), v.packageKey(), itemsKey, String.join(",", v.extras())));
        Instant since = Instant.now().minusSeconds(props.duplicates().windowSeconds());
        List<Estimate> recent = repository.findRecentByFingerprint(fingerprint, since);
        if (!recent.isEmpty()) return new EstimateDtos.Response(recent.get(0).getReference(), status(), notifications.mailConfigured(), true);

        String reference = "QUO-" + LocalDate.now(ZoneOffset.UTC).toString().replace("-", "") + "-" + HexFormat.of().withUpperCase().formatHex(randomBytes(2));
        Estimate e = new Estimate(UUID.randomUUID(), reference);
        e.setPropertyType(v.propertyType());
        e.setSqft(v.sqft());
        e.setBhk(v.bhk());
        e.setSizeLabel(v.sizeLabel());
        e.setPackageRequested(v.packageKey());
        e.setTier(result.tier());
        e.setSubtotal(result.subtotal());
        e.setTax(result.tax());
        e.setTotal(result.total());
        e.setRangeLow(result.low());
        e.setRangeHigh(result.high());
        e.setCustomerName(Text.clean(r.name()));
        e.setCustomerEmail(email);
        e.setCustomerPhone(Text.clean(r.phone()));
        e.setCustomerAddress(Text.clean(r.address()));
        e.setWhatsapp(Boolean.TRUE.equals(r.whatsapp()));
        e.setFingerprint(fingerprint);
        for (EstimateCalculator.Line l : result.lines()) {
            e.addItem(new EstimateItem("space", l.key(), l.label(), l.qty(), l.area(), l.amount()));
        }
        for (EstimateCalculator.ExtraLine x : result.extras()) {
            e.addItem(new EstimateItem("extra", x.key(), x.label(), 1, null, x.amount()));
        }
        repository.save(e);
        events.publishEvent(LeadCreatedEvent.estimate(e.getId()));
        return new EstimateDtos.Response(reference, status(), notifications.mailConfigured(), false);
    }

    private String status() {
        return notifications.mailConfigured() ? "queued" : "not_configured";
    }

    private static byte[] randomBytes(int n) {
        byte[] b = new byte[n];
        RANDOM.nextBytes(b);
        return b;
    }
}
