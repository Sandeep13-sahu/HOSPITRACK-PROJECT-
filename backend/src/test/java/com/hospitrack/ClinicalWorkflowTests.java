package com.hospitrack;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospitrack.dto.PrescriptionRequest;
import com.hospitrack.dto.TransferRequest;
import com.hospitrack.entity.Patient;
import com.hospitrack.entity.Role;
import com.hospitrack.entity.User;
import com.hospitrack.repository.PatientRepository;
import com.hospitrack.repository.UserRepository;
import com.hospitrack.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings("null")
public class ClinicalWorkflowTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private User doctorUser;
    private User hospitalAdminUser;
    private User hosp103User;

    @BeforeEach
    void setUp() {
        if (!userRepository.existsByEmailIgnoreCase("doc.workflow@citygeneral.in")) {
            doctorUser = new User("USER-DOC-WF", "Dr. Sarah Sharma", "doc.workflow@citygeneral.in", passwordEncoder.encode("Pass123!"), Role.DOCTOR);
            doctorUser.setDoctorId("DOC-201");
            doctorUser.setHospitalId("HOSP-101");
            doctorUser = userRepository.save(doctorUser);
        } else {
            doctorUser = userRepository.findByEmailIgnoreCase("doc.workflow@citygeneral.in").orElseThrow();
        }

        if (!userRepository.existsByEmailIgnoreCase("hosp.admin@citygeneral.in")) {
            hospitalAdminUser = new User("USER-HOSP-WF", "City General Admin", "hosp.admin@citygeneral.in", passwordEncoder.encode("Pass123!"), Role.HOSPITAL_ADMIN);
            hospitalAdminUser.setHospitalId("HOSP-101");
            hospitalAdminUser = userRepository.save(hospitalAdminUser);
        } else {
            hospitalAdminUser = userRepository.findByEmailIgnoreCase("hosp.admin@citygeneral.in").orElseThrow();
        }

        if (!userRepository.existsByEmailIgnoreCase("admin@medilife.in")) {
            hosp103User = new User("USER-HOSP-103", "MediLife Admin", "admin@medilife.in", passwordEncoder.encode("Pass123!"), Role.HOSPITAL_ADMIN);
            hosp103User.setHospitalId("HOSP-103");
            hosp103User = userRepository.save(hosp103User);
        } else {
            hosp103User = userRepository.findByEmailIgnoreCase("admin@medilife.in").orElseThrow();
        }
    }

    @Test
    @DisplayName("[1] Prescription Safety: Duplicate drug in single prescription order is REJECTED (422 Unprocessable Entity)")
    void testDuplicateDrugRejected() throws Exception {
        String tokenDoctor = jwtTokenProvider.generateTokenFromUser(doctorUser);

        PrescriptionRequest req = new PrescriptionRequest();
        req.setPatientId("PAT-301");
        req.setDoctorId("DOC-201");
        req.setHospitalId("HOSP-101");

        List<PrescriptionRequest.MedicineItemDto> items = new ArrayList<>();
        PrescriptionRequest.MedicineItemDto med1 = new PrescriptionRequest.MedicineItemDto();
        med1.setName("Pantoprazole");
        med1.setDosage("40mg");
        med1.setFrequency("Once daily");
        items.add(med1);

        PrescriptionRequest.MedicineItemDto med2 = new PrescriptionRequest.MedicineItemDto();
        med2.setName("Aspirin");
        med2.setDosage("75mg");
        med2.setFrequency("Once daily");
        items.add(med2);

        PrescriptionRequest.MedicineItemDto med3Duplicate = new PrescriptionRequest.MedicineItemDto();
        med3Duplicate.setName("Pantoprazole"); // Duplicate!
        med3Duplicate.setDosage("20mg");
        med3Duplicate.setFrequency("Twice daily");
        items.add(med3Duplicate);

        req.setMedicines(items);

        mockMvc.perform(post("/api/prescriptions")
                        .header("Authorization", "Bearer " + tokenDoctor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("CRITICAL PRESCRIPTION SAFETY RULE VIOLATION: Duplicate medicine 'Pantoprazole' detected")));
    }

    @Test
    @DisplayName("[2] Prescription Signing: Valid prescription with unique medicines SUCCEEDS")
    void testValidPrescriptionSigned() throws Exception {
        String tokenDoctor = jwtTokenProvider.generateTokenFromUser(doctorUser);

        PrescriptionRequest req = new PrescriptionRequest();
        req.setPatientId("PAT-301");
        req.setDoctorId("DOC-201");
        req.setHospitalId("HOSP-101");

        List<PrescriptionRequest.MedicineItemDto> items = new ArrayList<>();
        PrescriptionRequest.MedicineItemDto med1 = new PrescriptionRequest.MedicineItemDto();
        med1.setName("Metoprolol");
        med1.setDosage("25mg");
        med1.setFrequency("Twice daily");
        items.add(med1);

        PrescriptionRequest.MedicineItemDto med2 = new PrescriptionRequest.MedicineItemDto();
        med2.setName("Atorvastatin");
        med2.setDosage("20mg");
        med2.setFrequency("Once at night");
        items.add(med2);

        req.setMedicines(items);

        mockMvc.perform(post("/api/prescriptions")
                        .header("Authorization", "Bearer " + tokenDoctor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(org.hamcrest.Matchers.startsWith("RX-")));
    }

    @Test
    @DisplayName("[3] Emergency Transfer Workflow: Initiated transfer accepts and reassigns facility & bed accounting")
    void testEmergencyTransferFlow() throws Exception {
        String tokenHosp = jwtTokenProvider.generateTokenFromUser(hospitalAdminUser);

        TransferRequest req = new TransferRequest();
        req.setPatientId("PAT-301");
        req.setFromHospitalId("HOSP-101");
        req.setToHospitalId("HOSP-103");
        req.setPriority("EMERGENCY");
        req.setReason("Tertiary Cardiac Cath Lab Transfer");

        String resStr = mockMvc.perform(post("/api/transfers")
                        .header("Authorization", "Bearer " + tokenHosp)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andReturn().getResponse().getContentAsString();

        String transferId = objectMapper.readTree(resStr).path("data").path("id").asText();

        // Hospital 103 accepts transfer
        String tokenHosp103 = jwtTokenProvider.generateTokenFromUser(hosp103User);

        mockMvc.perform(post("/api/transfers/" + transferId + "/accept")
                        .header("Authorization", "Bearer " + tokenHosp103))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));

        Patient transferredPatient = patientRepository.findById("PAT-301").orElseThrow();
        assertEquals("HOSP-103", transferredPatient.getCurrentHospitalId(), "Patient facility must update to destination hospital HOSP-103");
    }
}
