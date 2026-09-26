package com.finapp.config;

import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import javax.crypto.SecretKey;

@Configuration
public class JwtConfig {

    // No inline default. A missing secret must stop the application, not fall
    // back to a literal that is readable by anyone with the source.
    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration:86400000}") // 24 hours in milliseconds
    private long jwtExpiration;

    /**
     * Fail at startup, not at the first login.
     *
     * An absent property already stops the context, but a blank or malformed
     * one resolves fine and only blows up when a token is first signed — by
     * which point the application looks healthy and users are hitting errors.
     */
    @PostConstruct
    void validateSecret() {
        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException(
                "jwt.secret is not set. Put it in application-{dev,prod}.properties "
                + "or the JWT_SECRET environment variable — see SETUP.md.");
        }
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secretKey);
        } catch (RuntimeException e) {
            throw new IllegalStateException("jwt.secret must be Base64. Generate one with: openssl rand -base64 32", e);
        }
        // HS256 needs a key at least as long as its output.
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                "jwt.secret decodes to " + keyBytes.length + " bytes; HS256 requires at least 32. "
                + "Generate one with: openssl rand -base64 32");
        }
    }

    public SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public long getJwtExpiration() {
        return jwtExpiration;
    }
}
