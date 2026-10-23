package com.singledotstudio.estimates;

import com.singledotstudio.common.BusinessRuleException;
import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * Server-side budget engine. It is the only place a price is worked out: whatever the browser sends is treated as a
 * request for options, never as a figure. Money uses BigDecimal; rounding mirrors the original calculator
 * (areas to whole sq ft, totals to the price book's rounding step).
 */
@Component
public class EstimateCalculator {

    public static final List<String> TIERS = List.of("essential", "premium", "luxury");
    private static final List<String> PROPERTY_TYPES = List.of("apartment", "villa", "office", "showroom");
    private static final MathContext MC = MathContext.DECIMAL128;

    private final Pricing pricing;

    public EstimateCalculator(Pricing pricing) {
        this.pricing = pricing;
    }

    public Pricing pricing() {
        return pricing;
    }

    /** What the customer asked for, before it has been checked. */
    public record Request(String propertyType, BigDecimal sqft, Integer bhk, Map<String, Integer> items,
                          String packageKey, List<String> extras, BigDecimal targetBudget, String sizeLabel) {}

    /** The same request after validation and normalisation. */
    public record Validated(String propertyType, BigDecimal sqft, int bhk, Map<String, Integer> items,
                            String packageKey, List<String> extras, BigDecimal targetBudget, String sizeLabel) {}

    public record Line(String key, String label, int qty, Integer area, String tier, BigDecimal amount) {}

    public record ExtraLine(String key, String label, BigDecimal amount) {}

    public record Result(Validated input, String tier, List<Line> lines, List<ExtraLine> extras, BigDecimal subtotal,
                         BigDecimal tax, BigDecimal total, BigDecimal low, BigDecimal high,
                         Map<String, BigDecimal> tierTotals, List<String> rationale) {}

    public static boolean isResidential(String type) {
        return "apartment".equals(type) || "villa".equals(type);
    }

    // ------------------------------------------------------------------ rules

    private int resolve(Object rule, int bhk) {
        if (rule instanceof Number n) return n.intValue();
        if ("bhk".equals(rule)) return bhk;
        if ("bhk-1".equals(rule)) return Math.max(0, bhk - 1);
        return 0;
    }

    public int maxQty(Pricing.Item i, int bhk) {
        return resolve(i.maxQty(), bhk);
    }

    public int defaultQty(Pricing.Item i, int bhk) {
        return resolve(i.defaultQty(), bhk);
    }

    public List<Pricing.Item> itemsFor(String type) {
        String group = isResidential(type) ? "residential" : type;
        return pricing.items().stream().filter(i -> group.equals(i.group())).toList();
    }

    /** Rejects anything outside the price book. Messages are safe to show to the customer. */
    public Validated validate(Request in) {
        String type = in.propertyType() == null ? "" : in.propertyType().toLowerCase(Locale.ROOT);
        if (!PROPERTY_TYPES.contains(type)) throw new BusinessRuleException("Please choose a property type.");

        Pricing.Limits lim = pricing.limits();
        BigDecimal sqft = in.sqft();
        if (sqft == null || sqft.compareTo(BigDecimal.valueOf(lim.minSqft())) < 0 || sqft.compareTo(BigDecimal.valueOf(lim.maxSqft())) > 0) {
            throw new BusinessRuleException("Size must be between " + lim.minSqft() + " and " + lim.maxSqft() + " sq ft.");
        }
        int bhk = 1;
        if (isResidential(type)) {
            bhk = in.bhk() == null ? 0 : in.bhk();
            if (bhk < 1 || bhk > lim.maxBhk()) throw new BusinessRuleException("BHK must be a whole number from 1 to " + lim.maxBhk() + ".");
        }

        String pkg = in.packageKey() == null ? "" : in.packageKey().toLowerCase(Locale.ROOT);
        if (!pricing.packages().containsKey(pkg)) throw new BusinessRuleException("Please choose a package.");

        Map<String, Pricing.Item> allowed = new LinkedHashMap<>();
        itemsFor(type).forEach(i -> allowed.put(i.key(), i));
        Map<String, Integer> items = new LinkedHashMap<>();
        if (in.items() != null) {
            for (Map.Entry<String, Integer> e : in.items().entrySet()) {
                Pricing.Item def = allowed.get(e.getKey());
                if (def == null) throw new BusinessRuleException("One of the selected spaces is not available for this property type.");
                int q = e.getValue() == null ? 0 : e.getValue();
                if (q < 0 || q > maxQty(def, bhk)) throw new BusinessRuleException("The quantity for \"" + def.label() + "\" is not available.");
                if (q > 0) items.put(def.key(), q);
            }
        }
        if (items.isEmpty()) throw new BusinessRuleException("Please select at least one space.");

        Set<String> extras = new LinkedHashSet<>();
        if (in.extras() != null) {
            for (String k : in.extras()) {
                if (pricing.extra(k) == null) throw new BusinessRuleException("One of the selected add-ons is not available.");
                extras.add(k);
            }
        }
        BigDecimal target = in.targetBudget() != null && in.targetBudget().signum() > 0 ? in.targetBudget() : null;
        return new Validated(type, sqft, bhk, items, pkg, new ArrayList<>(extras), target, in.sizeLabel());
    }

    // ---------------------------------------------------------------- pricing

    private BigDecimal round(BigDecimal n) {
        BigDecimal step = BigDecimal.valueOf(pricing.roundTo());
        return n.divide(step, MC).setScale(0, RoundingMode.HALF_UP).multiply(step);
    }

    private record Priced(List<Line> lines, BigDecimal sum) {}

    private Priced price(String tier, Validated v) {
        List<Pricing.Item> defs = itemsFor(v.propertyType());
        BigDecimal layoutWeight = BigDecimal.ZERO;
        for (Pricing.Item i : defs) {
            if ("layout".equals(i.basis()) && Boolean.TRUE.equals(i.inLayout())) {
                layoutWeight = layoutWeight.add(nz(i.weight()).multiply(BigDecimal.valueOf(defaultQty(i, v.bhk()))));
            }
        }
        List<Line> lines = new ArrayList<>();
        BigDecimal sum = BigDecimal.ZERO;
        for (Pricing.Item i : defs) {
            Integer qty = v.items().get(i.key());
            if (qty == null || qty == 0) continue;
            BigDecimal rate = i.rates().get(tier);
            BigDecimal amount;
            BigDecimal area = null;
            switch (i.basis()) {
                case "layout" -> {
                    area = v.sqft().multiply(nz(i.weight())).divide(layoutWeight, MC).multiply(BigDecimal.valueOf(qty));
                    amount = area.multiply(rate);
                }
                case "share" -> {
                    area = v.sqft().multiply(nz(i.share())).multiply(BigDecimal.valueOf(qty));
                    amount = area.multiply(rate);
                }
                case "flat" -> {
                    area = v.sqft();
                    amount = v.sqft().multiply(rate);
                }
                default -> amount = rate.multiply(BigDecimal.valueOf(qty));
            }
            sum = sum.add(amount);
            lines.add(new Line(i.key(), i.label(), qty, area == null ? null : area.setScale(0, RoundingMode.HALF_UP).intValue(),
                    tier, amount.setScale(0, RoundingMode.HALF_UP)));
        }
        return new Priced(lines, sum);
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private List<ExtraLine> extrasFor(String tier, Validated v) {
        return v.extras().stream().map(k -> {
            Pricing.Extra e = pricing.extra(k);
            return new ExtraLine(k, e.label(), e.amount().get(tier));
        }).toList();
    }

    private BigDecimal taxFactor() {
        return pricing.tax().enabled() ? BigDecimal.ONE.add(pricing.tax().percent().divide(BigDecimal.valueOf(100), MC)) : BigDecimal.ONE;
    }

    private BigDecimal totalFor(String tier, Validated v) {
        BigDecimal base = price(tier, v).sum();
        for (ExtraLine e : extrasFor(tier, v)) base = base.add(e.amount());
        return base.multiply(taxFactor());
    }

    // --------------------------------------------------------------- estimate

    public Result compute(Request request) {
        Validated v = validate(request);
        Map<String, BigDecimal> tierTotals = new LinkedHashMap<>();
        for (String t : TIERS) tierTotals.put(t, round(totalFor(t, v)));

        List<String> rationale = new ArrayList<>();
        String tier;
        if ("bestfit".equals(v.packageKey())) {
            Pricing.BestFit b = pricing.bestFit();
            int count = v.items().size();
            boolean big = v.sqft().compareTo(BigDecimal.valueOf(b.premiumSqft())) >= 0;
            tier = "essential";
            if (big || count >= b.premiumSpaceCount()) {
                tier = "premium";
                rationale.add(big
                        ? "Your " + plain(v.sqft()) + " sq ft is at or above " + b.premiumSqft() + " sq ft, where Premium detailing is usually the balanced choice."
                        : "You selected " + count + " spaces, so a consistent Premium finish keeps the whole home cohesive.");
            }
            boolean huge = v.sqft().compareTo(BigDecimal.valueOf(b.luxurySqft())) >= 0;
            if (huge || (isResidential(v.propertyType()) && v.bhk() >= b.luxuryBhk())) {
                tier = "luxury";
                rationale.add(huge
                        ? "At " + plain(v.sqft()) + " sq ft the scale suits a bespoke Luxury treatment."
                        : v.bhk() + " BHK homes are typically planned with Luxury-level joinery and detailing.");
            }
            if ("essential".equals(tier)) rationale.add("Your size and number of spaces point to the Essential package as the most efficient fit.");
            if (v.targetBudget() != null) {
                String fit = null;
                for (int i = TIERS.size() - 1; i >= 0; i--) {
                    if (tierTotals.get(TIERS.get(i)).compareTo(v.targetBudget()) <= 0) { fit = TIERS.get(i); break; }
                }
                if (fit != null) {
                    tier = fit;
                    rationale.add("Adjusted to the highest package within your target budget of " + java.text.NumberFormat.getIntegerInstance(Locale.ENGLISH).format(v.targetBudget()) + ".");
                } else {
                    tier = "essential";
                    rationale.add("Your target budget is below even the Essential estimate for these selections; consider fewer spaces.");
                }
            }
        } else {
            tier = v.packageKey();
        }

        Priced priced = price(tier, v);
        List<ExtraLine> extras = extrasFor(tier, v);
        BigDecimal subtotal = priced.sum();
        for (ExtraLine e : extras) subtotal = subtotal.add(e.amount());
        BigDecimal tax = pricing.tax().enabled() ? subtotal.multiply(pricing.tax().percent()).divide(BigDecimal.valueOf(100), MC) : BigDecimal.ZERO;
        BigDecimal total = subtotal.add(tax);
        BigDecimal spread = pricing.rangeSpread();
        return new Result(v, tier, priced.lines(), extras, round(subtotal), round(tax), round(total),
                round(total.multiply(BigDecimal.ONE.subtract(spread))), round(total.multiply(BigDecimal.ONE.add(spread))),
                tierTotals, rationale);
    }

    private static String plain(BigDecimal n) {
        return n.stripTrailingZeros().toPlainString();
    }
}
