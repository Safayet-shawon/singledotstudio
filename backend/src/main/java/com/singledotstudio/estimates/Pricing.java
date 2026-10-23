package com.singledotstudio.estimates;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * The studio's price book, loaded from {@code pricing.json}. Every figure in the shipped file is a placeholder
 * until the studio confirms its rates; the calculator, PDF and emails all read from this single source.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record Pricing(
        boolean placeholder,
        Currency currency,
        int roundTo,
        BigDecimal rangeSpread,
        Tax tax,
        Limits limits,
        Map<String, PackageInfo> packages,
        BestFit bestFit,
        List<Item> items,
        List<Extra> extras,
        List<String> assumptions,
        List<String> exclusions) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Currency(String code, String symbol, String pdfPrefix, String locale) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Tax(boolean enabled, String label, BigDecimal percent) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Limits(int minSqft, int maxSqft, int maxBhk) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PackageInfo(String label, String tagline, String scope, List<String> features) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BestFit(int premiumSqft, int luxurySqft, int premiumSpaceCount, int luxuryBhk) {}

    /** {@code maxQty} and {@code defaultQty} are either a number or the rule "bhk" / "bhk-1". */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Item(String key, String group, String label, String basis, BigDecimal weight, BigDecimal share,
                       Boolean inLayout, Object maxQty, Object defaultQty, Map<String, BigDecimal> rates) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Extra(String key, String label, Map<String, BigDecimal> amount) {}

    public Item item(String key) {
        return items.stream().filter(i -> i.key().equals(key)).findFirst().orElse(null);
    }

    public Extra extra(String key) {
        return extras.stream().filter(e -> e.key().equals(key)).findFirst().orElse(null);
    }
}
