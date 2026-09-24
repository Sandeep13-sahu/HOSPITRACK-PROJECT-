package com.hospitrack.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class HospitalUpdateRequest {

    @NotBlank(message = "Hospital name is required.")
    @Size(min = 2, max = 128, message = "Name must be between 2 and 128 characters.")
    private String name;

    @NotBlank(message = "Location / address is required.")
    private String location;

    @NotBlank(message = "Contact phone is required.")
    private String contact;

    private String email;

    @Min(value = 0, message = "Total beds must be greater than or equal to 0.")
    private Integer totalBeds;

    @Min(value = 0, message = "Available beds must be greater than or equal to 0.")
    private Integer availableBeds;

    public HospitalUpdateRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email != null ? email.toLowerCase().trim() : null; }

    public Integer getTotalBeds() { return totalBeds; }
    public void setTotalBeds(Integer totalBeds) { this.totalBeds = totalBeds; }

    public Integer getAvailableBeds() { return availableBeds; }
    public void setAvailableBeds(Integer availableBeds) { this.availableBeds = availableBeds; }
}

