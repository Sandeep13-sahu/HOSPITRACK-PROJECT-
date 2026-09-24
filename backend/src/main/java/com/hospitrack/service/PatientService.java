package com.hospitrack.service;

import com.hospitrack.dto.PatientRequest;
import com.hospitrack.entity.Hospital;
import com.hospitrack.entity.Patient;
import com.hospitrack.exception.ResourceNotFoundException;
import com.hospitrack.repository.HospitalRepository;
import com.hospitrack.repository.PatientRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
public class PatientService {

    private final PatientRepository patientRepository;
    private final HospitalRepository hospitalRepository;
    private final com.hospitrack.repository.UserRepository userRepository;
    private final AuditService auditService;

    public PatientService(PatientRepository patientRepository, HospitalRepository hospitalRepository, com.hospitrack.repository.UserRepository userRepository, AuditService auditService) {
        this.patientRepository = patientRepository;
        this.hospitalRepository = hospitalRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<Patient> getAllPatients() {
        return patientRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Patient> getPatientsByHospital(String hospitalId) {
        return patientRepository.findByCurrentHospitalId(hospitalId);
    }

    @Transactional(readOnly = true)
    public List<Patient> getPatientsByDoctor(String doctorId) {
        return patientRepository.findByPrimaryDoctorId(doctorId);
    }

    @Transactional(readOnly = true)
    public Patient getPatientById(String id) {
        return patientRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + id));
    }

    @Transactional
    public Patient registerPatient(PatientRequest request, String actorId, String actorRole, String actorName) {
        String hospitalId = request.getCurrentHospitalId();
        Hospital hospital = hospitalRepository.findById(Objects.requireNonNull(hospitalId))
                .orElseThrow(() -> new ResourceNotFoundException("Hospital not found: " + hospitalId));

        String id = "PAT-" + (300 + patientRepository.count() + 1);
        Patient patient = new Patient(
                id,
                request.getName(),
                request.getGender(),
                request.getAge(),
                request.getBloodGroup(),
                request.getContact(),
                request.getEmail(),
                request.getAddress(),
                request.getEmergencyContact(),
                hospitalId,
                request.getPrimaryDoctorId()
        );

        Patient saved = patientRepository.save(patient);

        // Bed math: decrement available beds
        if (hospital.getAvailableBeds() > 0) {
            hospital.setAvailableBeds(hospital.getAvailableBeds() - 1);
            hospitalRepository.save(hospital);
        }

        auditService.logEvent(actorId, actorRole, actorName, "REGISTER_PATIENT", "PATIENT", saved.getId(),
                "Admitted patient " + saved.getName() + " (" + saved.getBloodGroup() + ", " + saved.getAge() + " yrs) to " + hospital.getName());

        return saved;
    }

    @Transactional
    public Patient updatePatient(String id, com.hospitrack.dto.PatientUpdateRequest request, String actorId, String actorRole, String actorName) {
        Patient patient = getPatientById(id);

        patient.setName(request.getName());
        patient.setGender(request.getGender());
        patient.setAge(request.getAge());
        if (request.getBloodGroup() != null && !request.getBloodGroup().isBlank()) {
            patient.setBloodGroup(request.getBloodGroup());
        }
        patient.setContact(request.getContact());
        if (request.getEmail() != null) {
            patient.setEmail(request.getEmail());
        }
        if (request.getAddress() != null) {
            patient.setAddress(request.getAddress());
        }
        if (request.getEmergencyContact() != null) {
            patient.setEmergencyContact(request.getEmergencyContact());
        }

        Patient saved = patientRepository.save(patient);

        // Synchronize linked User account if exists
        try {
            userRepository.findByPatientId(id).ifPresent(user -> {
                user.setName(request.getName());
                user.setPhone(request.getContact());
                if (request.getEmail() != null && !request.getEmail().isBlank()) {
                    user.setEmail(request.getEmail());
                }
                userRepository.save(user);
            });
        } catch (Exception e) {
            // Ignore synchronization errors if any
        }

        auditService.logEvent(actorId, actorRole, actorName, "UPDATE_PATIENT_PROFILE", "PATIENT", saved.getId(),
                "Updated personal and clinical contact profile for patient " + saved.getName() + " (" + saved.getId() + ")");

        return saved;
    }

    @Transactional
    public Patient dischargePatient(String id, String actorId, String actorRole, String actorName) {
        Patient patient = getPatientById(id);
        patient.setStatus("DISCHARGED");
        patient.setDischargedAt(LocalDateTime.now());
        Patient saved = patientRepository.save(patient);

        // Bed math: restore available bed
        if (patient.getCurrentHospitalId() != null) {
            hospitalRepository.findById(Objects.requireNonNull(patient.getCurrentHospitalId())).ifPresent(h -> {
                h.setAvailableBeds(h.getAvailableBeds() + 1);
                hospitalRepository.save(h);
            });
        }

        auditService.logEvent(actorId, actorRole, actorName, "DISCHARGE_PATIENT", "PATIENT", saved.getId(),
                "Discharged patient " + saved.getName() + " from inpatient care");

        return saved;
    }
}
