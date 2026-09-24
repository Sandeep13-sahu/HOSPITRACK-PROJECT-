package com.hospitrack.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "patients", indexes = {
    @Index(name = "idx_patients_hospital_id", columnList = "current_hospital_id"),
    @Index(name = "idx_patients_doctor_id", columnList = "primary_doctor_id"),
    @Index(name = "idx_patients_email", columnList = "email")
})
public class Patient {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "name", nullable = false, length = 128)
    private String name;

    @Column(name = "gender", nullable = false, length = 16)
    private String gender;

    @Column(name = "age", nullable = false)
    private Integer age;

    @Column(name = "blood_group", length = 8)
    private String bloodGroup;

    @Column(name = "contact", nullable = false, length = 64)
    private String contact;

    @Column(name = "email", length = 191)
    private String email;

    @Column(name = "address", length = 255)
    private String address;

    @Column(name = "emergency_contact", length = 255)
    private String emergencyContact;

    @Column(name = "current_hospital_id", nullable = false, length = 64)
    private String currentHospitalId;

    @Column(name = "primary_doctor_id", length = 64)
    private String primaryDoctorId;

    @Column(name = "status", nullable = false, length = 32)
    private String status = "CHECKED_IN"; // CHECKED_IN, DISCHARGED, TRANSFER_PENDING, TRANSFERRED

    @Column(name = "admitted_at", nullable = false)
    private LocalDateTime admittedAt = LocalDateTime.now();

    @Column(name = "discharged_at")
    private LocalDateTime dischargedAt;

    public Patient() {}

    public Patient(String id, String name, String gender, Integer age, String bloodGroup, String contact, String email, String address, String emergencyContact, String currentHospitalId, String primaryDoctorId) {
        this.id = id;
        this.name = name;
        this.gender = gender;
        this.age = age;
        this.bloodGroup = bloodGroup;
        this.contact = contact;
        this.email = email != null ? email.toLowerCase().trim() : null;
        this.address = address;
        this.emergencyContact = emergencyContact;
        this.currentHospitalId = currentHospitalId;
        this.primaryDoctorId = primaryDoctorId;
        this.status = "CHECKED_IN";
        this.admittedAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }

    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email != null ? email.toLowerCase().trim() : null; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getEmergencyContact() { return emergencyContact; }
    public void setEmergencyContact(String emergencyContact) { this.emergencyContact = emergencyContact; }

    public String getCurrentHospitalId() { return currentHospitalId; }
    public void setCurrentHospitalId(String currentHospitalId) { this.currentHospitalId = currentHospitalId; }

    public String getPrimaryDoctorId() { return primaryDoctorId; }
    public void setPrimaryDoctorId(String primaryDoctorId) { this.primaryDoctorId = primaryDoctorId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getAdmittedAt() { return admittedAt; }
    public void setAdmittedAt(LocalDateTime admittedAt) { this.admittedAt = admittedAt; }

    public LocalDateTime getDischargedAt() { return dischargedAt; }
    public void setDischargedAt(LocalDateTime dischargedAt) { this.dischargedAt = dischargedAt; }
}
