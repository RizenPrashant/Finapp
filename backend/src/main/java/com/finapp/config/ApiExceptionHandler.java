package com.finapp.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * Lets the application's own error messages reach the caller.
 *
 * The services signal rejected operations by throwing a plain RuntimeException
 * with a message meant for a person — "Insufficient funds in HDFC Bank",
 * "No account named IDFC First Bank". With nothing handling them these came
 * back as a bodiless 403, so the reason never left the server and the UI could
 * only say that something had failed.
 *
 * Only a bare RuntimeException is translated. Anything more specific —
 * Spring Security's denials above all — is left to whoever already handles it,
 * so an authorisation failure is never reported as a bad request.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntime(RuntimeException e) throws RuntimeException {
        if (e.getClass() != RuntimeException.class) throw e;

        String message = e.getMessage() != null && !e.getMessage().isBlank()
                ? e.getMessage()
                : "Request could not be completed";

        return ResponseEntity.badRequest().body(Map.of(
                "message", message,
                "status", HttpStatus.BAD_REQUEST.value()));
    }
}
