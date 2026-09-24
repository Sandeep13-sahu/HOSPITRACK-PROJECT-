package com.hospitrack.service;

import com.hospitrack.dto.ReviewRequest;
import com.hospitrack.entity.Hospital;
import com.hospitrack.entity.Review;
import com.hospitrack.exception.ResourceNotFoundException;
import com.hospitrack.repository.HospitalRepository;
import com.hospitrack.repository.PatientRepository;
import com.hospitrack.repository.ReviewRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final HospitalRepository hospitalRepository;
    private final PatientRepository patientRepository;
    private final AuditService auditService;

    public ReviewService(
            ReviewRepository reviewRepository,
            HospitalRepository hospitalRepository,
            PatientRepository patientRepository,
            AuditService auditService
    ) {
        this.reviewRepository = reviewRepository;
        this.hospitalRepository = hospitalRepository;
        this.patientRepository = patientRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<Review> getAllReviews() {
        return reviewRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public List<Review> getReviewsByHospital(String hospitalId) {
        return reviewRepository.findByHospitalIdOrderByCreatedAtDesc(Objects.requireNonNull(hospitalId));
    }

    @Transactional(readOnly = true)
    public List<Review> getReviewsByPatient(String patientId) {
        return reviewRepository.findByPatientIdOrderByCreatedAtDesc(Objects.requireNonNull(patientId));
    }

    @Transactional
    public Review createReview(ReviewRequest request, String actorId, String actorRole, String actorName, String patientId) {
        Hospital hospital = hospitalRepository.findById(Objects.requireNonNull(request.getHospitalId()))
                .orElseThrow(() -> new ResourceNotFoundException("Hospital not found: " + request.getHospitalId()));

        String actualPatientName = actorName != null ? actorName : "Verified Patient";
        if (patientId != null) {
            patientRepository.findById(patientId).ifPresent(p -> {});
        }

        String id = "REV-" + (500 + reviewRepository.count() + 1);
        Review review = new Review(
                id,
                patientId != null ? patientId : actorId,
                actualPatientName,
                hospital.getId(),
                hospital.getName(),
                request.getRating(),
                request.getReviewText() != null ? request.getReviewText().trim() : ""
        );

        Review saved = reviewRepository.save(review);

        // Recalculate hospital average rating
        List<Review> hospitalReviews = reviewRepository.findByHospitalIdOrderByCreatedAtDesc(hospital.getId());
        double avg = hospitalReviews.stream()
                .filter(r -> !"HIDDEN".equalsIgnoreCase(r.getStatus()))
                .mapToInt(r -> r.getRating() != null ? r.getRating() : 0)
                .average()
                .orElse(request.getRating());

        hospital.setRating(Math.round(avg * 10.0) / 10.0);
        hospital.setReviewCount(hospitalReviews.size());
        hospitalRepository.save(hospital);

        auditService.logEvent(actorId, actorRole, actorName, "SUBMIT_HOSPITAL_REVIEW", "HOSPITAL", hospital.getId(),
                "Patient submitted a " + request.getRating() + "-star review for " + hospital.getName() + " (" + hospital.getId() + ")");

        return saved;
    }

    @Transactional
    public Review flagReview(String id, String actorId, String actorRole, String actorName) {
        Review review = reviewRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Review not found: " + id));

        review.setStatus("FLAGGED");
        Review saved = reviewRepository.save(review);

        auditService.logEvent(actorId, actorRole, actorName, "FLAG_REVIEW", "REVIEW", saved.getId(),
                "Flagged review " + saved.getId() + " by " + saved.getPatientName() + " for hospital " + saved.getHospitalName());

        return saved;
    }
}
