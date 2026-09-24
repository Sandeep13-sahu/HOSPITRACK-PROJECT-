package com.hospitrack.service;

import com.hospitrack.dto.PrescriptionRequest;
import com.hospitrack.entity.Prescription;
import com.hospitrack.entity.PrescriptionItem;
import com.hospitrack.exception.BadRequestException;
import com.hospitrack.exception.PrescriptionSafetyViolationException;
import com.hospitrack.exception.ResourceNotFoundException;
import com.hospitrack.repository.PrescriptionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final AuditService auditService;

    public PrescriptionService(PrescriptionRepository prescriptionRepository, AuditService auditService) {
        this.prescriptionRepository = prescriptionRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<Prescription> getPrescriptionsByPatient(String patientId) {
        return prescriptionRepository.findByPatientIdOrderByPrescribedAtDesc(patientId);
    }

    @Transactional(readOnly = true)
    public Prescription getPrescriptionById(String id) {
        return prescriptionRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found: " + id));
    }

    @Transactional
    public Prescription createPrescription(PrescriptionRequest request, String actorId, String actorRole, String actorName) {
        if (request.getMedicines() == null || request.getMedicines().isEmpty()) {
            throw new BadRequestException("Prescription must contain at least one medicine.");
        }

        // Duplicate medicine safety enforcement rule
        Set<String> seenNames = new HashSet<>();
        for (PrescriptionRequest.MedicineItemDto item : request.getMedicines()) {
            String normalizedName = item.getName() != null ? item.getName().trim().toLowerCase() : "";
            if (seenNames.contains(normalizedName)) {
                throw new PrescriptionSafetyViolationException(
                        "CRITICAL PRESCRIPTION SAFETY RULE VIOLATION: Duplicate medicine '" + item.getName() + "' detected within this prescription. Each medication item in a single prescription order must be unique."
                );
            }
            seenNames.add(normalizedName);
        }

        String id = "RX-" + (800 + prescriptionRepository.count() + 1);
        Prescription prescription = new Prescription(
                id,
                request.getVisitId(),
                request.getPatientId(),
                request.getDoctorId(),
                request.getHospitalId(),
                LocalDateTime.now()
        );

        for (PrescriptionRequest.MedicineItemDto itemDto : request.getMedicines()) {
            PrescriptionItem item = new PrescriptionItem(
                    itemDto.getName(),
                    itemDto.getDosage(),
                    itemDto.getFrequency(),
                    itemDto.getDuration(),
                    itemDto.getInstructions()
            );
            prescription.addItem(item);
        }

        Prescription saved = prescriptionRepository.save(prescription);

        StringBuilder medSummary = new StringBuilder();
        for (int i = 0; i < request.getMedicines().size(); i++) {
            if (i > 0) medSummary.append(", ");
            PrescriptionRequest.MedicineItemDto m = request.getMedicines().get(i);
            medSummary.append(m.getName()).append(" (").append(m.getDosage()).append(")");
        }

        auditService.logEvent(actorId, actorRole, actorName, "CREATE_PRESCRIPTION", "PRESCRIPTION", saved.getId(),
                "Issued prescription " + saved.getId() + " for " + saved.getPatientId() + ": " + medSummary);

        return saved;
    }
}
