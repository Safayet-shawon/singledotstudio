package com.singledotstudio.estimates;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Parity with the original calculator. parity.json holds inputs and the exact results the previous TypeScript engine
 * produced for them (generated once from the same pricing file). The Java engine must agree on every figure.
 */
class EstimateCalculatorParityTest {

    private final Pricing pricing = loadPricing();
    private final EstimateCalculator calculator = new EstimateCalculator(pricing);

    private static Pricing loadPricing() {
        try (InputStream in = EstimateCalculatorParityTest.class.getResourceAsStream("/pricing.json")) {
            return JsonMapper.builder().build().readValue(in, Pricing.class);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @TestFactory
    List<DynamicTest> matchesTheOriginalEngine() throws Exception {
        JsonNode cases;
        try (InputStream in = getClass().getResourceAsStream("/parity.json")) {
            cases = JsonMapper.builder().build().readTree(in);
        }
        List<DynamicTest> tests = new ArrayList<>();
        int n = 0;
        for (JsonNode c : cases) {
            JsonNode in = c.get("input");
            String name = ++n + " " + in.get("propertyType").asString() + " " + in.get("package").asString() + " " + in.get("sqft").asString() + " sq ft";
            tests.add(DynamicTest.dynamicTest(name, () -> check(c)));
        }
        assertThat(tests).hasSize(7);
        return tests;
    }

    private void check(JsonNode c) {
        JsonNode in = c.get("input");
        Map<String, Integer> items = new LinkedHashMap<>();
        for (var e : in.get("items").properties()) items.put(e.getKey(), e.getValue().asInt());
        List<String> extras = new ArrayList<>();
        in.get("extras").forEach(x -> extras.add(x.asString()));
        BigDecimal target = in.has("targetBudget") ? new BigDecimal(in.get("targetBudget").asString()) : null;

        EstimateCalculator.Result r = calculator.compute(new EstimateCalculator.Request(in.get("propertyType").asString(), new BigDecimal(in.get("sqft").asString()),
                in.get("bhk").asInt(), items, in.get("package").asString(), extras, target, null));

        assertThat(r.tier()).isEqualTo(c.get("tier").asString());
        assertMoney(r.subtotal(), c.get("subtotal"));
        assertMoney(r.tax(), c.get("tax"));
        assertMoney(r.total(), c.get("total"));
        assertMoney(r.low(), c.get("low"));
        assertMoney(r.high(), c.get("high"));
        for (String tier : EstimateCalculator.TIERS) assertMoney(r.tierTotals().get(tier), c.get("tierTotals").get(tier));

        JsonNode lines = c.get("lines");
        assertThat(r.lines()).hasSize(lines.size());
        for (int i = 0; i < lines.size(); i++) {
            JsonNode l = lines.get(i);
            EstimateCalculator.Line got = r.lines().get(i);
            assertThat(got.key()).isEqualTo(l.get(0).asString());
            assertThat(got.qty()).isEqualTo(l.get(1).asInt());
            if (l.get(2).isNull()) assertThat(got.area()).isNull();
            else assertThat(got.area()).isEqualTo(l.get(2).asInt());
            assertMoney(got.amount(), l.get(3));
        }
        JsonNode ex = c.get("extras");
        assertThat(r.extras()).hasSize(ex.size());
        for (int i = 0; i < ex.size(); i++) {
            assertThat(r.extras().get(i).key()).isEqualTo(ex.get(i).get(0).asString());
            assertMoney(r.extras().get(i).amount(), ex.get(i).get(1));
        }
        List<String> why = new ArrayList<>();
        c.get("rationale").forEach(x -> why.add(x.asString()));
        assertThat(r.rationale()).containsExactlyElementsOf(why);
    }

    private static void assertMoney(BigDecimal actual, JsonNode expected) {
        assertThat(actual.compareTo(new BigDecimal(expected.asString()))).as("expected %s but was %s", expected.asString(), actual).isZero();
    }
}
