package com.finapp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendPasswordResetOtp(String toEmail, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(toEmail);
        message.setSubject("Finapp - Password Reset OTP");
        message.setText(
            "Hello,\n\n" +
            "Your OTP for password reset is:\n\n" +
            "  " + otp + "\n\n" +
            "This OTP is valid for 15 minutes.\n\n" +
            "If you did not request this, please ignore this email.\n\n" +
            "— Finapp Team"
        );
        mailSender.send(message);
    }
}
