package com.singledotstudio.estimates;

import com.singledotstudio.config.AppProperties;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.openpdf.text.Document;
import org.openpdf.text.DocumentException;
import org.openpdf.text.Rectangle;
import org.openpdf.text.pdf.BaseFont;
import org.openpdf.text.pdf.PdfContentByte;
import org.openpdf.text.pdf.PdfPageEventHelper;
import org.openpdf.text.pdf.PdfTemplate;
import org.openpdf.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

/**
 * Builds the branded quotation PDF with OpenPDF. The design follows the studio's existing document template: navy
 * header band with the arch-and-dot mark, copper rules, a figure box, an itemised table, totals, notes and a signature
 * block. Everything drawn comes from the stored estimate, never from the browser.
 */
@Service
public class EstimatePdfService {

    private static final Color NAVY = new Color(0x2b, 0x27, 0x3e);
    private static final Color COPPER = new Color(0xb3, 0x68, 0x3e);
    private static final Color COPPER_L = new Color(0xe7, 0xb4, 0x8f);
    private static final Color CREAM = new Color(0xf7, 0xf2, 0xe9);
    private static final Color LINE = new Color(0xe6, 0xdc, 0xcb);
    private static final Color INK = new Color(0x26, 0x23, 0x1f);
    private static final Color MUTED = new Color(0x7a, 0x72, 0x68);
    private static final Color WHITE = Color.WHITE;
    private static final Color SOFT_WHITE = new Color(0xcf, 0xc9, 0xdc);

    private static final float PW = 595.28f, PH = 841.89f, M = 40f, R = PW - M, W = PW - 2 * M;
    private static final float BOTTOM = PH - 74f;
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH);

    private final Pricing pricing;
    private final AppProperties props;

    public EstimatePdfService(Pricing pricing, AppProperties props) {
        this.pricing = pricing;
        this.props = props;
    }

    public byte[] build(Estimate e) {
        try {
            return new Sheet(e).render();
        } catch (DocumentException | java.io.IOException ex) {
            throw new IllegalStateException("Could not build the quotation PDF", ex);
        }
    }

    private static String size(Estimate e) {
        String label = e.getSizeLabel();
        if (label != null && !label.isBlank()) return label.endsWith("sq ft") ? label : label + " sq ft";
        return e.getSqft().stripTrailingZeros().toPlainString() + " sq ft";
    }

    public static String propertyLine(Estimate e) {
        String type = switch (e.getPropertyType()) {
            case "villa" -> "Independent house / villa";
            case "office" -> "Office";
            case "showroom" -> "Showroom";
            default -> "Home";
        };
        boolean residential = "apartment".equals(e.getPropertyType()) || "villa".equals(e.getPropertyType());
        return residential ? type + ", " + e.getBhk() + " BHK, " + size(e) : type + ", " + size(e);
    }

    public String money(BigDecimal n) {
        NumberFormat f = NumberFormat.getIntegerInstance(Locale.forLanguageTag(pricing.currency().locale() == null ? "en-BD" : pricing.currency().locale()));
        f.setMaximumFractionDigits(0);
        return pricing.currency().pdfPrefix() + " " + f.format(n);
    }

    private static String plain(BigDecimal n) {
        NumberFormat f = NumberFormat.getInstance(Locale.ENGLISH);
        f.setMinimumFractionDigits(2);
        f.setMaximumFractionDigits(2);
        return f.format(n);
    }

    /** The standard PDF fonts only cover Latin text; anything else is shown as "?" rather than breaking the file. */
    private static String safe(String s) {
        if (s == null) return "";
        StringBuilder b = new StringBuilder(s.length());
        for (char c : s.toCharArray()) b.append(c >= 32 && c <= 255 && c != 127 ? c : (c == '\n' ? ' ' : '?'));
        return b.toString();
    }

    /** One quotation being drawn. */
    private final class Sheet {
        private final Estimate e;
        private final ByteArrayOutputStream out = new ByteArrayOutputStream();
        private final BaseFont helv, helvB, timesB, timesI;
        private final AppProperties.Company co = props.company();
        private Document doc;
        private PdfWriter writer;
        private PdfContentByte cb;
        private PdfTemplate totalPages;
        private float y;

        Sheet(Estimate e) throws DocumentException, java.io.IOException {
            this.e = e;
            helv = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, false);
            helvB = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.WINANSI, false);
            timesB = BaseFont.createFont(BaseFont.TIMES_BOLD, BaseFont.WINANSI, false);
            timesI = BaseFont.createFont(BaseFont.TIMES_ITALIC, BaseFont.WINANSI, false);
        }

        byte[] render() throws DocumentException {
            doc = new Document(new Rectangle(PW, PH), 0, 0, 0, 0);
            writer = PdfWriter.getInstance(doc, out);
            writer.setPageEvent(new PageDecor());
            doc.addTitle(e.getReference());
            doc.addAuthor(co.name());
            doc.open();
            cb = writer.getDirectContent();
            totalPages = cb.createTemplate(30, 12);
            body();
            doc.close();
            return out.toByteArray();
        }

        // ---------------------------------------------------------------- drawing primitives (y measured from the top)
        private float fy(float top) { return PH - top; }

        private void fillRect(float x, float top, float w, float h, Color c) {
            cb.setColorFill(c);
            cb.rectangle(x, fy(top + h), w, h);
            cb.fill();
        }

        private void fillRounded(float x, float top, float w, float h, float r, Color c) {
            cb.setColorFill(c);
            cb.roundRectangle(x, fy(top + h), w, h, r);
            cb.fill();
        }

        private void strokeRounded(float x, float top, float w, float h, float r, Color c, float lw) {
            cb.setColorStroke(c);
            cb.setLineWidth(lw);
            cb.roundRectangle(x, fy(top + h), w, h, r);
            cb.stroke();
        }

        private void hline(float x1, float x2, float top, Color c, float lw) {
            cb.setColorStroke(c);
            cb.setLineWidth(lw);
            cb.moveTo(x1, fy(top));
            cb.lineTo(x2, fy(top));
            cb.stroke();
        }

        /** Draws one line of text whose top edge is at {@code top}. align: 0 left, 1 center, 2 right. */
        private void text(BaseFont f, float size, Color c, String s, float x, float top, int align, float spacing) {
            cb.beginText();
            cb.setFontAndSize(f, size);
            cb.setColorFill(c);
            if (spacing != 0) cb.setCharacterSpacing(spacing);
            cb.showTextAligned(align == 2 ? PdfContentByte.ALIGN_RIGHT : align == 1 ? PdfContentByte.ALIGN_CENTER : PdfContentByte.ALIGN_LEFT,
                    safe(s), x, fy(top + size * 0.82f), 0);
            if (spacing != 0) cb.setCharacterSpacing(0);
            cb.endText();
        }

        private void text(BaseFont f, float size, Color c, String s, float x, float top) {
            text(f, size, c, s, x, top, 0, 0);
        }

        private List<String> wrap(BaseFont f, float size, String s, float width) {
            List<String> lines = new ArrayList<>();
            for (String para : safe(s).split("\\n")) {
                StringBuilder cur = new StringBuilder();
                for (String word : para.split("\\s+")) {
                    if (word.isEmpty()) continue;
                    String trial = cur.length() == 0 ? word : cur + " " + word;
                    if (f.getWidthPoint(trial, size) <= width || cur.length() == 0) {
                        cur = new StringBuilder(trial);
                    } else {
                        lines.add(cur.toString());
                        cur = new StringBuilder(word);
                    }
                }
                lines.add(cur.toString());
            }
            return lines;
        }

        private float paragraph(BaseFont f, float size, Color c, String s, float x, float top, float width, float leading) {
            float t = top;
            for (String line : wrap(f, size, s, width)) {
                text(f, size, c, line, x, t);
                t += leading;
            }
            return t;
        }

        /** The studio mark (arch and dot) drawn as vectors so it stays sharp at any size. */
        private void mark(float x, float top, float scale, Color arch, Color dot) {
            cb.saveState();
            cb.concatCTM(scale, 0, 0, -scale, x - 690 * scale, fy(top) + 566 * scale);
            cb.setColorStroke(arch);
            cb.setLineWidth(22);
            cb.setLineCap(PdfContentByte.LINE_CAP_ROUND);
            cb.moveTo(700, 838);
            cb.lineTo(700, 690);
            cb.curveTo(700, 650, 720, 613, 755, 595);
            cb.moveTo(900, 838);
            cb.lineTo(900, 690);
            cb.curveTo(900, 650, 880, 613, 845, 595);
            cb.stroke();
            cb.setColorFill(dot);
            cb.circle(800, 577, 28);
            cb.fill();
            cb.restoreState();
        }

        // ------------------------------------------------------------------------------ page furniture
        private void header() {
            fillRect(0, 0, PW, 108, NAVY);
            fillRect(0, 108, PW, 4, COPPER);
            mark(M - 2, 17, 0.17f, WHITE, COPPER_L);
            text(timesB, 21, WHITE, co.name(), M + 48, 28);
            text(helv, 7.5f, COPPER_L, co.tagline().toUpperCase(Locale.ROOT), M + 48, 55, 0, 1.6f);
            float cy = 70;
            for (String l : new String[] {co.address(), (co.phone() + "   " + co.email()).strip(), co.website()}) {
                if (l == null || l.isBlank()) continue;
                text(helv, 7.8f, SOFT_WHITE, l, M + 48, cy);
                cy += 10.5f;
            }
            text(timesB, 32, WHITE, "QUOTATION", R, 24, 2, 2f);
            text(helvB, 10, COPPER_L, "No. " + e.getReference(), R, 66, 2, 0);
            LocalDate issued = e.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate();
            text(helv, 8.5f, SOFT_WHITE, "Issued " + DAY.format(issued) + "   ·   Valid until " + DAY.format(issued.plusDays(co.quotationValidDays())), R, 82, 2, 0);
        }

        private void slimHeader() {
            fillRect(0, 0, PW, 30, NAVY);
            fillRect(0, 30, PW, 2.5f, COPPER);
            mark(M - 1, 5, 0.07f, WHITE, COPPER_L);
            text(timesB, 11, WHITE, co.name(), M + 22, 10);
            text(helv, 8, COPPER_L, "QUOTATION " + e.getReference(), R, 12, 2, 0);
        }

        private void label(String s, float x, float top) {
            text(helvB, 7.5f, COPPER, s, x, top, 0, 1.5f);
        }

        private void newPage() {
            doc.newPage();
            slimHeader();
            y = 52;
        }

        // ------------------------------------------------------------------------------------- content
        private void body() {
            header();
            Pricing.PackageInfo pk = pricing.packages().get(e.getTier());
            y = 132;

            label("BILLED TO", M, y);
            text(timesB, 14, NAVY, e.getCustomerName(), M, y + 12);
            float ly = y + 31;
            for (String l : new String[] {e.getCustomerAddress(), (e.getCustomerPhone() + (e.isWhatsapp() ? " (WhatsApp)" : "") + "  ·  " + e.getCustomerEmail())}) {
                if (l == null || l.isBlank()) continue;
                ly = paragraph(helv, 8.8f, MUTED, l, M, ly, 230, 12);
            }

            label("PROPERTY", 285, y);
            float py = paragraph(timesB, 12, NAVY, propertyLine(e), 285, y + 12, 120, 14);
            paragraph(helv, 8.8f, MUTED, pk.label() + " package", 285, py + 1, 120, 12);

            float bx = 418, bw = R - bx, bh = 62;
            fillRounded(bx, y - 4, bw, bh, 6, CREAM);
            fillRect(bx, y - 4, 3, bh, COPPER);
            text(helvB, 7.5f, COPPER, "TOTAL ESTIMATE", bx + 12, y + 3, 0, 1.3f);
            text(timesB, 13.5f, NAVY, money(e.getTotal()), bx + 12, y + 16);
            LocalDate issued = e.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate();
            text(helv, 8, MUTED, "Valid until " + DAY.format(issued.plusDays(co.quotationValidDays())), bx + 12, y + 36);

            y = Math.max(Math.max(ly, py + 26), y - 4 + bh) + 14;
            String title = pk.label() + " package: " + propertyLine(e);
            y = paragraph(timesI, 12.5f, INK, title, M, y, W, 15) + 8;

            tableHead();
            int n = 0;
            for (EstimateItem it : e.getItems()) {
                n++;
                String desc = ("extra".equals(it.getKind()) ? "Add-on: " : "") + it.getLabel()
                        + (it.getQty() > 1 && "space".equals(it.getKind()) ? " (" + it.getQty() + ")" : "")
                        + (it.getAreaSqft() != null && it.getAreaSqft() > 0 ? ", about " + it.getAreaSqft() + " sq ft" : "");
                List<String> lines = wrap(helv, 9.3f, desc, 224);
                float h = Math.max(22, lines.size() * 12 + 10);
                if (y + h > BOTTOM - 20) {
                    newPage();
                    tableHead();
                }
                if (n % 2 == 0) fillRect(M, y, W, h, CREAM);
                text(helv, 9.3f, MUTED, String.valueOf(n), M + 8, y + 6.5f);
                float ty = y + 6.5f;
                for (String l : lines) {
                    text(helv, 9.3f, INK, l, M + 30, ty);
                    ty += 12;
                }
                text(helv, 9.3f, INK, "1", M + 306, y + 6.5f, 2, 0);
                text(helv, 9.3f, MUTED, "lot", M + 318, y + 6.5f);
                text(helv, 9.3f, INK, plain(it.getAmount()), M + 418, y + 6.5f, 2, 0);
                text(helvB, 9.3f, INK, plain(it.getAmount()), R - 8, y + 6.5f, 2, 0);
                y += h;
                hline(M, R, y, LINE, 0.5f);
            }
            y += 14;

            if (y + 150 > BOTTOM) newPage();
            float topY = y;
            float tx = 330, tw = R - tx;
            if (e.getTax().signum() > 0) {
                row("Subtotal", money(e.getSubtotal()), tx, tw);
                row(pricing.tax().label() + " (" + pricing.tax().percent().stripTrailingZeros().toPlainString() + "%)", money(e.getTax()), tx, tw);
            }
            y += 3;
            fillRounded(tx, y, tw, 34, 5, NAVY);
            text(helvB, 8, COPPER_L, "TOTAL", tx + 12, y + 13, 0, 1.5f);
            text(timesB, 15, WHITE, money(e.getTotal()), tx + tw - 12, y + 9.5f, 2, 0);
            y += 44;

            float leftY = topY;
            if (!co.paymentTerms().isBlank()) {
                leftY = box("PAYMENT TERMS", co.paymentTerms(), leftY);
            }
            y = Math.max(y, leftY) + 6;

            String note = pk.scope() + " Indicative budget range: " + money(e.getRangeLow()) + " to " + money(e.getRangeHigh())
                    + ". This estimate is based on the details you entered and a standard layout; the final quotation follows consultation and site measurement.";
            block("NOTES", note);
            String terms = "Assumptions: " + String.join(" ", pricing.assumptions()) + " Exclusions: " + String.join("; ", pricing.exclusions()) + ".";
            block("TERMS AND CONDITIONS", terms);

            if (y + 70 > BOTTOM) newPage();
            y += 14;
            signature(M, "Client acceptance", "Signature and date");
            signature(R - 190, co.name(), "Authorised signatory");
        }

        private void tableHead() {
            fillRect(M, y, W, 22, NAVY);
            float ty = y + 7.5f;
            text(helvB, 7.5f, WHITE, "#", M + 8, ty, 0, 1);
            text(helvB, 7.5f, WHITE, "DESCRIPTION", M + 30, ty, 0, 1);
            text(helvB, 7.5f, WHITE, "QTY", M + 306, ty, 2, 1);
            text(helvB, 7.5f, WHITE, "UNIT", M + 318, ty, 0, 1);
            text(helvB, 7.5f, WHITE, "UNIT PRICE", M + 418, ty, 2, 1);
            text(helvB, 7.5f, WHITE, "AMOUNT", R - 8, ty, 2, 1);
            y += 22;
        }

        private void row(String k, String v, float tx, float tw) {
            text(helv, 9.3f, MUTED, k, tx, y);
            text(helv, 9.3f, INK, v, tx + tw - 8, y, 2, 0);
            y += 17;
        }

        private float box(String head, String body, float top) {
            List<String> lines = wrap(helv, 8.6f, body, 262);
            float h = lines.size() * 11 + 30;
            fillRounded(M, top, 280, h, 5, CREAM);
            fillRect(M, top, 3, h, COPPER);
            text(helvB, 7.5f, COPPER, head, M + 14, top + 9, 0, 1.3f);
            paragraph(helv, 8.6f, INK, body, M + 14, top + 21, 262, 11);
            return top + h + 8;
        }

        private void block(String head, String body) {
            if (body.isBlank()) return;
            List<String> lines = wrap(helv, 8.4f, body, W);
            float h = lines.size() * 11 + 24;
            if (y + h > BOTTOM - 60) newPage();
            text(helvB, 7.5f, COPPER, head, M, y, 0, 1.3f);
            y = paragraph(helv, 8.4f, MUTED, body, M, y + 12, W, 11) + 10;
        }

        private void signature(float x, String who, String role) {
            hline(x, x + 190, y + 28, NAVY, 0.8f);
            text(timesI, 10.5f, INK, who, x, y + 32);
            text(helv, 7.8f, MUTED, role, x, y + 46);
        }

        /** Footer on every page, with "Page n of N" filled in when the document closes. */
        private final class PageDecor extends PdfPageEventHelper {
            @Override
            public void onEndPage(PdfWriter w, Document d) {
                PdfContentByte c = w.getDirectContent();
                c.saveState();
                c.setColorStroke(COPPER);
                c.setLineWidth(0.8f);
                c.moveTo(M, fy(PH - 56));
                c.lineTo(R, fy(PH - 56));
                c.stroke();
                c.beginText();
                c.setFontAndSize(timesI, 10);
                c.setColorFill(NAVY);
                c.showTextAligned(PdfContentByte.ALIGN_LEFT, safe(co.footer()), M, fy(PH - 48 + 8), 0);
                c.setFontAndSize(helv, 7.6f);
                c.setColorFill(MUTED);
                String pageText = "Page " + w.getPageNumber() + " of ";
                float wText = helv.getWidthPoint(pageText, 7.6f);
                c.showTextAligned(PdfContentByte.ALIGN_LEFT, pageText, R - wText - 12, fy(PH - 47 + 6), 0);
                c.endText();
                c.addTemplate(totalPages, R - 12, fy(PH - 47 + 6) - 1.5f);
                c.restoreState();
            }

            @Override
            public void onCloseDocument(PdfWriter w, Document d) {
                totalPages.beginText();
                totalPages.setFontAndSize(helv, 7.6f);
                totalPages.setColorFill(MUTED);
                totalPages.showText(String.valueOf(w.getPageNumber() - 1));
                totalPages.endText();
            }
        }
    }
}
