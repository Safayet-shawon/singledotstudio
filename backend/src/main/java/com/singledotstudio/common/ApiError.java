package com.singledotstudio.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/** The one JSON shape for every error: a safe message, an optional field list and an id support can look up in the logs. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(String error, List<FieldIssue> fields, String correlationId) {

    public record FieldIssue(String field, String message) {}

    public static ApiError of(String message) {
        return new ApiError(message, null, null);
    }
}
