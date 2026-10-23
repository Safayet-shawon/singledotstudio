package com.singledotstudio.consultations;

import com.singledotstudio.common.Text;
import com.singledotstudio.config.AppProperties;
import com.singledotstudio.notifications.LeadCreatedEvent;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConsultationService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final ConsultationRepository repository;
    private final ApplicationEventPublisher events;
    private final AppProperties props;

    public ConsultationService(ConsultationRepository repository, ApplicationEventPublisher events, AppProperties props) {
        this.repository = repository;
        this.events = events;
        this.props = props;
    }

    /** Stores the request and queues the studio notification. An identical request inside the window is not stored twice. */
    @Transactional
    public ConsultationDtos.Response submit(ConsultationDtos.Request r) {
        String name = Text.clean(r.name());
        String email = Text.lower(r.email());
        String phone = Text.clean(r.phone());
        String address = Text.clean(r.address());
        String segment = r.segment() == null || r.segment().isBlank() ? "home" : r.segment();
        String service = Text.clean(r.service());
        String budget = Text.clean(r.budget());
        String message = Text.cleanMultiline(r.message());

        String fingerprint = Text.sha256(String.join("|", "consult", email, Text.digitsOnly(phone), segment, service, Text.lower(message)));
        Instant since = Instant.now().minusSeconds(props.duplicates().windowSeconds());
        List<Consultation> recent = repository.findRecentByFingerprint(fingerprint, since);
        if (!recent.isEmpty()) return new ConsultationDtos.Response(recent.get(0).getReference(), true);

        String reference = "CON-" + LocalDate.now(ZoneOffset.UTC).toString().replace("-", "") + "-" + HexFormat.of().withUpperCase().formatHex(randomBytes(2));
        Consultation c = new Consultation(UUID.randomUUID(), reference, name, email, phone, address, segment, service, budget, message, fingerprint);
        repository.save(c);
        events.publishEvent(LeadCreatedEvent.consultation(c.getId()));
        return new ConsultationDtos.Response(reference, false);
    }

    private static byte[] randomBytes(int n) {
        byte[] b = new byte[n];
        RANDOM.nextBytes(b);
        return b;
    }
}
