package com.hospitrack.controller;

import com.hospitrack.dto.ApiResponse;
import com.hospitrack.dto.PatientRequest;
import com.hospitrack.dto.VisitRequest;
import com.hospitrack.entity.LabReport;
import com.hospitrack.entity.Patient;
import com.hospitrack.entity.Prescription;
import com.hospitrack.entity.Visit;
import com.hospitrack.repository.LabReportRepository;
import com.hospitrack.repository.VisitRepository;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.AuditService;
import com.hospitrack.service.PatientService;
import com.hospitrack.service.PrescriptionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientService patientService;
    private final VisitRepository visitRepository;
    private final PrescriptionService prescriptionService;
    private final LabReportRepository labReportRepository;
    private final AuditService auditService;

    public PatientController(
            PatientService patientService,
            VisitRepository visitRepository,
            PrescriptionService prescriptionService,
            LabReportRepository labReportRepository,
            AuditService auditService
    ) {
        this.patientService = patientService;
        this.visitRepository = visitRepository;
        this.prescriptionService = prescriptionService;
        this.labReportRepository = labReportRepository;
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Patient>>> getPatients(
            @RequestParam(required = false) String hospitalId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<Patient> patients;
        if (principal.getRole() == com.hospitrack.entity.Role.PATIENT) {
            patients = List.of(patientService.getPatientById(principal.getPatientId()));
        } else if (hospitalId != null && !hospitalId.isEmpty()) {
            patients = patientService.getPatientsByHospital(hospitalId);
        } else if (principal.getRole() == com.hospitrack.entity.Role.HOSPITAL_ADMIN && principal.getHospitalId() != null) {
            patients = patientService.getPatientsByHospital(principal.getHospitalId());
        } else if (principal.getRole() == com.hospitrack.entity.Role.DOCTOR && principal.getHospitalId() != null) {
            patients = patientService.getPatientsByHospital(principal.getHospitalId());
        } else {
            patients = patientService.getAllPatients();
        }
        return ResponseEntity.ok(ApiResponse.success("Patients retrieved.", patients));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@dataGuard.canAccessPatient(#id)")
    public ResponseEntity<ApiResponse<Patient>> getPatientById(@PathVariable String id) {
        Patient patient = patientService.getPatientById(id);
        return ResponseEntity.ok(ApiResponse.success("Patient retrieved.", patient));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('HOSPITAL_ADMIN') or hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<Patient>> registerPatient(
            @Valid @RequestBody PatientRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (request.getCurrentHospitalId() == null && principal.getHospitalId() != null) {
            request.setCurrentHospitalId(principal.getHospitalId());
        }
        Patient created = patientService.registerPatient(request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Patient registered successfully.", created));
    }

    @PutMapping("/{id}/discharge")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canAccessPatient(#id)) or hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<Patient>> dischargePatient(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Patient discharged = patientService.dischargePatient(id, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Patient discharged successfully.", discharged));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@dataGuard.canAccessPatient(#id)")
    public ResponseEntity<ApiResponse<Patient>> updatePatient(
            @PathVariable String id,
            @Valid @RequestBody com.hospitrack.dto.PatientUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Patient updated = patientService.updatePatient(id, request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully.", updated));
    }

    @GetMapping("/{id}/timeline")
    @PreAuthorize("@dataGuard.canAccessPatient(#id)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPatientTimeline(@PathVariable String id) {
        Patient patient = patientService.getPatientById(id);
        List<Visit> visits = visitRepository.findByPatientIdOrderByVisitDateDesc(id);
        List<Prescription> prescriptions = prescriptionService.getPrescriptionsByPatient(id);
        List<LabReport> reports = labReportRepository.findByPatientIdOrderByReportDateDesc(id);

        Map<String, Object> timeline = new HashMap<>();
        timeline.put("patient", patient);
        timeline.put("visits", visits);
        timeline.put("prescriptions", prescriptions);
        timeline.put("reports", reports);

        return ResponseEntity.ok(ApiResponse.success("Patient timeline retrieved.", timeline));
    }

    @PostMapping("/{id}/visits")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<Visit>> logVisit(
            @PathVariable String id,
            @Valid @RequestBody VisitRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String doctorId = request.getDoctorId() != null ? request.getDoctorId() : principal.getDoctorId();
        String hospitalId = request.getHospitalId() != null ? request.getHospitalId() : principal.getHospitalId();

        String visitId = "VISIT-" + (500 + visitRepository.count() + 1);
        Visit visit = new Visit(
                visitId,
                id,
                doctorId,
                hospitalId,
                LocalDateTime.now(),
                request.getSymptoms(),
                request.getDiagnosis(),
                request.getTreatment(),
                request.getNotes()
        );
        Visit saved = visitRepository.save(visit);

        auditService.logEvent(principal.getId(), principal.getRole().name(), principal.getName(),
                "LOG_VISIT", "VISIT", saved.getId(), "Logged clinical consultation for " + id + ": " + saved.getDiagnosis());

        return ResponseEntity.ok(ApiResponse.success("Clinical visit recorded.", saved));
    }
}
