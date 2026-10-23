package com.singledotstudio.common;

import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Turns every failure into the shared JSON error shape. Stack traces and internals never reach the client. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> invalid(MethodArgumentNotValidException ex) {
        List<ApiError.FieldIssue> issues = ex.getBindingResult().getFieldErrors().stream()
                .map((FieldError f) -> new ApiError.FieldIssue(f.getField(), f.getDefaultMessage() == null ? "is invalid" : f.getDefaultMessage()))
                .limit(20).toList();
        return ResponseEntity.badRequest().body(new ApiError("Please check the highlighted details and try again.", issues, null));
    }

    @ExceptionHandler(BusinessRuleException.class)
    ResponseEntity<ApiError> rule(BusinessRuleException ex) {
        return ResponseEntity.badRequest().body(ApiError.of(ex.getMessage()));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, IllegalArgumentException.class})
    ResponseEntity<ApiError> unreadable(Exception ex) {
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (t instanceof RequestTooLargeException) return tooLarge((RequestTooLargeException) t);
        }
        return ResponseEntity.badRequest().body(ApiError.of("The request could not be read."));
    }

    @ExceptionHandler(RateLimitExceededException.class)
    ResponseEntity<ApiError> tooMany(RateLimitExceededException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.retryAfterSeconds()))
                .body(ApiError.of("Too many requests. Please try again in a few minutes."));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiError> method(HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(ApiError.of("Method not allowed."));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ApiError> media(HttpMediaTypeNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(ApiError.of("Send the request as JSON."));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ApiError> notFound(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiError.of("Not found."));
    }

    @ExceptionHandler(NotFoundException.class)
    ResponseEntity<ApiError> missing(NotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiError.of("Not found."));
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiError> denied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiError.of("You do not have access to this."));
    }

    @ExceptionHandler(RequestTooLargeException.class)
    ResponseEntity<ApiError> tooLarge(RequestTooLargeException ex) {
        return ResponseEntity.status(HttpStatus.CONTENT_TOO_LARGE).body(ApiError.of("The request is too large."));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected(Exception ex) {
        String id = UUID.randomUUID().toString().substring(0, 8);
        log.error("Unhandled error [{}]", id, ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiError("Something went wrong on our side. Please try again.", null, id));
    }
}
