package com.hospitrack.service;

import com.hospitrack.dto.AssignDoctorRequest;
import com.hospitrack.dto.DoctorRequest;
import com.hospitrack.dto.DoctorUpdateRequest;
import com.hospitrack.entity.Doctor;
import com.hospitrack.entity.User;
import com.hospitrack.exception.BadRequestException;
import com.hospitrack.exception.DuplicateResourceException;
import com.hospitrack.exception.ResourceNotFoundException;
import com.hospitrack.repository.DoctorRepository;
import com.hospitrack.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public DoctorService(DoctorRepository doctorRepository, UserRepository userRepository, PasswordEncoder passwordEncoder, AuditService auditService) {
        this.doctorRepository = doctorRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<Doctor> getAllDoctors() {
        return doctorRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Doctor> getDoctorsByHospital(String hospitalId) {
        return doctorRepository.findByHospitalId(hospitalId);
    }

    @Transactional(readOnly = true)
    public Doctor getDoctorById(String id) {
        return doctorRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + id));
    }

    @Transactional
    public Doctor createDoctor(DoctorRequest request, String actorId, String actorRole, String actorName) {
        if (doctorRepository.findByLicenseNo(request.getLicenseNo()).isPresent()) {
            throw new DuplicateResourceException("Doctor with license number " + request.getLicenseNo() + " already exists.");
        }

        String id = "DOC-" + (200 + doctorRepository.count() + 1);
        Doctor doctor = new Doctor(
                id,
                request.getHospitalId(),
                request.getName(),
                request.getSpecialty(),
                request.getLicenseNo(),
                request.getEmail(),
                request.getPhone(),
                request.getExperienceYears()
        );

        Doctor saved = doctorRepository.save(doctor);

        // Provision User account for Doctor
        String email = request.getEmail().toLowerCase().trim();
        if (!userRepository.existsByEmailIgnoreCase(email)) {
            User doctorUser = new User();
            doctorUser.setId("USER-" + saved.getId());
            doctorUser.setName(saved.getName());
            doctorUser.setEmail(email);
            doctorUser.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            doctorUser.setRole(com.hospitrack.entity.Role.DOCTOR);
            doctorUser.setHospitalId(request.getHospitalId());
            doctorUser.setDoctorId(saved.getId());
            doctorUser.setPhone(request.getPhone());
            doctorUser.setStatus(com.hospitrack.entity.AccountStatus.ACTIVE);
            doctorUser.setEmailVerified(true);
            userRepository.save(doctorUser);
        }

        auditService.logEvent(actorId, actorRole, actorName, "CREATE_DOCTOR", "DOCTOR", saved.getId(), "Registered physician " + saved.getName() + " (" + saved.getSpecialty() + ", " + saved.getLicenseNo() + ")");
        return saved;
    }

    @Transactional
    public Doctor assignDoctorToHospital(String doctorId, AssignDoctorRequest request, String actorId, String actorRole, String actorName) {
        Doctor doctor = doctorRepository.findById(Objects.requireNonNull(doctorId))
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + doctorId));

        if (doctor.getHospitalId() != null && doctor.getHospitalId().equalsIgnoreCase(request.getHospitalId())) {
            throw new BadRequestException("Doctor already belongs to this hospital.");
        }

        String oldHospitalId = doctor.getHospitalId();
        doctor.setHospitalId(request.getHospitalId());
        if (request.getSpecialty() != null && !request.getSpecialty().trim().isEmpty()) {
            doctor.setSpecialty(request.getSpecialty().trim());
        }

        Doctor saved = doctorRepository.save(doctor);

        // Update corresponding User account hospitalId if exists
        userRepository.findByDoctorId(doctorId).ifPresent(u -> {
            u.setHospitalId(request.getHospitalId());
            userRepository.save(u);
        });

        auditService.logEvent(actorId, actorRole, actorName, "ASSIGN_DOCTOR", "DOCTOR", saved.getId(),
                "Assigned doctor " + saved.getName() + " (" + saved.getId() + ") from " + oldHospitalId + " to hospital " + saved.getHospitalId());

        return saved;
    }

    @Transactional
    public Doctor updateDoctor(String doctorId, DoctorUpdateRequest request, String actorId, String actorRole, String actorName) {
        Doctor doctor = doctorRepository.findById(Objects.requireNonNull(doctorId))
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + doctorId));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            doctor.setName(request.getName().trim());
        }
        if (request.getSpecialty() != null && !request.getSpecialty().trim().isEmpty()) {
            doctor.setSpecialty(request.getSpecialty().trim());
        }
        if (request.getPhone() != null) {
            doctor.setPhone(request.getPhone().trim());
        }
        if (request.getExperienceYears() != null && request.getExperienceYears() >= 0) {
            doctor.setExperienceYears(request.getExperienceYears());
        }
        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            doctor.setStatus(request.getStatus().trim().toUpperCase());
        }

        Doctor saved = doctorRepository.save(doctor);

        // Update corresponding User account
        userRepository.findByDoctorId(doctorId).ifPresent(u -> {
            if (request.getName() != null && !request.getName().trim().isEmpty()) {
                u.setName(request.getName().trim());
            }
            if (request.getPhone() != null) {
                u.setPhone(request.getPhone().trim());
            }
            if (request.getStatus() != null) {
                try {
                    u.setStatus(com.hospitrack.entity.AccountStatus.valueOf(request.getStatus().trim().toUpperCase()));
                } catch (Exception ignored) {}
            }
            userRepository.save(u);
        });

        auditService.logEvent(actorId, actorRole, actorName, "UPDATE_DOCTOR", "DOCTOR", saved.getId(),
                "Updated profile/status for doctor " + saved.getName() + " (" + saved.getId() + ")");

        return saved;
    }
}
