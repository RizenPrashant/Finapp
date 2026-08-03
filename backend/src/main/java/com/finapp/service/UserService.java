package com.finapp.service;

import com.finapp.model.PasswordResetToken;
import com.finapp.model.User;
import com.finapp.repository.PasswordResetTokenRepository;
import com.finapp.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Random;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       PasswordResetTokenRepository tokenRepository, EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenRepository = tokenRepository;
        this.emailService = emailService;
    }

    public User getCurrentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public void changePassword(Authentication authentication, String currentPassword, String newPassword) {
        User user = getCurrentUser(authentication);
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional
    public void forgotPassword(String email) {
        if (!userRepository.existsByEmail(email)) {
            throw new RuntimeException("No account found with this email address");
        }

        tokenRepository.deleteAllByEmail(email);

        String otp = String.format("%06d", new Random().nextInt(999999));
        PasswordResetToken token = new PasswordResetToken(otp, email, LocalDateTime.now().plusMinutes(15));
        tokenRepository.save(token);

        emailService.sendPasswordResetOtp(email, otp);
        System.out.println("[Finapp] OTP sent to: " + email);
    }

    @Transactional
    public void resetPassword(String email, String otp, String newPassword) {
        PasswordResetToken token = tokenRepository.findByToken(otp)
                .orElseThrow(() -> new RuntimeException("Invalid OTP"));

        if (!token.getEmail().equals(email)) throw new RuntimeException("Invalid OTP");
        if (token.isExpired()) throw new RuntimeException("OTP has expired");
        if (token.isUsed()) throw new RuntimeException("OTP already used");

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        token.setUsed(true);
        tokenRepository.save(token);
    }
}
