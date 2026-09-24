package com.hospitrack;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospitrack.dto.ResetPasswordRequest;
import com.hospitrack.dto.VerifyEmailRequest;
import com.hospitrack.entity.EmailVerificationToken;
import com.hospitrack.entity.PasswordResetToken;
import com.hospitrack.entity.Role;
import com.hospitrack.entity.User;
import com.hospitrack.repository.EmailVerificationTokenRepository;
import com.hospitrack.repository.PasswordResetTokenRepository;
import com.hospitrack.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings("null")
public class EmailAndTokenSecurityTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailVerificationTokenRepository verificationTokenRepository;

    @Autowired
    private PasswordResetTokenRepository resetTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private User unverifiedUser;

    @BeforeEach
    void setUp() {
        if (!userRepository.existsByEmailIgnoreCase("unverified.nurse@hospitrack.com")) {
            unverifiedUser = new User("USER-UNV-01", "Nurse Unverified", "unverified.nurse@hospitrack.com", passwordEncoder.encode("NursePass123!"), Role.HOSPITAL_ADMIN);
            unverifiedUser.setEmailVerified(false);
            userRepository.save(unverifiedUser);
        } else {
            unverifiedUser = userRepository.findByEmailIgnoreCase("unverified.nurse@hospitrack.com").orElseThrow();
        }
    }

    private String sha256(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    @DisplayName("[1] Email Verification: Raw token verified against stored hash, single-use enforced")
    void testEmailVerificationFlow() throws Exception {
        String rawToken = "raw-verification-token-xyz-123";
        String tokenHash = sha256(rawToken);

        verificationTokenRepository.deleteByUserId(unverifiedUser.getId());
        EmailVerificationToken evt = new EmailVerificationToken(unverifiedUser.getId(), tokenHash, LocalDateTime.now().plusHours(24));
        verificationTokenRepository.save(evt);

        VerifyEmailRequest req = new VerifyEmailRequest(rawToken);

        // 1st verification attempt: SUCCEEDS
        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        User refreshed = userRepository.findById(unverifiedUser.getId()).orElseThrow();
        assertTrue(refreshed.isEmailVerified(), "User emailVerified flag must be true");

        // 2nd verification attempt (Replay / Reuse): FAILS
        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("already been used")));
    }

    @Test
    @DisplayName("[2] Password Reset: Single-use hashed token resets password, old password invalid")
    void testPasswordResetFlow() throws Exception {
        String rawResetToken = "raw-password-reset-token-abc-999";
        String tokenHash = sha256(rawResetToken);

        resetTokenRepository.deleteByUserId(unverifiedUser.getId());
        PasswordResetToken prt = new PasswordResetToken(unverifiedUser.getId(), tokenHash, LocalDateTime.now().plusHours(1));
        resetTokenRepository.save(prt);

        ResetPasswordRequest req = new ResetPasswordRequest();
        req.setToken(rawResetToken);
        req.setNewPassword("BrandNewSecret2026!");

        // 1st reset: SUCCEEDS
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        User updatedUser = userRepository.findById(unverifiedUser.getId()).orElseThrow();
        assertTrue(passwordEncoder.matches("BrandNewSecret2026!", updatedUser.getPasswordHash()), "New password must match");
        assertFalse(passwordEncoder.matches("NursePass123!", updatedUser.getPasswordHash()), "Old password must no longer match");

        // 2nd reset with same token (Replay / Reuse): FAILS
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
