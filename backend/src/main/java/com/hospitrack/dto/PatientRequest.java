package com.hospitrack.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class PatientRequest {

    @NotBlank(message = "Patient name is required.")
    private String name;

    @NotBlank(message = "Gender is required.")
    private String gender;

    @NotNull(message = "Age is required.")
    private Integer age;

    private String bloodGroup;

    @NotBlank(message = "Contact number is required.")
    private String contact;

    private String email;
    private String address;
    private String emergencyContact;
    private String currentHospitalId;
    private String primaryDoctorId;

    public PatientRequest() {}

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
}
