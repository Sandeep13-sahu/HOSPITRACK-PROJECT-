package com.hospitrack.controller;

import com.hospitrack.dto.*;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response
    ) {
        AuthResponse authResponse = authService.login(request);

        // Optionally set HttpOnly cookie for web security
        Cookie cookie = new Cookie("hospitrack_token", authResponse.getAccessToken());
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge((int) (authResponse.getExpiresInMs() / 1000));
        response.addCookie(cookie);

        return ResponseEntity.ok(ApiResponse.success("Authentication successful.", authResponse));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserDto>> register(@Valid @RequestBody RegisterRequest request) {
        if (request.getRole() == com.hospitrack.entity.Role.SUPER_ADMIN) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Registration for SUPER_ADMIN role is strictly prohibited."));
        }
        ApiResponse<UserDto> response = authService.register(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register/patient")
    public ResponseEntity<ApiResponse<UserDto>> registerPatient(@Valid @RequestBody RegisterRequest request) {
        ApiResponse<UserDto> response = authService.registerPatient(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register/hospital")
    public ResponseEntity<ApiResponse<UserDto>> registerHospital(@Valid @RequestBody RegisterRequest request) {
        ApiResponse<UserDto> response = authService.registerHospital(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<String>> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        ApiResponse<String> response = authService.verifyEmail(request.getToken());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        ApiResponse<String> response = authService.forgotPassword(request.getEmail());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        ApiResponse<String> response = authService.resetPassword(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@RequestBody TokenRefreshRequest request) {
        AuthResponse authResponse = authService.refreshToken(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success("Token refreshed successfully.", authResponse));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthenticated."));
        }
        UserDto userDto = authService.getCurrentUserDto(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Current user profile retrieved.", userDto));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserDto>> updateProfile(
            @Valid @RequestBody UserProfileUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthenticated."));
        }
        ApiResponse<UserDto> response = authService.updateProfile(principal.getId(), request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/profile/photo")
    public ResponseEntity<ApiResponse<UserDto>> updateProfilePhoto(
            @Valid @RequestBody ProfilePhotoRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthenticated."));
        }
        ApiResponse<UserDto> response = authService.updateProfilePhoto(principal.getId(), request.getPhoto());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/profile/photo")
    public ResponseEntity<ApiResponse<UserDto>> removeProfilePhoto(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthenticated."));
        }
        ApiResponse<UserDto> response = authService.removeProfilePhoto(principal.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<String>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthenticated."));
        }
        ApiResponse<String> response = authService.changePassword(principal.getId(), request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody(required = false) TokenRefreshRequest request,
            HttpServletResponse response
    ) {
        String userId = principal != null ? principal.getId() : null;
        String refreshToken = request != null ? request.getRefreshToken() : null;
        ApiResponse<String> apiResponse = authService.logout(userId, refreshToken);

        // Clear cookie
        Cookie cookie = new Cookie("hospitrack_token", null);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);

        return ResponseEntity.ok(apiResponse);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "UP");
        status.put("service", "hospitrack-backend");
        status.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(status);
    }
}
