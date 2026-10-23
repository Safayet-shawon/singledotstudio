package com.singledotstudio.notifications;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** One attempt-tracked email. A failed mail never undoes the stored estimate or consultation. */
@Entity
@Table(name = "notification_deliveries")
public class NotificationDelivery {

    public enum Status { QUEUED, SENT, FAILED, SKIPPED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String kind;
    @Column(name = "subject_type", nullable = false)
    private String subjectType;
    @Column(name = "subject_id", nullable = false)
    private UUID subjectId;
    @Column(nullable = false)
    private String recipient;
    @Column(nullable = false)
    private String status;
    @Column(nullable = false)
    private int attempts;
    @Column(name = "last_error")
    private String lastError;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected NotificationDelivery() {
    }

    public NotificationDelivery(String kind, String subjectType, UUID subjectId, String recipient) {
        this.kind = kind;
        this.subjectType = subjectType;
        this.subjectId = subjectId;
        this.recipient = recipient;
        this.status = Status.QUEUED.name();
    }

    public void record(Status newStatus, String error) {
        this.status = newStatus.name();
        this.attempts += newStatus == Status.SKIPPED ? 0 : 1;
        this.lastError = error == null ? null : error.substring(0, Math.min(200, error.length()));
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getKind() { return kind; }
    public String getSubjectType() { return subjectType; }
    public UUID getSubjectId() { return subjectId; }
    public String getRecipient() { return recipient; }
    public Status getStatus() { return Status.valueOf(status); }
    public int getAttempts() { return attempts; }
    public String getLastError() { return lastError; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
