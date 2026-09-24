package com.hospitrack.controller;

import com.hospitrack.dto.ApiResponse;
import com.hospitrack.dto.HospitalRequest;
import com.hospitrack.entity.Hospital;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.HospitalService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/hospitals")
public class HospitalController {

    private final HospitalService hospitalService;

    public HospitalController(HospitalService hospitalService) {
        this.hospitalService = hospitalService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Hospital>>> getAllHospitals() {
        List<Hospital> hospitals = hospitalService.getAllHospitals();
        return ResponseEntity.ok(ApiResponse.success("Hospitals retrieved successfully.", hospitals));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Hospital>> getHospitalById(@PathVariable String id) {
        Hospital hospital = hospitalService.getHospitalById(id);
        return ResponseEntity.ok(ApiResponse.success("Hospital retrieved.", hospital));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Hospital>> createHospital(
            @Valid @RequestBody HospitalRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Hospital created = hospitalService.createHospital(request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Hospital onboarded successfully.", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canManageHospital(#id))")
    public ResponseEntity<ApiResponse<Hospital>> updateHospital(
            @PathVariable String id,
            @Valid @RequestBody com.hospitrack.dto.HospitalUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Hospital updated = hospitalService.updateHospitalDetails(id, request, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Hospital profile updated successfully.", updated));
    }

    @PutMapping("/{id}/beds")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('HOSPITAL_ADMIN') and @dataGuard.canManageHospital(#id))")
    public ResponseEntity<ApiResponse<Hospital>> updateBedCapacity(
            @PathVariable String id,
            @RequestBody Map<String, Integer> payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Integer availableBeds = payload.get("availableBeds");
        if (availableBeds == null || availableBeds < 0) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Valid available beds count required."));
        }
        Hospital updated = hospitalService.updateBedCapacity(id, availableBeds, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Bed capacity updated successfully.", updated));
    }
}
