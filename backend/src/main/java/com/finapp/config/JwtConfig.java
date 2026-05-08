package com.finapp.config;

import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import javax.crypto.SecretKey;

@Configuration
public class JwtConfig {

    @Value("${jwt.secret:mySecretKeyMySecretKeyMySecretKeyMySecretKey}")
    private String secretKey;

    @Value("${jwt.expiration:86400000}") // 24 hours in milliseconds
    private long jwtExpiration;

    public SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public long getJwtExpiration() {
        return jwtExpiration;
    }
}
