package com.hospitrack.service;

import com.hospitrack.entity.AuditLog;
import com.hospitrack.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public AuditLog logEvent(String actorId, String actorRole, String actorName, String action, String targetEntity, String targetId, String details) {
        AuditLog auditLog = new AuditLog(null, actorId, actorRole, actorName, action, targetEntity, targetId, details);
        return auditLogRepository.save(auditLog);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getAllAuditLogs() {
        return auditLogRepository.findAllByOrderByTimestampDesc();
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsByRole(String role) {
        return auditLogRepository.findByActorRoleOrderByTimestampDesc(role);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> searchAuditLogs(String query) {
        if (query == null || query.trim().isEmpty()) {
            return auditLogRepository.findAllByOrderByTimestampDesc();
        }
        return auditLogRepository.findByActionContainingIgnoreCaseOrderByTimestampDesc(query.trim());
    }
}
