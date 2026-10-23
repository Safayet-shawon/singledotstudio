package com.singledotstudio.common;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;

/** Small, dependency-free text helpers shared by the request flows. */
public final class Text {

    private Text() {
    }

    /** Trims, collapses internal whitespace and removes control characters (blocks header and log injection). */
    public static String clean(String s) {
        if (s == null) return "";
        return s.replaceAll("\\p{Cntrl}", " ").replaceAll("\\s+", " ").strip();
    }

    /** Like {@link #clean(String)} but keeps line breaks, for free-text messages. */
    public static String cleanMultiline(String s) {
        if (s == null) return "";
        return s.replace("\r\n", "\n").replaceAll("[\\p{Cntrl}&&[^\\n]]", " ").strip();
    }

    public static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    public static String digitsOnly(String s) {
        return s == null ? "" : s.replaceAll("\\D", "");
    }

    public static String lower(String s) {
        return s == null ? "" : s.toLowerCase(Locale.ROOT).strip();
    }
}
