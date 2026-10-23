package com.singledotstudio.estimates;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "estimate_items")
public class EstimateItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "estimate_id", nullable = false)
    private Estimate estimate;
    @Column(nullable = false)
    private String kind;
    @Column(name = "item_key", nullable = false)
    private String itemKey;
    @Column(nullable = false)
    private String label;
    @Column(nullable = false)
    private int qty;
    @Column(name = "area_sqft")
    private Integer areaSqft;
    @Column(nullable = false)
    private BigDecimal amount;

    protected EstimateItem() {
    }

    public EstimateItem(String kind, String itemKey, String label, int qty, Integer areaSqft, BigDecimal amount) {
        this.kind = kind;
        this.itemKey = itemKey;
        this.label = label;
        this.qty = qty;
        this.areaSqft = areaSqft;
        this.amount = amount;
    }

    void setEstimate(Estimate estimate) { this.estimate = estimate; }
    public Long getId() { return id; }
    public String getKind() { return kind; }
    public String getItemKey() { return itemKey; }
    public String getLabel() { return label; }
    public int getQty() { return qty; }
    public Integer getAreaSqft() { return areaSqft; }
    public BigDecimal getAmount() { return amount; }
}
