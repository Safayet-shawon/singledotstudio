package com.singledotstudio.estimates;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.singledotstudio.common.BusinessRuleException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/** The server must refuse anything outside the price book, whatever the browser sends. */
class EstimateCalculatorValidationTest {

    private final EstimateCalculator calc = new EstimateCalculator(load());

    private static Pricing load() {
        try (InputStream in = EstimateCalculatorValidationTest.class.getResourceAsStream("/pricing.json")) {
            return JsonMapper.builder().build().readValue(in, Pricing.class);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private EstimateCalculator.Request home(String sqft, Integer bhk, Map<String, Integer> items, String pkg, List<String> extras) {
        return new EstimateCalculator.Request("apartment", new BigDecimal(sqft), bhk, items, pkg, extras, null, null);
    }

    @Test
    void acceptsAValidHomeRequest() {
        EstimateCalculator.Result r = calc.compute(home("1200", 2, Map.of("master", 1, "family", 1), "essential", List.of()));
        assertThat(r.total().signum()).isPositive();
        assertThat(r.low()).isLessThan(r.total());
        assertThat(r.high()).isGreaterThan(r.total());
    }

    @Test
    void rejectsSizesOutsideTheSupportedRange() {
        assertThatThrownBy(() -> calc.compute(home("50", 2, Map.of("master", 1), "premium", List.of()))).isInstanceOf(BusinessRuleException.class).hasMessageContaining("Size must be between");
        assertThatThrownBy(() -> calc.compute(home("999999", 2, Map.of("master", 1), "premium", List.of()))).isInstanceOf(BusinessRuleException.class);
        assertThatThrownBy(() -> calc.compute(home("-100", 2, Map.of("master", 1), "premium", List.of()))).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void rejectsUnsupportedBhk() {
        assertThatThrownBy(() -> calc.compute(home("1200", 0, Map.of("master", 1), "premium", List.of()))).hasMessageContaining("BHK");
        assertThatThrownBy(() -> calc.compute(home("1200", 99, Map.of("master", 1), "premium", List.of()))).hasMessageContaining("BHK");
        assertThatThrownBy(() -> calc.compute(home("1200", null, Map.of("master", 1), "premium", List.of()))).hasMessageContaining("BHK");
    }

    @Test
    void rejectsUnknownOrWrongGroupSpaces() {
        assertThatThrownBy(() -> calc.compute(home("1200", 2, Map.of("hovercraft", 1), "premium", List.of()))).hasMessageContaining("not available");
        // office spaces are not selectable on a home
        assertThatThrownBy(() -> calc.compute(home("1200", 2, Map.of("workstation", 5), "premium", List.of()))).hasMessageContaining("not available");
    }

    @Test
    void rejectsNegativeAndOversizedQuantities() {
        assertThatThrownBy(() -> calc.compute(home("1200", 2, Map.of("master", -1), "premium", List.of()))).hasMessageContaining("quantity");
        assertThatThrownBy(() -> calc.compute(home("1200", 2, Map.of("master", 5), "premium", List.of()))).hasMessageContaining("quantity");
    }

    @Test
    void requiresAtLeastOneSpace() {
        assertThatThrownBy(() -> calc.compute(home("1200", 2, Map.of(), "premium", List.of()))).hasMessageContaining("at least one space");
        assertThatThrownBy(() -> calc.compute(home("1200", 2, Map.of("master", 0), "premium", List.of()))).hasMessageContaining("at least one space");
    }

    @Test
    void rejectsUnknownPackageExtraAndPropertyType() {
        assertThatThrownBy(() -> calc.compute(home("1200", 2, Map.of("master", 1), "platinum", List.of()))).hasMessageContaining("package");
        assertThatThrownBy(() -> calc.compute(home("1200", 2, Map.of("master", 1), "premium", List.of("jacuzzi")))).hasMessageContaining("add-on");
        assertThatThrownBy(() -> calc.compute(new EstimateCalculator.Request("castle", new BigDecimal("1200"), 2, Map.of("master", 1), "premium", List.of(), null, null)))
                .hasMessageContaining("property type");
    }

    @Test
    void officeAndShowroomIgnoreBhk() {
        EstimateCalculator.Result o = calc.compute(new EstimateCalculator.Request("office", new BigDecimal("1500"), null, Map.of("reception", 1, "workstation", 10), "premium", List.of(), null, null));
        assertThat(o.input().bhk()).isEqualTo(1);
        EstimateCalculator.Result s = calc.compute(new EstimateCalculator.Request("showroom", new BigDecimal("1500"), null, Map.of("showfloor", 1), "luxury", List.of("smart"), null, null));
        assertThat(s.extras()).hasSize(1);
    }

    @Test
    void ignoresAnyTotalTheClientMightHaveComputed() {
        // The request type has no price field at all: the same options always give the same server-side figure.
        EstimateCalculator.Result a = calc.compute(home("1200", 2, Map.of("master", 1, "family", 1), "premium", List.of()));
        EstimateCalculator.Result b = calc.compute(home("1200", 2, Map.of("master", 1, "family", 1), "premium", List.of()));
        assertThat(a.total()).isEqualByComparingTo(b.total());
    }
}
