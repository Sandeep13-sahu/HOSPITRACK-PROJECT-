package com.hospitrack.controller;

import com.hospitrack.dto.ApiResponse;
import com.hospitrack.entity.AuditLog;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('HOSPITAL_ADMIN')")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getAuditLogs(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<AuditLog> logs;
        if (principal.getRole() == com.hospitrack.entity.Role.SUPER_ADMIN) {
            if (role != null && !role.isEmpty() && !"ALL".equalsIgnoreCase(role)) {
                logs = auditService.getAuditLogsByRole(role);
            } else if (search != null && !search.isEmpty()) {
                logs = auditService.searchAuditLogs(search);
            } else {
                logs = auditService.getAllAuditLogs();
            }
        } else {
            logs = auditService.getAuditLogsByRole(principal.getRole().name());
        }

        return ResponseEntity.ok(ApiResponse.success("Audit records retrieved.", logs));
    }
}
