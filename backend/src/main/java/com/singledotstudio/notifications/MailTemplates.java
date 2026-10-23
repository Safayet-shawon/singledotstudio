package com.singledotstudio.notifications;

import com.singledotstudio.config.AppProperties;
import com.singledotstudio.consultations.Consultation;
import com.singledotstudio.estimates.Estimate;
import com.singledotstudio.estimates.EstimatePdfService;
import com.singledotstudio.estimates.EstimateItem;
import com.singledotstudio.estimates.Pricing;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

/** Subjects and bodies for outgoing mail. Every customer-supplied value is HTML-escaped. */
@Component
public class MailTemplates {

    public record Message(String subject, String text, String html) {}

    private final Pricing pricing;
    private final AppProperties props;
    private final EstimatePdfService pdf;

    public MailTemplates(Pricing pricing, AppProperties props, EstimatePdfService pdf) {
        this.pricing = pricing;
        this.props = props;
        this.pdf = pdf;
    }

    private static String esc(String s) {
        return HtmlUtils.htmlEscape(s == null ? "" : s);
    }

    /** Subjects must stay on one line, whatever the customer typed. */
    private static String oneLine(String s) {
        return s == null ? "" : s.replaceAll("[\\r\\n]+", " ").strip();
    }

    private String studio() {
        return props.company().name();
    }

    public Message customerQuotation(Estimate e) {
        Pricing.PackageInfo pk = pricing.packages().get(e.getTier());
        boolean bestfit = "bestfit".equals(e.getPackageRequested());
        List<String> spaces = new ArrayList<>();
        for (EstimateItem i : e.getItems()) {
            spaces.add(("extra".equals(i.getKind()) ? "Add-on: " : "") + i.getLabel() + (i.getQty() > 1 && "space".equals(i.getKind()) ? " × " + i.getQty() : ""));
        }
        String range = money(e.getRangeLow()) + " to " + money(e.getRangeHigh());
        String prop = EstimatePdfService.propertyLine(e);
        String features = pk.features().stream().map(f -> "<li>" + esc(f) + "</li>").collect(Collectors.joining());

        String html = "<div style=\"font-family:Georgia,'Times New Roman',serif;color:#26231f;max-width:600px;margin:auto;padding:28px;background:#f7f2e9\">"
                + "<p style=\"font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#6b6b4a;margin:0 0 6px\">" + esc(studio()) + "</p>"
                + "<h1 style=\"font-weight:500;font-size:26px;margin:0 0 14px\">Your interior design quotation</h1>"
                + "<p style=\"font-size:15px;line-height:1.6\">Hello " + esc(e.getCustomerName()) + ", thank you for your request. Here is the quotation for " + esc(prop) + ".</p>"
                + "<div style=\"background:#fff;border:1px solid #ddd3c3;padding:20px;margin:18px 0\">"
                + "<p style=\"font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#6b6b4a;margin:0\">Selected package</p>"
                + "<h2 style=\"font-weight:500;font-size:24px;margin:4px 0 8px\">" + esc(pk.label()) + (bestfit ? " <span style=\"font-size:13px;color:#7b7268\">(recommended for you)</span>" : "") + "</h2>"
                + "<p style=\"font-size:14px;line-height:1.6;color:#5d554c;margin:0 0 10px\">" + esc(pk.scope()) + "</p>"
                + "<ul style=\"font-size:14px;line-height:1.7;padding-left:18px;margin:0 0 14px\">" + features + "</ul>"
                + "<p style=\"font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#6b6b4a;margin:0\">Estimated price</p>"
                + "<p style=\"font-size:28px;margin:2px 0 0\">" + esc(range) + "</p>"
                + "<p style=\"font-size:12px;color:#7b7268;margin:6px 0 0\">Reference " + esc(e.getReference()) + ". Final figure after consultation and site measurement.</p>"
                + "</div>"
                + "<p style=\"font-size:13px;line-height:1.7;margin:0 0 4px\"><strong>Included spaces</strong></p>"
                + "<p style=\"font-size:13px;line-height:1.7;color:#5d554c;margin:0 0 20px\">" + esc(String.join(", ", spaces)) + "</p>"
                + "<p style=\"font-size:12px;color:#7b7268;margin:22px 0 0\">The detailed quotation is attached as a PDF. Our team will contact you shortly.</p>"
                + "</div>";
        String text = "Hello " + e.getCustomerName() + ",\n\nYour quotation for " + prop + "\n\nSelected package: " + pk.label() + "\n" + pk.scope() + "\n"
                + pk.features().stream().map(f -> "- " + f).collect(Collectors.joining("\n")) + "\n\nEstimated price: " + range + "\nReference: " + e.getReference()
                + "\n\nIncluded: " + String.join(", ", spaces) + "\n\nThe detailed quotation is attached. " + studio();
        return new Message("Your interior design quotation, " + studio() + " (" + e.getReference() + ")", text, html);
    }

    public Message teamQuotation(Estimate e) {
        String summary = e.getReference() + ": " + EstimatePdfService.propertyLine(e) + ", " + pricing.packages().get(e.getTier()).label() + " package, "
                + money(e.getRangeLow()) + " to " + money(e.getRangeHigh());
        String text = "A customer requested a quotation.\n\n" + e.getCustomerName() + "\n" + e.getCustomerPhone() + (e.isWhatsapp() ? " (WhatsApp)" : "")
                + "\n" + e.getCustomerEmail() + "\n" + (e.getCustomerAddress().isBlank() ? "-" : e.getCustomerAddress()) + "\n\n" + summary
                + "\n\nThe customer's copy of the quotation is attached.";
        return new Message("New quotation request: " + oneLine(e.getCustomerName()) + " (" + e.getReference() + ")", text, null);
    }

    public Message teamConsultation(Consultation c) {
        String text = c.getCustomerName() + "\n" + c.getCustomerPhone() + "\n" + c.getCustomerEmail() + "\n" + c.getCustomerAddress() + "\n\n"
                + "segment: " + dash(c.getSegment()) + "\nservice: " + dash(c.getService()) + "\nbudget: " + dash(c.getBudget()) + "\nmessage: " + dash(c.getMessage())
                + "\n\nReference: " + c.getReference();
        return new Message("New consultation request: " + oneLine(c.getCustomerName()) + " (" + c.getReference() + ")", text, null);
    }

    private static String dash(String s) {
        return s == null || s.isBlank() ? "-" : s;
    }

    private String money(BigDecimal n) {
        return pdf.money(n);
    }
}
