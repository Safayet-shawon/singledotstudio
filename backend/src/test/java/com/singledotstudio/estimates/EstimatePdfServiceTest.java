package com.singledotstudio.estimates;

import static org.assertj.core.api.Assertions.assertThat;

import com.singledotstudio.config.AppProperties;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.openpdf.text.pdf.PdfReader;
import org.openpdf.text.pdf.parser.PdfTextExtractor;
import tools.jackson.databind.json.JsonMapper;

class EstimatePdfServiceTest {

    private final Pricing pricing = load();
    private final EstimateCalculator calc = new EstimateCalculator(pricing);
    private final EstimatePdfService pdf = new EstimatePdfService(pricing, new AppProperties(List.of(), null, 0, null, null, null, null, null));

    private static Pricing load() {
        try (InputStream in = EstimatePdfServiceTest.class.getResourceAsStream("/pricing.json")) {
            return JsonMapper.builder().build().readValue(in, Pricing.class);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private Estimate estimate(String name, Map<String, Integer> items, String pkg) {
        EstimateCalculator.Result r = calc.compute(new EstimateCalculator.Request("apartment", new BigDecimal("1500"), 3, items, pkg, List.of("smart"), null, "1500-1649"));
        Estimate e = new Estimate(UUID.randomUUID(), "QUO-20260101-ABCD");
        e.setPropertyType("apartment");
        e.setSqft(new BigDecimal("1500"));
        e.setBhk(3);
        e.setSizeLabel("1500-1649");
        e.setPackageRequested(pkg);
        e.setTier(r.tier());
        e.setSubtotal(r.subtotal());
        e.setTax(r.tax());
        e.setTotal(r.total());
        e.setRangeLow(r.low());
        e.setRangeHigh(r.high());
        e.setCustomerName(name);
        e.setCustomerEmail("customer@example.com");
        e.setCustomerPhone("+8801700000000");
        e.setCustomerAddress("House 1, Road 2, Dhaka");
        e.setFingerprint("0".repeat(64));
        r.lines().forEach(l -> e.addItem(new EstimateItem("space", l.key(), l.label(), l.qty(), l.area(), l.amount())));
        r.extras().forEach(x -> e.addItem(new EstimateItem("extra", x.key(), x.label(), 1, null, x.amount())));
        return e;
    }

    private static String text(byte[] bytes) throws Exception {
        PdfReader reader = new PdfReader(bytes);
        PdfTextExtractor ex = new PdfTextExtractor(reader);
        StringBuilder all = new StringBuilder();
        for (int p = 1; p <= reader.getNumberOfPages(); p++) all.append(ex.getTextFromPage(p)).append('\n');
        reader.close();
        return all.toString();
    }

    @Test
    void buildsAValidQuotationWithTheStoredFigures() throws Exception {
        Estimate e = estimate("Asha Rahman", Map.of("master", 1, "child", 2, "family", 1, "kitchen", 1, "toilet", 3), "premium");
        byte[] bytes = pdf.build(e);
        assertThat(new String(bytes, 0, 5)).isEqualTo("%PDF-");
        String t = text(bytes);
        assertThat(t).contains("QUOTATION").contains("QUO-20260101-ABCD").contains("Asha Rahman").contains("Master Bedroom").contains("Smart-home wiring")
                .contains("TOTAL ESTIMATE").contains("Premium package").contains("Home, 3 BHK, 1500-1649 sq ft");
        assertThat(t).contains(pdf.money(e.getTotal()));
    }

    @Test
    void survivesNonLatinNamesWithoutFailing() throws Exception {
        byte[] bytes = pdf.build(estimate("আসা রহমান <script>", Map.of("master", 1), "essential"));
        assertThat(new String(bytes, 0, 5)).isEqualTo("%PDF-");
    }

    @Test
    void flowsOntoAFurtherPageWhenThereAreManyLines() throws Exception {
        Estimate e = estimate("Long List", Map.of("master", 1), "luxury");
        List<EstimateItem> extra = new ArrayList<>();
        for (int i = 0; i < 60; i++) extra.add(new EstimateItem("space", "x" + i, "Additional detailed joinery item number " + i + " with a long description to wrap", 1, 40, new BigDecimal("10000")));
        extra.forEach(e::addItem);
        byte[] bytes = pdf.build(e);
        PdfReader reader = new PdfReader(bytes);
        assertThat(reader.getNumberOfPages()).isGreaterThan(1);
        reader.close();
        assertThat(text(bytes)).contains("Page 2 of");
    }
}
