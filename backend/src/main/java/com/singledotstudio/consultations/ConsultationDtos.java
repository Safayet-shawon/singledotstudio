package com.singledotstudio.consultations;

import static com.singledotstudio.estimates.EstimateDtos.EMAIL;
import static com.singledotstudio.estimates.EstimateDtos.NO_CONTROL;
import static com.singledotstudio.estimates.EstimateDtos.PHONE;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class ConsultationDtos {

    private ConsultationDtos() {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Request(
            @NotBlank @Size(min = 2, max = 80) @Pattern(regexp = NO_CONTROL) String name,
            @NotBlank @Pattern(regexp = PHONE, message = "must be a valid phone number") String phone,
            @NotBlank @Size(max = 120) @Pattern(regexp = EMAIL, message = "must be a valid email address") String email,
            @NotBlank @Size(min = 3, max = 300) @Pattern(regexp = NO_CONTROL) String address,
            @Pattern(regexp = "^(home|office|showroom)?$", message = "must be home, office or showroom") String segment,
            @Size(max = 40) @Pattern(regexp = NO_CONTROL) String service,
            @Size(max = 60) @Pattern(regexp = NO_CONTROL) String budget,
            @Size(max = 1000) String message,
            @NotNull(message = "please agree to be contacted") @AssertTrue(message = "please agree to be contacted") Boolean consent,
            @Size(max = 200) String website) {
    }

    public record Response(String reference, boolean duplicate) {
    }
}
