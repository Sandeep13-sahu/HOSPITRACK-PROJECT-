package com.hospitrack.service;

import com.hospitrack.dto.HospitalRequest;
import com.hospitrack.entity.Hospital;
import com.hospitrack.exception.BadRequestException;
import com.hospitrack.exception.DuplicateResourceException;
import com.hospitrack.exception.ResourceNotFoundException;
import com.hospitrack.repository.HospitalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
public class HospitalService {

    private final HospitalRepository hospitalRepository;
    private final com.hospitrack.repository.UserRepository userRepository;
    private final AuditService auditService;

    public HospitalService(HospitalRepository hospitalRepository, com.hospitrack.repository.UserRepository userRepository, AuditService auditService) {
        this.hospitalRepository = hospitalRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<Hospital> getAllHospitals() {
        return hospitalRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Hospital getHospitalById(String id) {
        return hospitalRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Hospital not found: " + id));
    }

    @Transactional
    public Hospital createHospital(HospitalRequest request, String actorId, String actorRole, String actorName) {
        if (hospitalRepository.existsByCode(request.getCode())) {
            throw new DuplicateResourceException("Hospital with code " + request.getCode() + " already exists.");
        }

        String id = "HOSP-" + (100 + hospitalRepository.count() + 1);
        Hospital hospital = new Hospital(
                id,
                request.getName(),
                request.getCode(),
                request.getLocation(),
                request.getContact(),
                request.getEmail(),
                request.getTotalBeds(),
                request.getAvailableBeds()
        );

        Hospital saved = hospitalRepository.save(hospital);
        auditService.logEvent(actorId, actorRole, actorName, "CREATE_HOSPITAL", "HOSPITAL", saved.getId(), "Onboarded " + saved.getName() + " (" + saved.getCode() + ") with " + saved.getTotalBeds() + " beds.");
        return saved;
    }

    @Transactional
    public Hospital updateBedCapacity(String id, int availableBeds, String actorId, String actorRole, String actorName) {
        Hospital hospital = getHospitalById(id);
        if (availableBeds < 0) {
            throw new BadRequestException("Available beds cannot be negative.");
        }
        if (availableBeds > hospital.getTotalBeds()) {
            throw new BadRequestException("Available beds cannot exceed total beds.");
        }
        int oldBeds = hospital.getAvailableBeds();
        hospital.setAvailableBeds(availableBeds);
        Hospital saved = hospitalRepository.save(hospital);
        auditService.logEvent(actorId, actorRole, actorName, "UPDATE_BEDS", "HOSPITAL", saved.getId(), "Updated available beds from " + oldBeds + " to " + availableBeds);
        return saved;
    }

    @Transactional
    public Hospital updateHospitalDetails(String id, com.hospitrack.dto.HospitalUpdateRequest request, String actorId, String actorRole, String actorName) {
        Hospital hospital = getHospitalById(id);

        hospital.setName(request.getName());
        hospital.setLocation(request.getLocation());
        hospital.setContact(request.getContact());
        if (request.getEmail() != null) {
            hospital.setEmail(request.getEmail());
        }
        if (request.getTotalBeds() != null) {
            if (request.getTotalBeds() < 0) {
                throw new BadRequestException("Total beds cannot be negative.");
            }
            hospital.setTotalBeds(request.getTotalBeds());
        }
        if (request.getAvailableBeds() != null) {
            if (request.getAvailableBeds() < 0) {
                throw new BadRequestException("Available beds cannot be negative.");
            }
            hospital.setAvailableBeds(request.getAvailableBeds());
        }

        if (hospital.getAvailableBeds() > hospital.getTotalBeds()) {
            throw new BadRequestException("Available beds cannot exceed total beds.");
        }

        Hospital saved = hospitalRepository.save(hospital);

        auditService.logEvent(actorId, actorRole, actorName, "UPDATE_HOSPITAL_PROFILE", "HOSPITAL", saved.getId(),
                "Updated facility details for hospital " + saved.getName() + " (" + saved.getId() + ")");

        return saved;
    }

    @Transactional
    public Hospital updateHospitalStatus(String id, String status, String reason, String actorId, String actorRole, String actorName) {
        Hospital hospital = getHospitalById(id);
        String oldStatus = hospital.getStatus();
        hospital.setStatus(status.toUpperCase().trim());
        Hospital saved = hospitalRepository.save(hospital);

        // Sync hospital users
        List<com.hospitrack.entity.User> users = userRepository.findByHospitalId(id);
        com.hospitrack.entity.AccountStatus targetStatus = "ACTIVE".equalsIgnoreCase(status) ? com.hospitrack.entity.AccountStatus.ACTIVE :
                ("SUSPENDED".equalsIgnoreCase(status) ? com.hospitrack.entity.AccountStatus.SUSPENDED : com.hospitrack.entity.AccountStatus.DISABLED);
        for (com.hospitrack.entity.User u : users) {
            u.setStatus(targetStatus);
            userRepository.save(u);
        }

        String desc = "Changed status of " + hospital.getName() + " (" + hospital.getId() + ") from " + oldStatus + " to " + status;
        if (reason != null && !reason.trim().isEmpty()) {
            desc += ". Reason: " + reason.trim();
        }

        auditService.logEvent(actorId, actorRole, actorName, "UPDATE_HOSPITAL_STATUS", "HOSPITAL", saved.getId(), desc);
        return saved;
    }
}
