package com.hospitrack.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "lab_reports", indexes = {
    @Index(name = "idx_reports_patient_id", columnList = "patient_id"),
    @Index(name = "idx_reports_doctor_id", columnList = "doctor_id"),
    @Index(name = "idx_reports_hospital_id", columnList = "hospital_id")
})
public class LabReport {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "patient_id", nullable = false, length = 64)
    private String patientId;

    @Column(name = "doctor_id", nullable = false, length = 64)
    private String doctorId;

    @Column(name = "hospital_id", nullable = false, length = 64)
    private String hospitalId;

    @Column(name = "test_name", nullable = false, length = 128)
    private String testName;

    @Column(name = "category", nullable = false, length = 64)
    private String category;

    @Column(name = "result_summary", nullable = false, columnDefinition = "TEXT")
    private String resultSummary;

    @Column(name = "report_date", nullable = false)
    private LocalDateTime reportDate = LocalDateTime.now();

    @Column(name = "status", nullable = false, length = 32)
    private String status = "FINAL";

    public LabReport() {}

    public LabReport(String id, String patientId, String doctorId, String hospitalId, String testName, String category, String resultSummary, LocalDateTime reportDate, String status) {
        this.id = id;
        this.patientId = patientId;
        this.doctorId = doctorId;
        this.hospitalId = hospitalId;
        this.testName = testName;
        this.category = category;
        this.resultSummary = resultSummary;
        this.reportDate = reportDate != null ? reportDate : LocalDateTime.now();
        this.status = status != null ? status : "FINAL";
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getHospitalId() { return hospitalId; }
    public void setHospitalId(String hospitalId) { this.hospitalId = hospitalId; }

    public String getTestName() { return testName; }
    public void setTestName(String testName) { this.testName = testName; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getResultSummary() { return resultSummary; }
    public void setResultSummary(String resultSummary) { this.resultSummary = resultSummary; }

    public LocalDateTime getReportDate() { return reportDate; }
    public void setReportDate(LocalDateTime reportDate) { this.reportDate = reportDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
