# HOSPITRACK — DEMO CREDENTIALS

> [!WARNING]
> **DEVELOPMENT / PRESENTATION ONLY**
> These accounts and passwords are for local evaluation, presentation, and automated testing only.
> NEVER use these credentials in a public or production healthcare deployment.

---

## 🏥 Pre-Seeded Demonstration Accounts

| Role | Email Address | Password | Identity / Facility Scope | Primary Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | `admin@hospitrack.com` | `Admin@Hospitrack2026!` (or `admin123`) | System Administrator | National Directory Oversight, Facility Onboarding, Audit Ledger |
| **HOSPITAL_ADMIN** | `admin@citygeneral.in` | `Hospital@123!` (or `hospital123`) | City General Hospital Admin (`CGH-01`) | Inpatient Admission, Bed Management, Dispatch Referrals/Transfers |
| **HOSPITAL_ADMIN** | `operations@apexcare.in` | `Hospital@123!` (or `hospital123`) | Apex Care Medical Center (`ACM-02`) | Inpatient Admission, Bed Management, Triage Inbound Requests |
| **DOCTOR** | `s.sharma@citygeneral.in` | `Doctor@123!` (or `doctor123`) | Dr. Sarah Sharma (Cardiology) | Clinical Consultations, Prescriptions (Duplicate Drug Check), Labs |
| **DOCTOR** | `dr.sarah@citygeneral.com` | `Doctor@123!` (or `doctor123`) | Dr. Sarah Sharma (Cardiology) | Clinical Consultations, Prescriptions (Duplicate Drug Check), Labs |
| **DOCTOR** | `r.verma@apexcare.in` | `Doctor@123!` (or `doctor123`) | Dr. Rahul Verma (Pulmonology) | Clinical Consultations, Prescriptions, Specialist Referrals |
| **PATIENT** | `john.doe@email.com` | `Patient@123!` (or `patient123`) | John Doe (`PAT-301`) | Longitudinal Care Timeline, Medication Regimens, Print Summary |
| **PATIENT** | `rajesh.kumar@email.com` | `Patient@123!` (or `patient123`) | Rajesh Kumar (`PAT-302`) | Emergency Inpatient Health Records & Care Timeline |
| **PATIENT** | `rahul.sharma@gmail.com` | `Patient@123!` (or `patient123`) | Rahul Sharma (`PAT-300`) | Longitudinal Care Timeline, Medication Regimens, Care |

---

## 🔒 Security Notice

1. In Phase 1, public patient registration assigns `ACTIVE` status directly for immediate evaluation.
2. Hospital registration assigns `PENDING_APPROVAL` status and requires Super Admin review.
3. Super Admin credentials are automatically initialized upon startup if not present, and can be configured via environment variables `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`.

---

## 📝 Newly Registered Accounts

| Role | Name / Facility | Email Address | Password | Registered At | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PATIENT** | Vikramaditya Test | `newtest.patient1790150856826@example.com` | `NewPatient@2026!` | 2026-09-23 13:37:36 | `ACTIVE` |
| **PATIENT** | Aarav Sharma | `testpatient_1790150890407@example.com` | `PatientPass123!` | 2026-09-23 13:38:10 | `ACTIVE` |
| **HOSPITAL_ADMIN** | St. Jude Memorial Hospital | `testhosp_1790150890576@facility.com` | `HospitalAdminPass123!` | 2026-09-23 13:38:10 | `PENDING_APPROVAL` |
| **PATIENT** | Prashant Kumar | `parshantpremi693@gmail.com` | `Parsahnt789@` | 2026-09-24 10:57:08 | `ACTIVE` |
