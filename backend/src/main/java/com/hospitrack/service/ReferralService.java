package com.hospitrack.service;

import com.hospitrack.dto.ReferralRequest;
import com.hospitrack.entity.Referral;
import com.hospitrack.exception.ResourceNotFoundException;
import com.hospitrack.repository.ReferralRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
public class ReferralService {

    private final ReferralRepository referralRepository;
    private final AuditService auditService;

    public ReferralService(ReferralRepository referralRepository, AuditService auditService) {
        this.referralRepository = referralRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<Referral> getAllReferrals() {
        return referralRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Referral getReferralById(String id) {
        return referralRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Referral not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<Referral> getReferralsByHospital(String hospitalId) {
        return referralRepository.findByFromHospitalIdOrToHospitalIdOrderByCreatedAtDesc(hospitalId, hospitalId);
    }

    @Transactional(readOnly = true)
    public List<Referral> getReferralsByPatient(String patientId) {
        return referralRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
    }

    @Transactional
    public Referral createReferral(ReferralRequest request, String actorId, String actorRole, String actorName) {
        String id = "REF-" + (400 + referralRepository.count() + 1);
        Referral referral = new Referral(
                id,
                request.getPatientId(),
                request.getFromHospitalId(),
                request.getToHospitalId(),
                request.getDoctorId(),
                request.getReason(),
                request.getPriority(),
                "PENDING",
                request.getNotes()
        );

        Referral saved = referralRepository.save(referral);
        auditService.logEvent(actorId, actorRole, actorName, "CREATE_REFERRAL", "REFERRAL", saved.getId(),
                "Created " + saved.getPriority() + " referral for " + saved.getPatientId() + " to " + saved.getToHospitalId() + ": " + saved.getReason());

        return saved;
    }

    @Transactional
    public Referral updateStatus(String id, String status, String actorId, String actorRole, String actorName) {
        Referral referral = referralRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Referral not found: " + id));

        referral.setStatus(status);
        referral.setUpdatedAt(LocalDateTime.now());
        Referral saved = referralRepository.save(referral);

        auditService.logEvent(actorId, actorRole, actorName, "UPDATE_REFERRAL_STATUS", "REFERRAL", saved.getId(),
                "Updated referral status to " + status);

        return saved;
    }
}
