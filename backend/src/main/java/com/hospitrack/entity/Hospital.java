package com.hospitrack.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hospitals", indexes = {
    @Index(name = "idx_hospitals_code", columnList = "code", unique = true)
})
public class Hospital {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "name", nullable = false, length = 128)
    private String name;

    @Column(name = "code", nullable = false, unique = true, length = 32)
    private String code;

    @Column(name = "location", nullable = false, length = 255)
    private String location;

    @Column(name = "contact", nullable = false, length = 64)
    private String contact;

    @Column(name = "email", length = 128)
    private String email;

    @Column(name = "total_beds", nullable = false)
    private Integer totalBeds;

    @Column(name = "available_beds", nullable = false)
    private Integer availableBeds;

    @Column(name = "status", nullable = false, length = 32)
    private String status = "ACTIVE"; // ACTIVE | SUSPENDED | DEACTIVATED

    @Column(name = "rating")
    private Double rating = 4.8;

    @Column(name = "review_count")
    private Integer reviewCount = 0;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Hospital() {}

    public Hospital(String id, String name, String code, String location, String contact, String email, Integer totalBeds, Integer availableBeds) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.location = location;
        this.contact = contact;
        this.email = email;
        this.totalBeds = totalBeds;
        this.availableBeds = availableBeds;
        this.status = "ACTIVE";
        this.rating = 4.8;
        this.reviewCount = 0;
        this.createdAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Integer getTotalBeds() { return totalBeds; }
    public void setTotalBeds(Integer totalBeds) { this.totalBeds = totalBeds; }

    public Integer getAvailableBeds() { return availableBeds; }
    public void setAvailableBeds(Integer availableBeds) { this.availableBeds = availableBeds; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public Integer getReviewCount() { return reviewCount; }
    public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
