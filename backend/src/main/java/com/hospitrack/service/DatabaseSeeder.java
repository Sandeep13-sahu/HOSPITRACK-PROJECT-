package com.hospitrack.service;

import com.hospitrack.entity.*;
import com.hospitrack.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseSeeder.class);

    private final UserRepository userRepository;
    private final HospitalRepository hospitalRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final VisitRepository visitRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final LabReportRepository labReportRepository;
    private final ReferralRepository referralRepository;
    private final TransferRepository transferRepository;
    private final ReviewRepository reviewRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.initial-email:admin@hospitrack.com}")
    private String initialAdminEmail;

    @Value("${app.admin.initial-password:Admin@Hospitrack2026!}")
    private String initialAdminPassword;

    public DatabaseSeeder(
            UserRepository userRepository,
            HospitalRepository hospitalRepository,
            DoctorRepository doctorRepository,
            PatientRepository patientRepository,
            VisitRepository visitRepository,
            PrescriptionRepository prescriptionRepository,
            LabReportRepository labReportRepository,
            ReferralRepository referralRepository,
            TransferRepository transferRepository,
            ReviewRepository reviewRepository,
            AuditLogRepository auditLogRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.hospitalRepository = hospitalRepository;
        this.doctorRepository = doctorRepository;
        this.patientRepository = patientRepository;
        this.visitRepository = visitRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.labReportRepository = labReportRepository;
        this.referralRepository = referralRepository;
        this.transferRepository = transferRepository;
        this.reviewRepository = reviewRepository;
        this.auditLogRepository = auditLogRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        seedInitialAdmin();
        seedBaselineData();
    }

    private void seedInitialAdmin() {
        String adminEmail = initialAdminEmail.toLowerCase().trim();
        if (!userRepository.existsByEmailIgnoreCase(adminEmail)) {
            User admin = new User();
            admin.setId("ADMIN-01");
            admin.setName("System Administrator");
            admin.setEmail(adminEmail);
            admin.setPasswordHash(passwordEncoder.encode(initialAdminPassword));
            admin.setRole(Role.SUPER_ADMIN);
            admin.setStatus(AccountStatus.ACTIVE);
            admin.setEmailVerified(true);
            userRepository.save(admin);
            logger.info("Initialized SUPER_ADMIN account in PostgreSQL");
        }
    }

    private void seedBaselineData() {
        if (hospitalRepository.count() > 0) {
            return;
        }

        logger.info("Seeding baseline healthcare entities into PostgreSQL database...");

        // 1. Hospitals
        Hospital h1 = new Hospital("HOSP-101", "City General Hospital", "CGH-01", "Metro Health Corridor, Sector 4, New Delhi", "+91 98201 44551", "admin@citygeneral.in", 250, 42);
        Hospital h2 = new Hospital("HOSP-102", "Apex Care Medical Center", "ACM-02", "Westside Avenue 88, Mumbai", "+91 98202 77882", "operations@apexcare.in", 180, 28);
        Hospital h3 = new Hospital("HOSP-103", "MediLife Multispeciality Hospital", "MLM-03", "Central Boulevard 15, Bengaluru", "+91 98203 99113", "contact@medilife.in", 320, 65);
        hospitalRepository.save(h1);
        hospitalRepository.save(h2);
        hospitalRepository.save(h3);

        // 2. Hospital Admin Users
        User uHosp1 = new User("USER-HOSP-101", "City General Hospital Admin", "admin@citygeneral.in", passwordEncoder.encode("Hospital@123!"), Role.HOSPITAL_ADMIN);
        uHosp1.setHospitalId("HOSP-101");
        userRepository.save(uHosp1);

        User uHosp2 = new User("USER-HOSP-102", "Apex Care Admin", "operations@apexcare.in", passwordEncoder.encode("Hospital@123!"), Role.HOSPITAL_ADMIN);
        uHosp2.setHospitalId("HOSP-102");
        userRepository.save(uHosp2);

        // 3. Doctors
        Doctor d1 = new Doctor("DOC-201", "HOSP-101", "Dr. Sarah Sharma", "Cardiology", "MCI-99201", "s.sharma@citygeneral.in", "+91 98765 10001", 14);
        Doctor d2 = new Doctor("DOC-202", "HOSP-102", "Dr. Rahul Verma", "Pulmonology", "MCI-88102", "r.verma@apexcare.in", "+91 98765 20002", 11);
        Doctor d3 = new Doctor("DOC-203", "HOSP-103", "Dr. Priya Singh", "Neurology & Trauma", "MCI-77303", "p.singh@medilife.in", "+91 98765 30003", 9);
        Doctor d4 = new Doctor("DOC-204", "HOSP-101", "Dr. Vikram Malhotra", "General Surgery", "MCI-66404", "v.malhotra@citygeneral.in", "+91 98765 40004", 16);
        doctorRepository.save(d1);
        doctorRepository.save(d2);
        doctorRepository.save(d3);
        doctorRepository.save(d4);

        // Doctor User accounts
        User uDoc1 = new User("USER-DOC-201", "Dr. Sarah Sharma", "s.sharma@citygeneral.in", passwordEncoder.encode("Doctor@123!"), Role.DOCTOR);
        uDoc1.setHospitalId("HOSP-101");
        uDoc1.setDoctorId("DOC-201");
        userRepository.save(uDoc1);

        User uDoc1Alias = new User("USER-DOC-201-ALIAS", "Dr. Sarah Sharma", "dr.sarah@citygeneral.com", passwordEncoder.encode("Doctor@123!"), Role.DOCTOR);
        uDoc1Alias.setHospitalId("HOSP-101");
        uDoc1Alias.setDoctorId("DOC-201");
        userRepository.save(uDoc1Alias);

        User uDoc2 = new User("USER-DOC-202", "Dr. Rahul Verma", "r.verma@apexcare.in", passwordEncoder.encode("Doctor@123!"), Role.DOCTOR);
        uDoc2.setHospitalId("HOSP-102");
        uDoc2.setDoctorId("DOC-202");
        userRepository.save(uDoc2);

        // 4. Patients
        Patient p0 = new Patient("PAT-300", "Rahul Sharma", "Male", 34, "O+", "+91 98765 43210", "rahul.sharma@gmail.com", "Flat 102, Green Avenue, New Delhi", "+91 98765 99990 (Pooja Sharma - Spouse)", "HOSP-101", "DOC-201");
        Patient p1 = new Patient("PAT-301", "John Doe", "Male", 42, "O+", "+91 98111 00001", "john.doe@email.com", "Flat 402, Sunrise Heights, New Delhi", "+91 98111 99991 (Jane Doe - Spouse)", "HOSP-101", "DOC-201");
        Patient p2 = new Patient("PAT-302", "Rajesh Kumar", "Male", 58, "B+", "+91 98111 00002", "rajesh.kumar@email.com", "B-14, Green Park Extension, New Delhi", "+91 98111 99992 (Suresh Kumar - Brother)", "HOSP-101", "DOC-201");
        p2.setStatus("TRANSFER_PENDING");
        Patient p3 = new Patient("PAT-303", "Ananya Iyer", "Female", 31, "A+", "+91 98111 00003", "ananya.iyer@email.com", "Tower C, Sea View Apartments, Mumbai", "+91 98111 99993 (Karthik Iyer - Husband)", "HOSP-102", "DOC-202");
        Patient p4 = new Patient("PAT-304", "Sunita Sharma", "Female", 64, "AB+", "+91 98111 00004", "sunita.sharma@email.com", "77 Indiranagar, 100ft Road, Bengaluru", "+91 98111 99994 (Rohit Sharma - Son)", "HOSP-103", "DOC-203");
        Patient p5 = new Patient("PAT-305", "Vikram Patel", "Male", 49, "O-", "+91 98111 00005", "vikram.patel@email.com", "32 Riverfront Enclave, Ahmedabad", "+91 98111 99995 (Meena Patel - Spouse)", "HOSP-101", "DOC-204");
        p5.setStatus("DISCHARGED");
        Patient p6 = new Patient("PAT-306", "Michael Brown", "Male", 56, "B-", "+91 98111 00006", "michael.brown@email.com", "404 Palm Boulevard, Mumbai", "+91 98111 99996 (Sarah Brown - Daughter)", "HOSP-102", "DOC-202");
        p6.setStatus("TRANSFERRED");
        patientRepository.save(p0);
        patientRepository.save(p1);
        patientRepository.save(p2);
        patientRepository.save(p3);
        patientRepository.save(p4);
        patientRepository.save(p5);
        patientRepository.save(p6);

        // Patient User accounts
        User uPat0 = new User("USER-PAT-300", "Rahul Sharma", "rahul.sharma@gmail.com", passwordEncoder.encode("Patient@123!"), Role.PATIENT);
        uPat0.setPatientId("PAT-300");
        uPat0.setHospitalId("HOSP-101");
        userRepository.save(uPat0);

        User uPat1 = new User("USER-PAT-301", "John Doe", "john.doe@email.com", passwordEncoder.encode("Patient@123!"), Role.PATIENT);
        uPat1.setPatientId("PAT-301");
        uPat1.setHospitalId("HOSP-101");
        userRepository.save(uPat1);

        User uPat2 = new User("USER-PAT-302", "Rajesh Kumar", "rajesh.kumar@email.com", passwordEncoder.encode("Patient@123!"), Role.PATIENT);
        uPat2.setPatientId("PAT-302");
        uPat2.setHospitalId("HOSP-101");
        userRepository.save(uPat2);

        // 5. Visits
        Visit v1 = new Visit("VISIT-501", "PAT-301", "DOC-201", "HOSP-101", LocalDateTime.now().minusDays(5),
                "Chest tightness, palpitations, mild dyspnea on exertion for 2 days",
                "Acute Coronary Syndrome Evaluation & Stable Angina",
                "Bed rest, continuous telemetry, antiplatelet therapy and sublingual nitroglycerin",
                "Patient stable. ECG shows sinus rhythm with ST changes. Vitals: BP 138/88, SpO2 97%, HR 84 bpm.");
        Visit v2 = new Visit("VISIT-502", "PAT-301", "DOC-201", "HOSP-101", LocalDateTime.now().minusDays(2),
                "Follow-up consultation after cardiac stabilization. Minimal fatigue.",
                "Essential Hypertension & Atherosclerotic Cardiovascular Disease",
                "Adjusted beta-blocker dosage, continued statin therapy, dietary salt restriction",
                "Blood pressure controlled at 122/78 mmHg. Stress test scheduled. Responding well.");
        visitRepository.save(v1);
        visitRepository.save(v2);

        // 6. Prescriptions
        Prescription rx1 = new Prescription("RX-801", "VISIT-501", "PAT-301", "DOC-201", "HOSP-101", LocalDateTime.now().minusDays(5));
        rx1.addItem(new PrescriptionItem("Aspirin", "75mg", "Once daily", "30 days", "Take after breakfast with water"));
        rx1.addItem(new PrescriptionItem("Atorvastatin", "40mg", "Once at night", "30 days", "Take before sleep"));
        rx1.addItem(new PrescriptionItem("Clopidogrel", "75mg", "Once daily", "30 days", "Take with main meal"));
        prescriptionRepository.save(rx1);

        Prescription rx2 = new Prescription("RX-802", "VISIT-502", "PAT-301", "DOC-201", "HOSP-101", LocalDateTime.now().minusDays(2));
        rx2.addItem(new PrescriptionItem("Aspirin", "75mg", "Once daily", "60 days", "Refill continued"));
        rx2.addItem(new PrescriptionItem("Metoprolol Succinate", "25mg", "Twice daily", "30 days", "Monitor resting pulse"));
        rx2.addItem(new PrescriptionItem("Pantoprazole", "40mg", "Once daily", "15 days", "Take on empty stomach"));
        prescriptionRepository.save(rx2);

        // 7. Lab Reports
        LabReport rep1 = new LabReport("REP-701", "PAT-301", "DOC-201", "HOSP-101", "12-Lead Electrocardiogram (ECG)", "Cardiology",
                "Normal sinus rhythm @ 78 bpm. Mild ST-segment depression in leads V4-V6.", LocalDateTime.now().minusDays(5), "FINAL");
        LabReport rep2 = new LabReport("REP-702", "PAT-301", "DOC-201", "HOSP-101", "Cardiac Biomarkers & Troponin-I", "Pathology",
                "hs-cTnI: 0.028 ng/mL (Reference Normal < 0.030 ng/mL). CPK-MB: 18 U/L.", LocalDateTime.now().minusDays(5), "FINAL");
        labReportRepository.save(rep1);
        labReportRepository.save(rep2);

        // 8. Referrals
        Referral ref1 = new Referral("REF-401", "PAT-301", "HOSP-101", "HOSP-103", "DOC-201",
                "Advanced Coronary Angiography & Cath Lab Intervention", "URGENT", "IN_PROGRESS", "Requires tertiary Cath Lab evaluation.");
        Referral ref2 = new Referral("REF-402", "PAT-303", "HOSP-102", "HOSP-101", "DOC-202",
                "Cardiothoracic surgical consult for persistent dyspnea", "ROUTINE", "PENDING", "Second opinion requested.");
        referralRepository.save(ref1);
        referralRepository.save(ref2);

        // 9. Transfers
        Transfer trf1 = new Transfer("TRF-901", "PAT-306", "HOSP-101", "HOSP-102", "Specialized Pulmonology Intensive Care", "URGENT", "COMPLETED", "HOSP-101", LocalDateTime.now().minusDays(10), LocalDateTime.now().minusDays(10), "Transferred with ICU ambulance.");
        Transfer trf2 = new Transfer("TRF-902", "PAT-302", "HOSP-101", "HOSP-103", "Emergency Tertiary Neuro-Trauma ICU Bed Requirement", "EMERGENCY", "PENDING", "HOSP-101", LocalDateTime.now().minusHours(4), null, "Awaiting bed confirmation.");
        transferRepository.save(trf1);
        transferRepository.save(trf2);

        // 10. Hospital Reviews
        Review rev1 = new Review("REV-501", "PAT-301", "John Doe", "HOSP-101", "City General Hospital", 5, "Outstanding cardiology department and rapid admission process. Dr. Sarah was extremely thorough and attentive.");
        Review rev2 = new Review("REV-502", "PAT-303", "Ananya Iyer", "HOSP-102", "Apex Care Medical Center", 4, "Prompt emergency transfer coordination and very clean inpatient rooms.");
        Review rev3 = new Review("REV-503", "PAT-304", "Sunita Sharma", "HOSP-103", "MediLife Multispeciality Hospital", 5, "Excellent specialist consultation with modern diagnostic equipment.");
        reviewRepository.save(rev1);
        reviewRepository.save(rev2);
        reviewRepository.save(rev3);

        // 11. Audit Logs
        auditLogRepository.save(new AuditLog("AUDIT-1001", "ADMIN-01", "SUPER_ADMIN", "System Administrator", "CREATE_HOSPITAL", "HOSPITAL", "HOSP-101", "Onboarded City General Hospital into network."));
        auditLogRepository.save(new AuditLog("AUDIT-1002", "ADMIN-01", "SUPER_ADMIN", "System Administrator", "CREATE_HOSPITAL", "HOSPITAL", "HOSP-102", "Onboarded Apex Care Medical Center into network."));
        auditLogRepository.save(new AuditLog("AUDIT-1003", "ADMIN-01", "SUPER_ADMIN", "System Administrator", "CREATE_HOSPITAL", "HOSPITAL", "HOSP-103", "Onboarded MediLife Multispeciality Hospital into network."));
        auditLogRepository.save(new AuditLog("AUDIT-1004", "HOSP-101", "HOSPITAL_ADMIN", "City General Hospital Admin", "REGISTER_PATIENT", "PATIENT", "PAT-301", "Admitted patient John Doe (O+, 42 yrs)."));

        logger.info("Baseline data seeded successfully.");
    }
}
