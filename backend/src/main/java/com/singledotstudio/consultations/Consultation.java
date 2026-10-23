package com.singledotstudio.consultations;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "consultations")
public class Consultation {

    @Id
    private UUID id;
    @Column(nullable = false, updatable = false)
    private String reference;
    @Column(name = "customer_name", nullable = false)
    private String customerName;
    @Column(name = "customer_email", nullable = false)
    private String customerEmail;
    @Column(name = "customer_phone", nullable = false)
    private String customerPhone;
    @Column(name = "customer_address", nullable = false)
    private String customerAddress;
    @Column(nullable = false)
    private String segment;
    @Column(nullable = false)
    private String service = "";
    @Column(nullable = false)
    private String budget = "";
    @Column(nullable = false)
    private String message = "";
    @Column(nullable = false, length = 64)
    private String fingerprint;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Consultation() {
    }

    public Consultation(UUID id, String reference, String name, String email, String phone, String address, String segment,
                        String service, String budget, String message, String fingerprint) {
        this.id = id;
        this.reference = reference;
        this.customerName = name;
        this.customerEmail = email;
        this.customerPhone = phone;
        this.customerAddress = address;
        this.segment = segment;
        this.service = service;
        this.budget = budget;
        this.message = message;
        this.fingerprint = fingerprint;
    }

    public UUID getId() { return id; }
    public String getReference() { return reference; }
    public String getCustomerName() { return customerName; }
    public String getCustomerEmail() { return customerEmail; }
    public String getCustomerPhone() { return customerPhone; }
    public String getCustomerAddress() { return customerAddress; }
    public String getSegment() { return segment; }
    public String getService() { return service; }
    public String getBudget() { return budget; }
    public String getMessage() { return message; }
    public String getFingerprint() { return fingerprint; }
    public Instant getCreatedAt() { return createdAt; }
}
