package com.singledotstudio.notifications;

import com.singledotstudio.config.AppProperties;
import com.singledotstudio.consultations.Consultation;
import com.singledotstudio.consultations.ConsultationRepository;
import com.singledotstudio.estimates.Estimate;
import com.singledotstudio.estimates.EstimatePdfService;
import com.singledotstudio.estimates.EstimateRepository;
import jakarta.mail.internet.MimeMessage;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Sends the emails that follow a stored estimate or consultation. It runs on its own thread after the request's
 * transaction has committed, so a slow or failing mail server can never delay or undo a customer's submission.
 * Failed sends are retried on a schedule, a limited number of times.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final NotificationDeliveryRepository deliveries;
    private final EstimateRepository estimates;
    private final ConsultationRepository consultations;
    private final EstimatePdfService pdf;
    private final MailTemplates templates;
    private final AppProperties props;

    public NotificationService(ObjectProvider<JavaMailSender> mailSender, NotificationDeliveryRepository deliveries, EstimateRepository estimates,
                               ConsultationRepository consultations, EstimatePdfService pdf, MailTemplates templates, AppProperties props) {
        this.mailSender = mailSender;
        this.deliveries = deliveries;
        this.estimates = estimates;
        this.consultations = consultations;
        this.pdf = pdf;
        this.templates = templates;
        this.props = props;
    }

    /** True when mail can actually be sent (a host is configured and sending is switched on). */
    public boolean mailConfigured() {
        return props.mail().enabled() && mailSender.getIfAvailable() != null;
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onLeadCreated(LeadCreatedEvent event) {
        try {
            if ("estimate".equals(event.subjectType())) dispatchEstimate(event.subjectId());
            else dispatchConsultation(event.subjectId());
        } catch (RuntimeException e) {
            log.error("Notification dispatch failed for {} {}: {}", event.subjectType(), event.subjectId(), e.getClass().getSimpleName());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void dispatchEstimate(UUID id) {
        Optional<Estimate> found = estimates.findWithItems(id);
        if (found.isEmpty()) return;
        Estimate e = found.get();
        byte[] pdfBytes = pdf.build(e);
        String filename = e.getReference() + ".pdf";
        MailTemplates.Message customer = templates.customerQuotation(e);
        send("estimate-customer", "estimate", id, e.getCustomerEmail(), customer, null, filename, pdfBytes);
        MailTemplates.Message team = templates.teamQuotation(e);
        send("estimate-team", "estimate", id, props.mail().leadInbox(), team, e.getCustomerEmail(), filename, pdfBytes);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void dispatchConsultation(UUID id) {
        Optional<Consultation> found = consultations.findById(id);
        if (found.isEmpty()) return;
        Consultation c = found.get();
        send("consultation-team", "consultation", id, props.mail().leadInbox(), templates.teamConsultation(c), c.getCustomerEmail(), null, null);
    }

    private void send(String kind, String subjectType, UUID subjectId, String to, MailTemplates.Message m, String replyTo, String attachmentName, byte[] attachment) {
        NotificationDelivery d = new NotificationDelivery(kind, subjectType, subjectId, to == null || to.isBlank() ? "(not configured)" : to);
        deliveries.save(d);
        attempt(d, m, replyTo, attachmentName, attachment);
    }

    private void attempt(NotificationDelivery d, MailTemplates.Message m, String replyTo, String attachmentName, byte[] attachment) {
        JavaMailSender sender = mailSender.getIfAvailable();
        String from = props.mail().from();
        if (!props.mail().enabled() || sender == null || from == null || from.isBlank() || d.getRecipient().startsWith("(")) {
            d.record(NotificationDelivery.Status.SKIPPED, "mail not configured");
            deliveries.save(d);
            return;
        }
        try {
            MimeMessage mime = sender.createMimeMessage();
            MimeMessageHelper h = new MimeMessageHelper(mime, attachment != null, "UTF-8");
            h.setFrom(from);
            h.setTo(d.getRecipient());
            if (replyTo != null && !replyTo.isBlank()) h.setReplyTo(replyTo);
            h.setSubject(m.subject());
            if (m.html() != null) h.setText(m.text(), m.html());
            else h.setText(m.text(), false);
            if (attachment != null) h.addAttachment(attachmentName, new org.springframework.core.io.ByteArrayResource(attachment), "application/pdf");
            sender.send(mime);
            d.record(NotificationDelivery.Status.SENT, null);
        } catch (Exception ex) {
            // Never log addresses or message content; the class name is enough to diagnose SMTP trouble.
            log.warn("Mail delivery {} failed: {}", d.getKind(), ex.getClass().getSimpleName());
            d.record(NotificationDelivery.Status.FAILED, ex.getClass().getSimpleName());
        }
        deliveries.save(d);
    }

    /** Retries failed deliveries a limited number of times, waiting between attempts. */
    @Scheduled(fixedDelayString = "PT5M", initialDelayString = "PT2M")
    @Transactional
    public void retryFailed() {
        if (!mailConfigured()) return;
        Instant before = Instant.now().minus(props.mail().retryAfterMinutes(), ChronoUnit.MINUTES);
        List<NotificationDelivery> due = deliveries.findRetryable(props.mail().maxAttempts(), before);
        for (NotificationDelivery d : due) {
            try {
                if ("estimate".equals(d.getSubjectType())) {
                    estimates.findWithItems(d.getSubjectId()).ifPresent(e -> {
                        boolean team = d.getKind().equals("estimate-team");
                        MailTemplates.Message m = team ? templates.teamQuotation(e) : templates.customerQuotation(e);
                        attempt(d, m, team ? e.getCustomerEmail() : null, e.getReference() + ".pdf", pdf.build(e));
                    });
                } else {
                    consultations.findById(d.getSubjectId()).ifPresent(c -> attempt(d, templates.teamConsultation(c), c.getCustomerEmail(), null, null));
                }
            } catch (RuntimeException ex) {
                log.warn("Retry of delivery {} failed: {}", d.getId(), ex.getClass().getSimpleName());
            }
        }
    }
}
