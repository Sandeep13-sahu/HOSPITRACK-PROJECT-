package com.hospitrack;

import com.hospitrack.entity.Role;
import com.hospitrack.entity.User;
import com.hospitrack.repository.UserRepository;
import com.hospitrack.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class DataIsolationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User patientUserA;
    private User patientUserB;
    private User doctorUser;
    private User superAdminUser;

    @BeforeEach
    void setUp() {
        // Patient A
        if (!userRepository.existsByEmailIgnoreCase("patientA@test.com")) {
            patientUserA = new User("USER-PAT-A", "Patient Alice", "patientA@test.com", passwordEncoder.encode("Pass123!"), Role.PATIENT);
            patientUserA.setPatientId("PAT-301");
            patientUserA.setHospitalId("HOSP-101");
            userRepository.save(patientUserA);
        } else {
            patientUserA = userRepository.findByEmailIgnoreCase("patientA@test.com").orElseThrow();
        }

        // Patient B
        if (!userRepository.existsByEmailIgnoreCase("patientB@test.com")) {
            patientUserB = new User("USER-PAT-B", "Patient Bob", "patientB@test.com", passwordEncoder.encode("Pass123!"), Role.PATIENT);
            patientUserB.setPatientId("PAT-302");
            patientUserB.setHospitalId("HOSP-101");
            userRepository.save(patientUserB);
        } else {
            patientUserB = userRepository.findByEmailIgnoreCase("patientB@test.com").orElseThrow();
        }

        // Doctor
        if (!userRepository.existsByEmailIgnoreCase("doc@citygeneral.in")) {
            doctorUser = new User("USER-DOC-TEST", "Dr. Sarah", "doc@citygeneral.in", passwordEncoder.encode("Pass123!"), Role.DOCTOR);
            doctorUser.setDoctorId("DOC-201");
            doctorUser.setHospitalId("HOSP-101");
            userRepository.save(doctorUser);
        } else {
            doctorUser = userRepository.findByEmailIgnoreCase("doc@citygeneral.in").orElseThrow();
        }

        // Super Admin
        superAdminUser = userRepository.findByEmailIgnoreCase("admin@hospitrack.com").orElseGet(() -> {
            User a = new User("ADMIN-01", "Super Admin", "admin@hospitrack.com", passwordEncoder.encode("Admin@123!"), Role.SUPER_ADMIN);
            return userRepository.save(a);
        });
    }

    @Test
    @DisplayName("[1] Patient Isolation: Patient A requesting Patient B record is DENIED (403 Forbidden)")
    void testPatientCannotAccessOtherPatient() throws Exception {
        String tokenPatientA = jwtTokenProvider.generateTokenFromUser(patientUserA);

        // Patient A attempts to access Patient B (PAT-302)
        mockMvc.perform(get("/api/patients/PAT-302")
                        .header("Authorization", "Bearer " + tokenPatientA))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[2] Patient Isolation: Patient A requesting own record SUCCEEDS")
    void testPatientCanAccessOwnRecord() throws Exception {
        String tokenPatientA = jwtTokenProvider.generateTokenFromUser(patientUserA);

        mockMvc.perform(get("/api/patients/PAT-301")
                        .header("Authorization", "Bearer " + tokenPatientA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value("PAT-301"));
    }

    @Test
    @DisplayName("[3] Admin Protection: Patient calling Admin API is BLOCKED (403 Forbidden)")
    void testPatientBlockedFromAdminApi() throws Exception {
        String tokenPatientA = jwtTokenProvider.generateTokenFromUser(patientUserA);

        mockMvc.perform(get("/api/admin/overview")
                        .header("Authorization", "Bearer " + tokenPatientA))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[4] Admin Protection: Doctor calling Admin API is BLOCKED (403 Forbidden)")
    void testDoctorBlockedFromAdminApi() throws Exception {
        String tokenDoctor = jwtTokenProvider.generateTokenFromUser(doctorUser);

        mockMvc.perform(get("/api/admin/overview")
                        .header("Authorization", "Bearer " + tokenDoctor))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[5] Admin Authorization: SUPER_ADMIN accessing Admin API SUCCEEDS")
    void testSuperAdminCanAccessAdminApi() throws Exception {
        String tokenAdmin = jwtTokenProvider.generateTokenFromUser(superAdminUser);

        mockMvc.perform(get("/api/admin/overview")
                        .header("Authorization", "Bearer " + tokenAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalHospitals").exists());
    }

    @Test
    @DisplayName("[6] Unauthenticated Request: Protected endpoints return 403 Forbidden without token")
    void testUnauthenticatedBlocked() throws Exception {
        mockMvc.perform(get("/api/patients/PAT-301"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[7] Profile Update: Patient A can update own profile successfully")
    void testPatientCanUpdateOwnProfile() throws Exception {
        String tokenPatientA = jwtTokenProvider.generateTokenFromUser(patientUserA);
        String payload = """
        {
            "name": "Alice Updated",
            "gender": "Female",
            "age": 32,
            "bloodGroup": "O+",
            "contact": "+91 98765 11111",
            "email": "alice.updated@test.com",
            "address": "404 Sunshine Apartments",
            "emergencyContact": "+91 98765 22222"
        }
        """;

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/patients/PAT-301")
                        .header("Authorization", "Bearer " + tokenPatientA)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Alice Updated"))
                .andExpect(jsonPath("$.data.contact").value("+91 98765 11111"));
    }

    @Test
    @DisplayName("[8] IDOR Prevention: Patient A attempting to update Patient B profile is BLOCKED (403 Forbidden)")
    void testPatientCannotUpdateOtherPatientProfile() throws Exception {
        String tokenPatientA = jwtTokenProvider.generateTokenFromUser(patientUserA);
        String payload = """
        {
            "name": "Hacked Bob",
            "gender": "Male",
            "age": 45,
            "bloodGroup": "A+",
            "contact": "+91 98765 99999",
            "email": "hacked.bob@test.com"
        }
        """;

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/patients/PAT-302")
                        .header("Authorization", "Bearer " + tokenPatientA)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
    }
}
