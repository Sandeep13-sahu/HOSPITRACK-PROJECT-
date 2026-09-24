package com.hospitrack.repository;

import com.hospitrack.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, String> {
    List<AuditLog> findAllByOrderByTimestampDesc();
    List<AuditLog> findByActorRoleOrderByTimestampDesc(String actorRole);
    List<AuditLog> findByActionContainingIgnoreCaseOrderByTimestampDesc(String action);
}
