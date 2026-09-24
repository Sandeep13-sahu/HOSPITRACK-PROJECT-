package com.hospitrack.repository;

import com.hospitrack.entity.Role;
import com.hospitrack.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    List<User> findByRole(Role role);
    List<User> findByHospitalId(String hospitalId);
    Optional<User> findByDoctorId(String doctorId);
    Optional<User> findByPatientId(String patientId);
}
