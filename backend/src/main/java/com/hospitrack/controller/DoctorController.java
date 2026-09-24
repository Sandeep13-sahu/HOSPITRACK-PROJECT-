package com.hospitrack.controller;

import com.hospitrack.dto.ApiResponse;
import com.hospitrack.dto.DoctorRequest;
import com.hospitrack.entity.Doctor;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.DoctorService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {

    private final DoctorService doctorService;

    public DoctorController(DoctorService doctorService) {
        this.doctorService = doctorService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Doctor>>> getDoctors(
            @RequestParam(required = false) String hospitalId
    ) {
        List<Doctor> doctors;
        if (hospitalId != null && !hospitalId.isEmpty()) {
            doctors = doctorService.getDoctorsByHospital(hospitalId);
        } else {
            doctors = doctorService.getAllDoctors();
        }
        return ResponseEntity.ok(ApiResponse.success("Doctors retrieved successfully.", doctors));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Doctor>> getDoctorById(@PathVariable String id) {
        Doctor doctor = doctorService.getDoctorById(id);
        return ResponseEntity.ok(ApiResponse.success("Doctor retrieved.", doctor));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canManageHospital(#request.hospitalId))")
    public ResponseEntity<ApiResponse<Doctor>> createDoctor(
            @Valid @RequestBody DoctorRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Doctor created = doctorService.createDoctor(request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Doctor registered successfully.", created));
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canManageHospital(#request.hospitalId))")
    public ResponseEntity<ApiResponse<Doctor>> assignDoctor(
            @PathVariable String id,
            @Valid @RequestBody com.hospitrack.dto.AssignDoctorRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Doctor updated = doctorService.assignDoctorToHospital(id, request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Doctor assigned to hospital successfully.", updated));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canAccessDoctor(#id)) or (hasRole('DOCTOR') and @dataGuard.canOperateAsDoctor(#id))")
    public ResponseEntity<ApiResponse<Doctor>> updateDoctor(
            @PathVariable String id,
            @Valid @RequestBody com.hospitrack.dto.DoctorUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Doctor updated = doctorService.updateDoctor(id, request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Doctor details updated successfully.", updated));
    }
}
