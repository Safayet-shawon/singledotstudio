package com.singledotstudio.estimates;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** Request and response shapes for the public estimate endpoint. */
public final class EstimateDtos {

    private EstimateDtos() {
    }

    public static final String PHONE = "^\\+?[\\d\\s\\-()]{7,20}$";
    public static final String EMAIL = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$";
    public static final String NO_CONTROL = "^[^\\p{Cntrl}]*$";

    /** The options the customer picked. Prices are never accepted from the client. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Input(
            @NotBlank @Size(max = 16) String propertyType,
            @NotNull @DecimalMin("1") @DecimalMax("1000000") BigDecimal sqft,
            @Min(0) @Max(50) Integer bhk,
            @NotNull @Size(max = 40) Map<@NotBlank @Size(max = 32) @Pattern(regexp = "^[a-z0-9_-]+$") String, @Min(0) @Max(100000) Integer> items,
            @JsonProperty("package") @NotBlank @Size(max = 16) String packageKey,
            @Size(max = 10) List<@NotBlank @Size(max = 32) @Pattern(regexp = "^[a-z0-9_-]+$") String> extras,
            @DecimalMin("0") @DecimalMax("100000000000") BigDecimal targetBudget,
            @Size(max = 24) @Pattern(regexp = "^(\\d{3,5}-\\d{3,5}|\\d{3,5}\\+|\\d{3,5} sq ft)$") String sizeLabel) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Request(
            @NotNull @Valid Input estimateInput,
            @NotBlank @Size(min = 2, max = 80) @Pattern(regexp = NO_CONTROL) String name,
            @NotBlank @Pattern(regexp = PHONE, message = "must be a valid phone number") String phone,
            @NotBlank @Size(max = 120) @Pattern(regexp = EMAIL, message = "must be a valid email address") String email,
            @Size(max = 300) @Pattern(regexp = NO_CONTROL) String address,
            Boolean whatsapp,
            @NotNull(message = "please agree to be contacted about your quotation") @AssertTrue(message = "please agree to be contacted about your quotation") Boolean consent,
            @Size(max = 200) String website) {
    }

    /**
     * What the browser gets back. The price is deliberately not included: it is emailed to the customer and shown
     * only to signed-in staff.
     */
    public record Response(String reference, String customerEmail, boolean teamNotified, boolean duplicate) {
    }
}
