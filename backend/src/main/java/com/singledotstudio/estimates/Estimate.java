package com.singledotstudio.estimates;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "estimates")
public class Estimate {

    @Id
    private UUID id;
    @Column(nullable = false, updatable = false)
    private String reference;
    @Column(name = "property_type", nullable = false)
    private String propertyType;
    @Column(nullable = false)
    private BigDecimal sqft;
    @Column(nullable = false)
    private int bhk;
    @Column(name = "size_label")
    private String sizeLabel;
    @Column(name = "package_requested", nullable = false)
    private String packageRequested;
    @Column(nullable = false)
    private String tier;
    @Column(nullable = false)
    private BigDecimal subtotal;
    @Column(nullable = false)
    private BigDecimal tax;
    @Column(nullable = false)
    private BigDecimal total;
    @Column(name = "range_low", nullable = false)
    private BigDecimal rangeLow;
    @Column(name = "range_high", nullable = false)
    private BigDecimal rangeHigh;
    @Column(name = "customer_name", nullable = false)
    private String customerName;
    @Column(name = "customer_email", nullable = false)
    private String customerEmail;
    @Column(name = "customer_phone", nullable = false)
    private String customerPhone;
    @Column(name = "customer_address", nullable = false)
    private String customerAddress = "";
    @Column(nullable = false)
    private boolean whatsapp;
    @Column(nullable = false, length = 64)
    private String fingerprint;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "estimate", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<EstimateItem> items = new ArrayList<>();

    protected Estimate() {
    }

    public Estimate(UUID id, String reference) {
        this.id = id;
        this.reference = reference;
    }

    public void addItem(EstimateItem item) {
        item.setEstimate(this);
        items.add(item);
    }

    public UUID getId() { return id; }
    public String getReference() { return reference; }
    public String getPropertyType() { return propertyType; }
    public void setPropertyType(String v) { propertyType = v; }
    public BigDecimal getSqft() { return sqft; }
    public void setSqft(BigDecimal v) { sqft = v; }
    public int getBhk() { return bhk; }
    public void setBhk(int v) { bhk = v; }
    public String getSizeLabel() { return sizeLabel; }
    public void setSizeLabel(String v) { sizeLabel = v; }
    public String getPackageRequested() { return packageRequested; }
    public void setPackageRequested(String v) { packageRequested = v; }
    public String getTier() { return tier; }
    public void setTier(String v) { tier = v; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal v) { subtotal = v; }
    public BigDecimal getTax() { return tax; }
    public void setTax(BigDecimal v) { tax = v; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal v) { total = v; }
    public BigDecimal getRangeLow() { return rangeLow; }
    public void setRangeLow(BigDecimal v) { rangeLow = v; }
    public BigDecimal getRangeHigh() { return rangeHigh; }
    public void setRangeHigh(BigDecimal v) { rangeHigh = v; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String v) { customerName = v; }
    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String v) { customerEmail = v; }
    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String v) { customerPhone = v; }
    public String getCustomerAddress() { return customerAddress; }
    public void setCustomerAddress(String v) { customerAddress = v == null ? "" : v; }
    public boolean isWhatsapp() { return whatsapp; }
    public void setWhatsapp(boolean v) { whatsapp = v; }
    public String getFingerprint() { return fingerprint; }
    public void setFingerprint(String v) { fingerprint = v; }
    public Instant getCreatedAt() { return createdAt; }
    public List<EstimateItem> getItems() { return items; }
}
