package com.finapp.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

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

    /**
     * Say that the file is too big, rather than that access is denied.
     *
     * Left alone, an oversized upload is resolved by Spring's default
     * handler, which forwards to /error. That dispatch does not carry the
     * Authorization header, so the security filter sees an anonymous request
     * and answers 403 — and an import of a perfectly valid statement looked
     * like a login problem. Handling it here writes the real reason straight
     * back, with no forward for the credentials to be lost on.
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleTooLarge(MaxUploadSizeExceededException e) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(Map.of(
                "message", "That file is too large to upload. The limit is 25MB.",
                "status", HttpStatus.PAYLOAD_TOO_LARGE.value()));
    }

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
