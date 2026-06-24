package com.aiuigenerator.bff.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@Service
public class EmailVerificationService {

    private final JavaMailSender mailSender;
    private final KeycloakAdminService keycloakAdmin;

    // token → email, auto-expires after 24h
    private final ConcurrentHashMap<String, String> tokens = new ConcurrentHashMap<>();

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.bff-url:http://localhost:8081}")
    private String bffUrl;

    @Value("${spring.mail.from:${spring.mail.username:noreply@talanted.io}}")
    private String fromEmail;

    public EmailVerificationService(JavaMailSender mailSender, KeycloakAdminService keycloakAdmin) {
        this.mailSender = mailSender;
        this.keycloakAdmin = keycloakAdmin;
    }

    /** Send verification email and return the token (for testing/logging). */
    public void sendVerificationEmail(String email) {
        String token = UUID.randomUUID().toString();
        tokens.put(token, email);

        // Auto-expire token after 24 hours
        Executors.newSingleThreadScheduledExecutor()
                .schedule(() -> tokens.remove(token), 24, TimeUnit.HOURS);

        String verifyLink = bffUrl + "/api/users/public/verify-email?token=" + token;

        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject("Verify your Talanted account");
            helper.setText(buildEmailHtml(verifyLink), true);
            mailSender.send(msg);
        } catch (Exception e) {
            // Non-blocking — registration still succeeds even if email fails
            System.err.println("[EmailVerification] Failed to send email to " + email + ": " + e.getMessage());
        }
    }

    /**
     * Verify a token: set emailVerified=true via admin API and return the user's email,
     * or null if the token is invalid/expired.
     */
    public String verifyToken(String token) throws Exception {
        String email = tokens.remove(token);
        if (email == null) return null;

        // Find user by email and force-verify via admin API
        keycloakAdmin.forceVerifyEmail(email);
        return email;
    }

    private String buildEmailHtml(String link) {
        return "<!DOCTYPE html><html><body style='margin:0;padding:0;background:#070b19;font-family:Inter,sans-serif;'>" +
               "<div style='max-width:520px;margin:40px auto;background:#1e2640;border-radius:8px;border:1px solid rgba(71,85,105,0.5);padding:40px;'>" +
               "<div style='display:flex;align-items:center;gap:8px;margin-bottom:32px;'>" +
               "<span style='font-size:26px;font-weight:700;color:#fff;'>Talanted</span>" +
               "<span style='width:22px;height:5px;background:#7c3aed;border-radius:2px;display:inline-block;margin-top:10px;'></span>" +
               "</div>" +
               "<h1 style='font-size:22px;font-weight:600;color:#fff;margin:0 0 12px;'>Verify your email address</h1>" +
               "<p style='font-size:14px;color:#94a3b8;line-height:1.6;margin:0 0 28px;'>Click the button below to confirm your email and activate your Talanted account.</p>" +
               "<a href='" + link + "' style='display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 28px;border-radius:6px;font-size:15px;font-weight:700;'>Verify my email address →</a>" +
               "<p style='font-size:12px;color:#64748b;margin-top:28px;'>This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>" +
               "</div></body></html>";
    }
}
