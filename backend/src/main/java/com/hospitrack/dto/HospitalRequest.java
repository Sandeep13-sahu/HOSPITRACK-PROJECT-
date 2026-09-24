package com.hospitrack.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class HospitalRequest {

    @NotBlank(message = "Hospital name is required.")
    private String name;

    @NotBlank(message = "Hospital code is required.")
    private String code;

    @NotBlank(message = "Location is required.")
    private String location;

    @NotBlank(message = "Contact phone is required.")
    private String contact;

    private String email;

    @NotNull(message = "Total beds count is required.")
    private Integer totalBeds;

    @NotNull(message = "Available beds count is required.")
    private Integer availableBeds;

    public HospitalRequest() {}

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
}
