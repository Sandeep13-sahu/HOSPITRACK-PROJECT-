package com.hospitrack.controller;

import com.hospitrack.dto.ApiResponse;
import com.hospitrack.dto.HospitalStatusRequest;
import com.hospitrack.entity.Hospital;
import com.hospitrack.entity.Review;
import com.hospitrack.exception.BadRequestException;
import com.hospitrack.repository.*;
import com.hospitrack.security.UserPrincipal;
import com.hospitrack.service.HospitalService;
import com.hospitrack.service.ReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminController {

    private final HospitalRepository hospitalRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final ReferralRepository referralRepository;
    private final TransferRepository transferRepository;
    private final ReviewRepository reviewRepository;
    private final HospitalService hospitalService;
    private final ReviewService reviewService;

    public AdminController(
            HospitalRepository hospitalRepository,
            DoctorRepository doctorRepository,
            PatientRepository patientRepository,
            ReferralRepository referralRepository,
            TransferRepository transferRepository,
            ReviewRepository reviewRepository,
            HospitalService hospitalService,
            ReviewService reviewService
    ) {
        this.hospitalRepository = hospitalRepository;
        this.doctorRepository = doctorRepository;
        this.patientRepository = patientRepository;
        this.referralRepository = referralRepository;
        this.transferRepository = transferRepository;
        this.reviewRepository = reviewRepository;
        this.hospitalService = hospitalService;
        this.reviewService = reviewService;
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOverview() {
        List<Hospital> hospitals = hospitalRepository.findAll();
        long hospitalCount = hospitals.size();
        long activeHospitals = hospitals.stream().filter(h -> "ACTIVE".equalsIgnoreCase(h.getStatus())).count();
        long suspendedHospitals = hospitals.stream().filter(h -> "SUSPENDED".equalsIgnoreCase(h.getStatus())).count();
        long deactivatedHospitals = hospitals.stream().filter(h -> "DEACTIVATED".equalsIgnoreCase(h.getStatus())).count();

        long doctorCount = doctorRepository.count();
        long patientCount = patientRepository.count();
        long referralCount = referralRepository.count();
        long transferCount = transferRepository.count();
        long reviewCount = reviewRepository.count();

        double avgRating = hospitals.stream()
                .filter(h -> h.getRating() != null && h.getRating() > 0)
                .mapToDouble(h -> h.getRating() != null ? h.getRating() : 0.0)
                .average()
                .orElse(4.8);

        int totalBeds = hospitals.stream().mapToInt(h -> h.getTotalBeds() != null ? h.getTotalBeds() : 0).sum();
        int availableBeds = hospitals.stream().mapToInt(h -> h.getAvailableBeds() != null ? h.getAvailableBeds() : 0).sum();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalHospitals", hospitalCount);
        stats.put("activeHospitals", activeHospitals);
        stats.put("suspendedHospitals", suspendedHospitals);
        stats.put("deactivatedHospitals", deactivatedHospitals);
        stats.put("totalDoctors", doctorCount);
        stats.put("totalPatients", patientCount);
        stats.put("totalReferrals", referralCount);
        stats.put("totalTransfers", transferCount);
        stats.put("totalReviews", reviewCount);
        stats.put("averageRating", Math.round(avgRating * 10.0) / 10.0);
        stats.put("totalBeds", totalBeds);
        stats.put("availableBeds", availableBeds);
        stats.put("occupiedBeds", Math.max(0, totalBeds - availableBeds));

        return ResponseEntity.ok(ApiResponse.success("Admin overview stats retrieved.", stats));
    }

    @GetMapping("/reviews")
    public ResponseEntity<ApiResponse<List<Review>>> getAllReviews() {
        List<Review> reviews = reviewService.getAllReviews();
        return ResponseEntity.ok(ApiResponse.success("All network reviews retrieved.", reviews));
    }

    @PutMapping("/reviews/{id}/flag")
    public ResponseEntity<ApiResponse<Review>> flagReview(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Review flagged = reviewService.flagReview(id, principal.getId(), principal.getRole().name(), principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Review flagged successfully.", flagged));
    }

    @PutMapping("/hospitals/{id}/status")
    public ResponseEntity<ApiResponse<Hospital>> updateHospitalStatus(
            @PathVariable String id,
            @RequestBody HospitalStatusRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Hospital updated = hospitalService.updateHospitalStatus(
                id,
                request.getStatus(),
                request.getReason(),
                principal.getId(),
                principal.getRole().name(),
                principal.getName()
        );
        return ResponseEntity.ok(ApiResponse.success("Hospital status updated successfully.", updated));
    }

    @RequestMapping(value = "/hospitals/{id}/approve", method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<Hospital>> approveHospital(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Hospital updated = hospitalService.updateHospitalStatus(
                id,
                "ACTIVE",
                "Approved by administrator",
                principal.getId(),
                principal.getRole().name(),
                principal.getName()
        );
        return ResponseEntity.ok(ApiResponse.success("Hospital approved and activated.", updated));
    }

    @RequestMapping(value = "/hospitals/{id}/suspend", method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<Hospital>> suspendHospital(
            @PathVariable String id,
            @RequestBody(required = false) HospitalStatusRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String reason = request != null && request.getReason() != null ? request.getReason() : "Suspended by administrator";
        Hospital updated = hospitalService.updateHospitalStatus(
                id,
                "SUSPENDED",
                reason,
                principal.getId(),
                principal.getRole().name(),
                principal.getName()
        );
        return ResponseEntity.ok(ApiResponse.success("Hospital suspended.", updated));
    }

    @RequestMapping(value = "/hospitals/{id}/reactivate", method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<Hospital>> reactivateHospital(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Hospital updated = hospitalService.updateHospitalStatus(
                id,
                "ACTIVE",
                "Reactivated by administrator",
                principal.getId(),
                principal.getRole().name(),
                principal.getName()
        );
        return ResponseEntity.ok(ApiResponse.success("Hospital reactivated.", updated));
    }

    @GetMapping("/hospitals/{id}/details")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getHospitalDetails(@PathVariable String id) {
        Hospital hospital = hospitalService.getHospitalById(id);
        Map<String, Object> details = new HashMap<>();
        details.put("hospital", hospital);
        details.put("doctors", doctorRepository.findByHospitalId(id));
        details.put("patients", patientRepository.findByCurrentHospitalId(id));
        details.put("referrals", referralRepository.findByFromHospitalIdOrToHospitalIdOrderByCreatedAtDesc(id, id));
        details.put("transfers", transferRepository.findByFromHospitalIdOrToHospitalIdOrderByInitiatedAtDesc(id, id));
        details.put("reviews", reviewRepository.findByHospitalIdOrderByCreatedAtDesc(id));
        return ResponseEntity.ok(ApiResponse.success("Hospital detailed dossier retrieved.", details));
    }

    @PostMapping("/reset-demo")
    public ResponseEntity<ApiResponse<String>> resetDemoDatabase(@AuthenticationPrincipal UserPrincipal principal) {
        throw new BadRequestException("Database reset is permanently disabled in production mode.");
    }
}
