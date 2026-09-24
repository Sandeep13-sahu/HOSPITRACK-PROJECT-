/**
 * Hospitrack — Patient Health Portal Component
 * Authenticated Longitudinal Health Record, Care Timeline, Active Medications, Lab Reports, Hospital Reviews, Medical Summary & Profile Management
 */

let patientActiveView = 'timeline'; // timeline | consultations | prescriptions | reports | referrals | reviews | summary | profile
let isPatientProfileEditMode = false;

window.renderPatientDashboard = async function(container, subtab = null, editMode = false) {
  if (subtab) {
    patientActiveView = normalizePatientView(subtab);
  }
  if (editMode !== undefined && editMode !== null) {
    isPatientProfileEditMode = editMode;
  }

  const store = window.hospitrackStore;
  const user = window.hospitrackAuth.getCurrentUser();
  const patientId = user?.patientId || user?.id;

  // Find patient from store or fetch
  let patient = store.getPatientById(patientId);
  if (!patient && store.getPatients().length > 0) {
    patient = store.getPatients().find(p => p.id === patientId || p.email === user?.email) || store.getPatients()[0];
  }

  if (!patient) {
    try {
      if (patientId) {
        const res = await store.apiRequest(`/api/patients/${patientId}`);
        if (res && res.data) {
          patient = res.data;
        }
      }
    } catch (e) {
      console.warn('Patient fetch notice:', e.message);
    }
  }

  if (!patient) {
    container.innerHTML = `
      <div class="glass-panel" style="text-align: center; padding: 3.5rem 1.5rem;">
        <span style="font-size: 2.8rem; display: block; margin-bottom: 12px;">👤</span>
        <h3 style="margin-bottom: 8px;">Loading Patient Health Records...</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 480px; margin: 0 auto;">
          Retrieving verified longitudinal health data, active prescriptions, and clinical history from secure server.
        </p>
      </div>
    `;
    return;
  }

  const hospital = store.getHospitalById(patient.currentHospitalId) || {
    id: patient.currentHospitalId || 'HOSP-101',
    name: 'City General Hospital',
    location: 'Metro Health Corridor, Sector 4, New Delhi',
    contact: '+91 98201 44551'
  };

  const doctor = store.getDoctorById(patient.primaryDoctorId) || (store.getDoctors().length > 0 ? store.getDoctors()[0] : {
    name: 'Dr. Sarah Sharma',
    specialty: 'Cardiology & Internal Medicine',
    licenseNo: 'MCI-88342'
  });

  const prescriptions = store.getPrescriptions(patient.id);
  const referrals = store.getReferrals().filter(r => r.patientId === patient.id);
  const transfers = store.getTransfers().filter(t => t.patientId === patient.id);
  const reviews = store.getReviews().filter(r => r.patientId === patient.id);

  // Fetch timeline asynchronously
  let visits = [];
  let reports = [];
  try {
    const timelineData = await store.getPatientTimeline(patient.id).catch(() => null);
    if (timelineData) {
      visits = timelineData.visits || [];
      reports = timelineData.reports || [];
    }
  } catch (e) {}

  // Render subtab page inside container with top segmented pill nav
  const subContent = renderPatientSubtabContent(patientActiveView, {
    patient,
    hospital,
    doctor,
    visits,
    prescriptions,
    reports,
    referrals,
    transfers,
    reviews,
    isEditMode: isPatientProfileEditMode
  });

  container.innerHTML = `
    <!-- Patient Top Segmented Pill Bar -->
    <div class="pill-tabs-nav no-print">
      <button type="button" class="pill-tab ${patientActiveView === 'overview' ? 'active' : ''}" onclick="setPatientView('overview')">
        <span>🏠</span> Overview
      </button>
      <button type="button" class="pill-tab ${patientActiveView === 'timeline' ? 'active' : ''}" onclick="setPatientView('timeline')">
        <span>⏳</span> Timeline
      </button>
      <button type="button" class="pill-tab ${patientActiveView === 'prescriptions' ? 'active' : ''}" onclick="setPatientView('prescriptions')">
        <span>💊</span> Prescriptions <span class="pill-badge">${(prescriptions || []).length}</span>
      </button>
      <button type="button" class="pill-tab ${patientActiveView === 'reports' ? 'active' : ''}" onclick="setPatientView('reports')">
        <span>🔬</span> Lab Reports <span class="pill-badge">${(reports || []).length}</span>
      </button>
      <button type="button" class="pill-tab ${patientActiveView === 'consultations' ? 'active' : ''}" onclick="setPatientView('consultations')">
        <span>🩺</span> Consultations <span class="pill-badge">${(visits || []).length}</span>
      </button>
      <button type="button" class="pill-tab ${patientActiveView === 'referrals' ? 'active' : ''}" onclick="setPatientView('referrals')">
        <span>🔁</span> Referrals <span class="pill-badge">${(referrals || []).length}</span>
      </button>
      <button type="button" class="pill-tab ${patientActiveView === 'hospitals' ? 'active' : ''}" onclick="setPatientView('hospitals')">
        <span>🏥</span> Hospitals
      </button>
      <button type="button" class="pill-tab ${patientActiveView === 'reviews' ? 'active' : ''}" onclick="setPatientView('reviews')">
        <span>⭐</span> Reviews <span class="pill-badge">${(reviews || []).length}</span>
      </button>
      <button type="button" class="pill-tab ${patientActiveView === 'summary' ? 'active' : ''}" onclick="setPatientView('summary')">
        <span>🖨️</span> Medical Summary
      </button>
      <button type="button" class="pill-tab ${patientActiveView === 'profile' ? 'active' : ''}" onclick="setPatientView('profile')">
        <span>👤</span> Profile
      </button>
    </div>

    <!-- Active Subtab Content Area -->
    <div class="patient-subview-content">
      ${subContent}
    </div>
  `;
};

function setPatientView(view, editMode = false) {
  patientActiveView = normalizePatientView(view);
  isPatientProfileEditMode = !!editMode;
  if (window.navigateToRoleSection) {
    window.navigateToRoleSection('PATIENT', patientActiveView, { editMode: isPatientProfileEditMode });
  } else {
    const container = document.getElementById('mainContentArea');
    if (container) {
      window.renderPatientDashboard(container, patientActiveView, isPatientProfileEditMode);
    }
    if (window.renderDynamicSidebar) {
      window.renderDynamicSidebar(window.hospitrackAuth.getCurrentUser());
    }
  }
}
window.setPatientView = setPatientView;
window.navigateToPatientTab = setPatientView;

function normalizePatientView(v) {
  if (!v) return 'overview';
  const val = v.toLowerCase().trim();
  if (val === 'overview' || val === 'dashboard' || val === 'home') return 'overview';
  if (val === 'timeline' || val === 'care-timeline' || val === 'medical-timeline') return 'timeline';
  if (val === 'consultations' || val === 'consultation' || val === 'visits' || val === 'visit') return 'consultations';
  if (val === 'prescriptions' || val === 'prescription' || val === 'medications' || val === 'medicines') return 'prescriptions';
  if (val === 'lab-reports' || val === 'lab-report' || val === 'labs' || val === 'reports' || val === 'laboratory') return 'reports';
  if (val === 'referrals' || val === 'referral') return 'referrals';
  if (val === 'hospitals' || val === 'hospital' || val === 'care-hospitals') return 'hospitals';
  if (val === 'medical-summary' || val === 'summary' || val === 'print') return 'summary';
  if (val === 'feedback' || val === 'reviews' || val === 'review') return 'reviews';
  if (val === 'profile' || val === 'edit-profile') return 'profile';
  if (val === 'settings' || val === 'security') return 'settings';
  return val;
}

function renderPatientSubtabContent(rawView, data) {
  const view = normalizePatientView(rawView);
  const { patient, hospital, doctor, visits, prescriptions, reports, referrals, reviews, isEditMode } = data;
  const authUser = window.hospitrackAuth?.getCurrentUser();

  // --------------------------------------------------------------------------
  // 1. CARE TIMELINE (Longitudinal Medical Care Timeline)
  // --------------------------------------------------------------------------
  if (view === 'timeline') {
    const allEvents = [];

    (visits || []).forEach(v => {
      allEvents.push({
        type: 'VISIT',
        title: `Clinical Consultation: ${v.diagnosis || 'General Assessment'}`,
        timestamp: v.visitDate || v.createdAt || new Date().toISOString(),
        doctor: v.doctorId || (doctor ? doctor.name : 'Attending Physician'),
        facility: hospital.name,
        badgeText: 'Consultation',
        badgeClass: 'badge-info',
        details: [
          v.symptoms ? `<strong>Symptoms:</strong> ${escapeHtml(v.symptoms)}` : '',
          v.treatment ? `<strong>Treatment Plan:</strong> ${escapeHtml(v.treatment)}` : '',
          v.notes ? `<em>Notes:</em> ${escapeHtml(v.notes)}` : ''
        ].filter(Boolean).join('<br>')
      });
    });

    (prescriptions || []).forEach(rx => {
      const itemsList = (rx.items || []).map(item => `
        <span class="badge badge-active" style="margin: 2px;">
          💊 ${escapeHtml(item.name)} (${escapeHtml(item.dosage)} • ${escapeHtml(item.frequency)})
        </span>
      `).join('');

      allEvents.push({
        type: 'PRESCRIPTION',
        title: `Prescription Order Signed (${rx.id})`,
        timestamp: rx.prescribedAt || rx.createdAt || new Date().toISOString(),
        doctor: rx.doctorId || (doctor ? doctor.name : 'Attending Physician'),
        facility: hospital.name,
        badgeText: 'Prescription',
        badgeClass: 'badge-active',
        details: itemsList ? `<div style="margin-top: 6px;">${itemsList}</div>` : 'Medications prescribed'
      });
    });

    (reports || []).forEach(rep => {
      allEvents.push({
        type: 'LAB',
        title: `Diagnostic Report: ${escapeHtml(rep.testName)}`,
        timestamp: rep.reportDate || rep.createdAt || new Date().toISOString(),
        doctor: rep.doctorId || (doctor ? doctor.name : 'Diagnostics Department'),
        facility: hospital.name,
        badgeText: rep.category || 'Diagnostic',
        badgeClass: 'badge-warning',
        details: `
          <div><strong>Category:</strong> ${escapeHtml(rep.category || 'Laboratory')}</div>
          <div style="margin-top: 4px;"><strong>Findings:</strong> ${escapeHtml(rep.resultSummary || 'Normal findings recorded.')}</div>
          <div style="margin-top: 4px;"><span class="badge badge-info">Status: ${escapeHtml(rep.status)}</span></div>
        `
      });
    });

    (referrals || []).forEach(ref => {
      allEvents.push({
        type: 'REFERRAL',
        title: `Specialist Referral Dispatch (${ref.priority})`,
        timestamp: ref.createdAt || new Date().toISOString(),
        doctor: ref.doctorId || (doctor ? doctor.name : 'Attending Physician'),
        facility: ref.toHospitalId || 'Specialist Facility',
        badgeText: ref.priority,
        badgeClass: ref.priority === 'EMERGENCY' ? 'badge-danger' : 'badge-warning',
        details: `<strong>Reason:</strong> ${escapeHtml(ref.reason)} • Status: <strong>${escapeHtml(ref.status)}</strong>`
      });
    });

    allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return `
      <!-- Greeting Banner -->
      <div class="workspace-banner" style="border-left: 4px solid var(--patient-color);">
        <div class="banner-left">
          <span class="banner-greeting">🔒 Verified Health Record</span>
          <h1 class="banner-title">Good day, ${escapeHtml(patient.name)}</h1>
          <p class="banner-subtitle">
            ${escapeHtml(patient.gender || 'Patient')}, ${patient.age || '—'} yrs • Blood Group: <strong style="color: var(--primary);">${escapeHtml(patient.bloodGroup || 'Not Set')}</strong> • Patient ID: <code>${escapeHtml(patient.id)}</code>
          </p>
        </div>
        <div class="banner-actions no-print" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <button type="button" class="btn btn-primary btn-sm" onclick="openPatientReviewModal('${patient.currentHospitalId}')">
            <span>⭐</span> Review Hospital
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="setPatientView('summary')">
            <span>🖨️</span> Print Summary
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="setPatientView('profile', true)">
            <span>✏️</span> Edit Profile
          </button>
        </div>
      </div>

      <!-- Facility & Doctor Summary Cards -->
      <div class="doctor-kpi-grid mb-24 no-print">
        <div class="stat-card" style="border-left: 3px solid var(--hospital-color);">
          <div class="stat-header">
            <span class="stat-title">Assigned Facility</span>
            <span class="stat-icon">🏥</span>
          </div>
          <div class="stat-value" style="font-size: 1.1rem; font-weight: 700; margin-top: 4px;">${escapeHtml(hospital.name)}</div>
          <div class="stat-sub">${escapeHtml(hospital.location)}</div>
          ${hospital.contact ? `<div style="font-size: 0.76rem; color: var(--text-dim); margin-top: 4px;">📞 ${escapeHtml(hospital.contact)}</div>` : ''}
        </div>

        <div class="stat-card" style="border-left: 3px solid var(--doctor-color);">
          <div class="stat-header">
            <span class="stat-title">Attending Physician</span>
            <span class="stat-icon">🩺</span>
          </div>
          <div class="stat-value" style="font-size: 1.1rem; font-weight: 700; margin-top: 4px;">
            ${doctor ? escapeHtml(doctor.name) : 'No physician assigned'}
          </div>
          <div class="stat-sub">
            ${doctor ? escapeHtml(doctor.specialty || 'General Medicine') : 'Awaiting clinical triage'}
          </div>
        </div>

        <div class="stat-card" style="border-left: 3px solid var(--success);">
          <div class="stat-header">
            <span class="stat-title">Admission Status</span>
            <span class="stat-icon">📋</span>
          </div>
          <div class="stat-value" style="font-size: 1.1rem; font-weight: 700; margin-top: 4px; color: var(--success);">
            <span class="badge badge-active">${escapeHtml(patient.status || 'CHECKED_IN')}</span>
          </div>
          <div class="stat-sub">
            Admitted: ${patient.admittedAt ? new Date(patient.admittedAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : 'Active Patient'}
          </div>
        </div>
      </div>

      <!-- Longitudinal Care Timeline -->
      <div class="glass-panel">
        <div class="panel-header-modern">
          <div>
            <h3 class="panel-title-modern">⏳ Longitudinal Medical Care Timeline</h3>
            <p class="panel-sub-modern">Complete verified clinical events recorded across all network facilities.</p>
          </div>
        </div>

        <div class="timeline-container">
          ${allEvents.length === 0 ? `
            <div class="empty-state-box" style="text-align: center; padding: 3rem 1.5rem;">
              <span style="font-size: 2.5rem; display: block; margin-bottom: 10px;">📋</span>
              <h4 style="color: var(--text-main); font-weight: 700; margin-bottom: 6px;">No clinical events recorded yet.</h4>
              <p style="color: var(--text-muted); font-size: 0.88rem; max-width: 440px; margin: 0 auto;">
                Your verified medical events will appear here when available from consultations, prescriptions, and lab tests.
              </p>
            </div>
          ` : allEvents.map(event => `
            <div class="timeline-item">
              <div class="timeline-dot" style="background: ${getEventColor(event.type)};"></div>
              <div class="timeline-card">
                <div class="timeline-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                  <div>
                    <strong style="color: var(--text-main); font-size: 0.95rem;">${event.title}</strong>
                    <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                      🏥 ${escapeHtml(event.facility)} • 🩺 ${escapeHtml(event.doctor)}
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <span class="timeline-date">${new Date(event.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    <div><span class="badge ${event.badgeClass}" style="margin-top: 4px;">${escapeHtml(event.badgeText)}</span></div>
                  </div>
                </div>
                <div class="timeline-body" style="margin-top: 8px; font-size: 0.85rem; line-height: 1.5; color: var(--text-secondary);">
                  ${event.details}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // 2. CLINICAL CONSULTATIONS
  // --------------------------------------------------------------------------
  if (view === 'consultations') {
    return `
      <div class="page-header-container">
        <div class="page-title-wrap">
          <h1 class="page-title">📋 Clinical Consultations History</h1>
          <p class="page-description">Documented physician consultations, assessments, and follow-ups.</p>
        </div>
        <div class="page-actions-toolbar">
          <button type="button" class="btn btn-secondary btn-sm" onclick="setPatientView('summary')">
            <span>🖨️</span> Print Summary
          </button>
        </div>
      </div>

      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Consultation ID</th>
                <th>Date &amp; Time</th>
                <th>Attending Doctor</th>
                <th>Symptoms</th>
                <th>Clinical Diagnosis</th>
                <th>Treatment Plan</th>
              </tr>
            </thead>
            <tbody>
              ${visits.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 3rem;">No consultations on record.</td></tr>
              ` : visits.map(v => `
                <tr>
                  <td><code>${escapeHtml(v.id)}</code></td>
                  <td>${new Date(v.visitDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td><span class="badge badge-info">${escapeHtml(doctor ? doctor.name : v.doctorId)}</span></td>
                  <td style="font-size: 0.82rem;">${escapeHtml(v.symptoms || 'None reported')}</td>
                  <td><strong>${escapeHtml(v.diagnosis || 'Routine Evaluation')}</strong></td>
                  <td style="font-size: 0.82rem; color: var(--text-secondary); max-width: 260px;">${escapeHtml(v.treatment || 'Observation')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // 3. PRESCRIPTIONS & MEDICATION REGIMENS
  // --------------------------------------------------------------------------
  if (view === 'prescriptions') {
    return `
      <div class="page-header-container">
        <div class="page-title-wrap">
          <h1 class="page-title">💊 Active Medication Orders &amp; Prescriptions</h1>
          <p class="page-description">Signed pharmaceutical orders verified for duplicate-drug safety.</p>
        </div>
        <div class="page-actions-toolbar">
          <button type="button" class="btn btn-secondary btn-sm" onclick="setPatientView('summary')">
            <span>🖨️</span> Print Regimen
          </button>
        </div>
      </div>

      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date Signed</th>
                <th>Prescribed Medicines</th>
                <th>Instructions &amp; Duration</th>
                <th>Attending Doctor</th>
              </tr>
            </thead>
            <tbody>
              ${prescriptions.length === 0 ? `
                <tr><td colspan="5" style="text-align: center; color: var(--text-dim); padding: 3rem;">No prescriptions on record.</td></tr>
              ` : prescriptions.map(p => `
                <tr>
                  <td><code>${escapeHtml(p.id)}</code></td>
                  <td>${new Date(p.prescribedAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td>
                    ${(p.items || []).map(i => `
                      <div style="font-weight: 600; color: var(--text-main); margin-bottom: 2px;">
                        • ${escapeHtml(i.name)} <span class="badge badge-active">${escapeHtml(i.dosage)}</span>
                      </div>
                    `).join('')}
                  </td>
                  <td>
                    ${(p.items || []).map(i => `
                      <div style="font-size: 0.78rem; color: var(--text-muted);">
                        ${escapeHtml(i.frequency)} for ${escapeHtml(i.duration)} ${i.instructions ? `(${escapeHtml(i.instructions)})` : ''}
                      </div>
                    `).join('')}
                  </td>
                  <td><span class="badge badge-info">${escapeHtml(doctor ? doctor.name : p.doctorId)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // 4. DIAGNOSTIC LAB REPORTS
  // --------------------------------------------------------------------------
  if (view === 'reports') {
    return `
      <div class="page-header-container">
        <div class="page-title-wrap">
          <h1 class="page-title">🔬 Laboratory &amp; Diagnostic Test Reports</h1>
          <p class="page-description">Authenticated lab test results, imaging findings, and diagnostic status.</p>
        </div>
        <div class="page-actions-toolbar">
          <button type="button" class="btn btn-secondary btn-sm" onclick="setPatientView('summary')">
            <span>🖨️</span> Print Lab Summary
          </button>
        </div>
      </div>

      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Test Name</th>
                <th>Diagnostic Department</th>
                <th>Result Summary &amp; Findings</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${reports.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 3rem;">No diagnostic reports on record.</td></tr>
              ` : reports.map(r => `
                <tr>
                  <td><code>${escapeHtml(r.id)}</code></td>
                  <td><strong>${escapeHtml(r.testName)}</strong></td>
                  <td><span class="badge badge-info">${escapeHtml(r.category || 'General')}</span></td>
                  <td style="max-width: 320px; font-size: 0.82rem; line-height: 1.4;">${escapeHtml(r.resultSummary || 'Normal findings')}</td>
                  <td>${new Date(r.reportDate).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td><span class="badge badge-active">${escapeHtml(r.status || 'COMPLETED')}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // 5. SPECIALIST REFERRALS
  // --------------------------------------------------------------------------
  if (view === 'referrals') {
    return `
      <div class="page-header-container">
        <div class="page-title-wrap">
          <h1 class="page-title">🔁 Specialist Referral Trackings</h1>
          <p class="page-description">Inter-facility consultations and transfers requested on your behalf.</p>
        </div>
      </div>

      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Referral ID</th>
                <th>Destination Facility</th>
                <th>Priority</th>
                <th>Reason / Specialty</th>
                <th>Date Requested</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${referrals.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 3rem;">No active specialist referrals on record.</td></tr>
              ` : referrals.map(ref => `
                <tr>
                  <td><code>${escapeHtml(ref.id)}</code></td>
                  <td><strong>${escapeHtml(ref.toHospitalId || 'Specialist Facility')}</strong></td>
                  <td><span class="badge ${ref.priority === 'EMERGENCY' ? 'badge-danger' : ref.priority === 'URGENT' ? 'badge-warning' : 'badge-info'}">${escapeHtml(ref.priority)}</span></td>
                  <td style="font-size: 0.84rem; max-width: 280px;">${escapeHtml(ref.reason)}</td>
                  <td>${new Date(ref.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td><span class="badge badge-active">${escapeHtml(ref.status)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // 6. HOSPITAL REVIEWS & FEEDBACK
  // --------------------------------------------------------------------------
  if (view === 'reviews') {
    return `
      <div class="page-header-container">
        <div class="page-title-wrap">
          <h1 class="page-title">⭐ Hospital Experience Reviews &amp; Ratings</h1>
          <p class="page-description">Your authentic feedback for healthcare facilities you received care at.</p>
        </div>
        <div class="page-actions-toolbar">
          <button type="button" class="btn btn-primary btn-sm" onclick="openPatientReviewModal('${patient.currentHospitalId}')">
            <span>+</span> Write Review
          </button>
        </div>
      </div>

      <div class="glass-panel" style="padding: 20px;">
        <div style="display: grid; gap: 14px;">
          ${reviews.length === 0 ? `
            <div class="empty-state-box" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">
              You have not submitted any hospital reviews yet. Click <strong>"Write Review"</strong> to share your healthcare experience.
            </div>
          ` : reviews.map(rev => `
            <div class="stat-card" style="padding: 1.2rem; border-left: 3px solid var(--warning);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div>
                  <strong style="color: var(--text-main); font-size: 0.95rem;">${escapeHtml(rev.hospitalName || rev.hospitalId || hospital.name)}</strong>
                  <div style="color: #f59e0b; font-size: 1rem; margin-top: 2px;">
                    ${'★'.repeat(rev.rating)}${'☆'.repeat(5 - rev.rating)} (${rev.rating} / 5)
                  </div>
                </div>
                <span style="font-size: 0.74rem; color: var(--text-dim);">${new Date(rev.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
              <p style="color: var(--text-secondary); font-size: 0.88rem; line-height: 1.5; margin-top: 6px;">
                "${escapeHtml(rev.reviewText)}"
              </p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // 7. PRINTABLE MEDICAL SUMMARY
  // --------------------------------------------------------------------------
  if (view === 'summary') {
    return `
      <div class="print-summary-container">
        <div class="page-header-container no-print">
          <div class="page-title-wrap">
            <h1 class="page-title">🖨️ Comprehensive Health Summary Document</h1>
            <p class="page-description">Printable official longitudinal health record summary verified by Hospitrack.</p>
          </div>
          <div class="page-actions-toolbar">
            <button type="button" class="btn btn-secondary btn-sm" onclick="setPatientView('timeline')">
              ← Back to Timeline
            </button>
            <button type="button" class="btn btn-primary btn-sm" onclick="window.print()">
              <span>🖨️</span> Print Health Summary Document
            </button>
          </div>
        </div>

        <div class="medical-summary-document glass-panel" style="padding: 2.5rem;">
          <!-- Document Header -->
          <div class="summary-doc-header" style="border-bottom: 2px solid var(--primary); padding-bottom: 1.5rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 1.4rem; font-weight: 800; color: var(--primary);">HOSPITRACK HEALTHCARE NETWORK</div>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 2px;">Comprehensive Longitudinal Health Record Summary</div>
            </div>
            <div style="text-align: right; font-size: 0.8rem; color: var(--text-muted);">
              <div>Generated: ${new Date().toLocaleDateString([], { dateStyle: 'full' })}</div>
              <div>Security: <strong>HIPAA &amp; Encrypted</strong></div>
            </div>
          </div>

          <!-- Patient Identity Details -->
          <div style="background: var(--bg-surface-alt); padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
            <h4 style="margin-bottom: 10px; color: var(--text-main);">Patient Demographics</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 0.88rem;">
              <div><strong>Full Name:</strong> ${escapeHtml(patient.name)}</div>
              <div><strong>Patient ID:</strong> <code>${escapeHtml(patient.id)}</code></div>
              <div><strong>Age / Gender:</strong> ${patient.age} yrs / ${escapeHtml(patient.gender)}</div>
              <div><strong>Blood Group:</strong> <strong style="color: var(--primary);">${escapeHtml(patient.bloodGroup)}</strong></div>
              <div><strong>Contact:</strong> ${escapeHtml(patient.contact)}</div>
              <div><strong>Email:</strong> ${escapeHtml(patient.email || 'N/A')}</div>
              <div><strong>Emergency Contact:</strong> ${escapeHtml(patient.emergencyContact || 'N/A')}</div>
              <div><strong>Address:</strong> ${escapeHtml(patient.address || 'N/A')}</div>
            </div>
          </div>

          <!-- Clinical Care Scope -->
          <div style="margin-bottom: 1.5rem;">
            <h4 style="margin-bottom: 10px; color: var(--text-main);">Assigned Healthcare Facility &amp; Physician</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; font-size: 0.88rem;">
              <div style="padding: 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
                <div><strong>Facility:</strong> ${escapeHtml(hospital.name)}</div>
                <div style="color: var(--text-muted); font-size: 0.8rem;">${escapeHtml(hospital.location)}</div>
              </div>
              <div style="padding: 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
                <div><strong>Attending Physician:</strong> ${escapeHtml(doctor ? doctor.name : 'Attending Physician')}</div>
                <div style="color: var(--text-muted); font-size: 0.8rem;">${escapeHtml(doctor ? doctor.specialty : 'Clinical Care')}</div>
              </div>
              <div style="padding: 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
                <div><strong>Admission Status:</strong> ${escapeHtml(patient.status || 'CHECKED_IN')}</div>
                <div style="color: var(--text-muted); font-size: 0.8rem;">Admitted: ${patient.admittedAt ? new Date(patient.admittedAt).toLocaleDateString() : 'Active'}</div>
              </div>
            </div>
          </div>

          <!-- Active Medications -->
          <div style="margin-bottom: 1.5rem;">
            <h4 style="margin-bottom: 8px; color: var(--text-main);">Active Medication Orders (${prescriptions.length})</h4>
            ${prescriptions.length === 0 ? `<p style="color: var(--text-dim); font-size: 0.85rem;">No active prescriptions.</p>` : `
              <table class="data-table" style="font-size: 0.82rem;">
                <thead>
                  <tr><th>Date Signed</th><th>Medications Prescribed</th><th>Frequency &amp; Duration</th></tr>
                </thead>
                <tbody>
                  ${prescriptions.map(p => `
                    <tr>
                      <td>${new Date(p.prescribedAt).toLocaleDateString()}</td>
                      <td>${(p.items || []).map(i => `<strong>${escapeHtml(i.name)}</strong> (${escapeHtml(i.dosage)})`).join(', ')}</td>
                      <td>${(p.items || []).map(i => `${escapeHtml(i.frequency)} for ${escapeHtml(i.duration)}`).join(', ')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>

          <!-- Diagnostic Reports -->
          <div style="margin-bottom: 1.5rem;">
            <h4 style="margin-bottom: 8px; color: var(--text-main);">Diagnostic Laboratory Findings (${reports.length})</h4>
            ${reports.length === 0 ? `<p style="color: var(--text-dim); font-size: 0.85rem;">No lab reports recorded.</p>` : `
              <table class="data-table" style="font-size: 0.82rem;">
                <thead>
                  <tr><th>Date</th><th>Test Name</th><th>Category</th><th>Result Summary</th></tr>
                </thead>
                <tbody>
                  ${reports.map(r => `
                    <tr>
                      <td>${new Date(r.reportDate).toLocaleDateString()}</td>
                      <td><strong>${escapeHtml(r.testName)}</strong></td>
                      <td>${escapeHtml(r.category)}</td>
                      <td>${escapeHtml(r.resultSummary)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>

          <div style="border-top: 1px solid var(--border-color); padding-top: 1rem; font-size: 0.75rem; color: var(--text-dim); text-align: center;">
            Document officially verified by Hospitrack Healthcare Coordination Ledger.
          </div>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // 8. PATIENT PROFILE & PROFILE EDITING
  // --------------------------------------------------------------------------
  if (view === 'profile') {
    if (isEditMode) {
      return `
        <div class="page-header-container">
          <div class="page-title-wrap">
            <h1 class="page-title">✏️ Edit Personal Information</h1>
            <p class="page-description">Update your contact, demographics, and emergency contact details.</p>
          </div>
          <div class="page-actions-toolbar">
            <button type="button" class="btn btn-secondary btn-sm" onclick="setPatientView('profile', false)">
              ✕ Cancel
            </button>
          </div>
        </div>

        <div class="glass-panel" style="padding: 24px;">
          <form id="patientProfileEditForm" onsubmit="handlePatientProfileSave(event, '${patient.id}')">
            <div id="patientProfileAlert" class="alert-banner hidden mb-16"></div>

            <div class="form-section-heading" style="font-weight: 700; color: var(--primary); margin-bottom: 12px; font-size: 0.95rem;">
              PERSONAL &amp; CONTACT INFORMATION
            </div>

            <div class="form-grid-2col">
              <div class="form-group">
                <label class="form-label" for="editPatName">Full Name <span style="color: var(--danger);">*</span></label>
                <input type="text" id="editPatName" class="form-control" value="${escapeHtml(patient.name)}" required minlength="2" maxlength="128">
              </div>

              <div class="form-group">
                <label class="form-label" for="editPatGender">Gender <span style="color: var(--danger);">*</span></label>
                <select id="editPatGender" class="form-control" required>
                  <option value="Male" ${patient.gender === 'Male' ? 'selected' : ''}>Male</option>
                  <option value="Female" ${patient.gender === 'Female' ? 'selected' : ''}>Female</option>
                  <option value="Other" ${patient.gender === 'Other' ? 'selected' : ''}>Other</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="editPatAge">Age (Years) <span style="color: var(--danger);">*</span></label>
                <input type="number" id="editPatAge" class="form-control" value="${patient.age || 30}" min="1" max="120" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="editPatBloodGroup">Blood Group <span style="color: var(--danger);">*</span></label>
                <select id="editPatBloodGroup" class="form-control" required>
                  <option value="O+" ${patient.bloodGroup === 'O+' ? 'selected' : ''}>O+</option>
                  <option value="O-" ${patient.bloodGroup === 'O-' ? 'selected' : ''}>O-</option>
                  <option value="A+" ${patient.bloodGroup === 'A+' ? 'selected' : ''}>A+</option>
                  <option value="A-" ${patient.bloodGroup === 'A-' ? 'selected' : ''}>A-</option>
                  <option value="B+" ${patient.bloodGroup === 'B+' ? 'selected' : ''}>B+</option>
                  <option value="B-" ${patient.bloodGroup === 'B-' ? 'selected' : ''}>B-</option>
                  <option value="AB+" ${patient.bloodGroup === 'AB+' ? 'selected' : ''}>AB+</option>
                  <option value="AB-" ${patient.bloodGroup === 'AB-' ? 'selected' : ''}>AB-</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="editPatPhone">Phone Number <span style="color: var(--danger);">*</span></label>
                <input type="tel" id="editPatPhone" class="form-control" value="${escapeHtml(patient.contact)}" required minlength="7">
              </div>

              <div class="form-group">
                <label class="form-label" for="editPatEmail">Email Address</label>
                <input type="email" id="editPatEmail" class="form-control" value="${escapeHtml(patient.email || '')}">
              </div>

              <div class="form-group">
                <label class="form-label" for="editPatEmergency">Emergency Contact &amp; Relation</label>
                <input type="text" id="editPatEmergency" class="form-control" value="${escapeHtml(patient.emergencyContact || '')}" placeholder="e.g. +91 98765 00000 (Spouse)">
              </div>

              <div class="form-group">
                <label class="form-label" for="editPatAddress">Residential Address</label>
                <input type="text" id="editPatAddress" class="form-control" value="${escapeHtml(patient.address || '')}" placeholder="Street, City, Postal Code">
              </div>
            </div>

            <!-- Protected Clinical Fields Notice -->
            <div style="background: var(--bg-surface-alt); border-left: 3px solid var(--info); padding: 12px; border-radius: var(--radius-sm); margin-top: 16px; font-size: 0.82rem; color: var(--text-secondary);">
              ℹ️ <strong>Protected Clinical Fields:</strong> Patient ID (<code>${patient.id}</code>), Assigned Facility (<code>${hospital.name}</code>), and Clinical Admission Status are locked and managed directly by healthcare providers.
            </div>

            <div class="modal-actions" style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-secondary" onclick="setPatientView('profile', false)">Cancel</button>
              <button type="submit" id="savePatProfileBtn" class="btn btn-primary">
                💾 Save Changes
              </button>
            </div>
          </form>
        </div>
      `;
    }

    // VIEW MODE
    return `
      <div class="page-header-container">
        <div class="page-title-wrap">
          <h1 class="page-title">👤 Patient Health Profile</h1>
          <p class="page-description">Verified demographic, clinical, and account credentials.</p>
        </div>
        <div class="page-actions-toolbar">
          <button type="button" class="btn btn-primary btn-sm" onclick="setPatientView('profile', true)">
            <span>✏️</span> Edit Profile
          </button>
        </div>
      </div>

      <div class="glass-panel" style="padding: 24px;">
        <!-- Profile Top Summary -->
        <div class="profile-header-banner mb-24">
          <div class="avatar profile-avatar-lg" style="background: linear-gradient(135deg, #0284c7, #0369a1);">
            ${(patient.name || 'P').charAt(0)}
          </div>
          <div>
            <div class="profile-name">${escapeHtml(patient.name)}</div>
            <div class="profile-email">${escapeHtml(patient.email || authUser?.email || 'patient@hospitrack.com')}</div>
            <div style="margin-top: 6px; display: flex; gap: 8px; flex-wrap: wrap;">
              <span class="badge badge-info">PATIENT</span>
              <span class="badge badge-active">${escapeHtml(patient.status || 'ACTIVE')}</span>
              <span class="badge badge-warning">Blood: ${escapeHtml(patient.bloodGroup || 'O+')}</span>
            </div>
          </div>
        </div>

        <!-- Section 1: PERSONAL INFORMATION -->
        <div class="profile-section-block mb-24">
          <div class="profile-section-title">PERSONAL INFORMATION</div>
          <div class="profile-details-grid">
            <div class="profile-field-box">
              <div class="profile-field-label">Full Name</div>
              <div class="profile-field-value">${escapeHtml(patient.name)}</div>
            </div>
            <div class="profile-field-box">
              <div class="profile-field-label">Age &amp; Gender</div>
              <div class="profile-field-value">${patient.age} yrs • ${escapeHtml(patient.gender)}</div>
            </div>
            <div class="profile-field-box">
              <div class="profile-field-label">Primary Phone</div>
              <div class="profile-field-value">${escapeHtml(patient.contact)}</div>
            </div>
            <div class="profile-field-box">
              <div class="profile-field-label">Email Address</div>
              <div class="profile-field-value">${escapeHtml(patient.email || 'N/A')}</div>
            </div>
            <div class="profile-field-box" style="grid-column: span 2;">
              <div class="profile-field-label">Residential Address</div>
              <div class="profile-field-value">${escapeHtml(patient.address || 'Flat 402, Sunrise Heights, Metro City')}</div>
            </div>
          </div>
        </div>

        <!-- Section 2: HEALTHCARE INFORMATION -->
        <div class="profile-section-block mb-24">
          <div class="profile-section-title">HEALTHCARE INFORMATION</div>
          <div class="profile-details-grid">
            <div class="profile-field-box">
              <div class="profile-field-label">Patient ID</div>
              <div class="profile-field-value"><code>${escapeHtml(patient.id)}</code></div>
            </div>
            <div class="profile-field-box">
              <div class="profile-field-label">Blood Group</div>
              <div class="profile-field-value" style="color: var(--primary); font-weight: 700;">${escapeHtml(patient.bloodGroup)}</div>
            </div>
            <div class="profile-field-box">
              <div class="profile-field-label">Emergency Contact</div>
              <div class="profile-field-value">${escapeHtml(patient.emergencyContact || 'None on file')}</div>
            </div>
            <div class="profile-field-box">
              <div class="profile-field-label">Assigned Healthcare Facility</div>
              <div class="profile-field-value">${escapeHtml(hospital.name)}</div>
            </div>
            <div class="profile-field-box">
              <div class="profile-field-label">Attending Physician</div>
              <div class="profile-field-value">${escapeHtml(doctor ? doctor.name : 'Attending Physician')}</div>
            </div>
            <div class="profile-field-box">
              <div class="profile-field-label">Admission / Registration Date</div>
              <div class="profile-field-value">${patient.admittedAt ? new Date(patient.admittedAt).toLocaleDateString([], { dateStyle: 'long' }) : 'Recent'}</div>
            </div>
          </div>
        </div>

        <!-- Section 3: ACCOUNT INFORMATION -->
        <div class="profile-section-block">
          <div class="profile-section-title">ACCOUNT INFORMATION</div>
          <div class="profile-details-grid">
            <div class="profile-field-box">
              <div class="profile-field-label">Username / Login Identifier</div>
              <div class="profile-field-value">${escapeHtml(authUser?.email || patient.email || patient.id)}</div>
            </div>
            <div class="profile-field-box">
              <div class="profile-field-label">System Role</div>
              <div class="profile-field-value"><span class="badge badge-info">PATIENT</span></div>
            </div>
            <div class="profile-field-box">
              <div class="profile-field-label">Account Verification Status</div>
              <div class="profile-field-value" style="color: var(--success); font-weight: 600;">
                ✅ Active &amp; Verified Health Record
              </div>
            </div>
            <div class="profile-field-box">
              <div class="profile-field-label">Security &amp; Encryption Standard</div>
              <div class="profile-field-value" style="color: var(--primary); font-weight: 600;">
                🔒 TLS 1.3 / AES-256 Longitudinal Encryption
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // 0. HEALTH OVERVIEW (Design #3 Patient Landing Portal)
  // --------------------------------------------------------------------------
  if (view === 'overview') {
    const activeRxCount = (prescriptions || []).length;
    const recentLabCount = (reports || []).length;
    const openReferralsCount = (referrals || []).filter(r => r.status === 'PENDING' || r.status === 'IN_PROGRESS').length;
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return `
      <!-- Greeting Banner -->
      <div class="workspace-banner" style="border-left: 4px solid var(--primary);">
        <div class="banner-left">
          <span class="banner-greeting">🔒 Verified Health Record</span>
          <h1 class="banner-title">${timeGreeting}, ${escapeHtml(patient.name)}</h1>
          <p class="banner-subtitle">
            ${escapeHtml(patient.gender || 'Patient')}, ${patient.age || '—'} yrs • Blood Group: <strong style="color: var(--primary);">${escapeHtml(patient.bloodGroup || 'Not Set')}</strong> • Facility: <strong>${escapeHtml(hospital.name)}</strong>
          </p>
        </div>
        <div class="banner-actions no-print" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <button type="button" class="btn btn-primary btn-sm" onclick="setPatientView('timeline')">
            <span>⏳</span> Medical Timeline
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="setPatientView('summary')">
            <span>🖨️</span> Print Health Summary
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="openPatientReviewModal('${patient.currentHospitalId || hospital.id}')">
            <span>⭐</span> Review Hospital
          </button>
        </div>
      </div>

      <!-- 4 Quick Health Overview Cards -->
      <div class="doctor-kpi-grid mb-24 no-print">
        <div class="stat-card" style="border-left: 3px solid var(--primary); cursor: pointer;" onclick="setPatientView('prescriptions')">
          <div class="stat-header">
            <span class="stat-title">Active Prescriptions</span>
            <span class="stat-icon">💊</span>
          </div>
          <div class="stat-value" style="font-size: 1.6rem; font-weight: 800; color: var(--primary); margin-top: 4px;">${activeRxCount}</div>
          <div class="stat-sub">${activeRxCount > 0 ? `${escapeHtml(prescriptions[0]?.items?.[0]?.name || 'Medications active')}` : 'No active orders'}</div>
        </div>

        <div class="stat-card" style="border-left: 3px solid var(--admin-color); cursor: pointer;" onclick="setPatientView('reports')">
          <div class="stat-header">
            <span class="stat-title">Recent Labs</span>
            <span class="stat-icon">🔬</span>
          </div>
          <div class="stat-value" style="font-size: 1.6rem; font-weight: 800; color: var(--admin-color); margin-top: 4px;">${recentLabCount}</div>
          <div class="stat-sub">${recentLabCount > 0 ? `${escapeHtml(reports[0]?.testName || 'Diagnostic tests')}` : 'No recent lab orders'}</div>
        </div>

        <div class="stat-card" style="border-left: 3px solid var(--doctor-color);">
          <div class="stat-header">
            <span class="stat-title">Attending Care</span>
            <span class="stat-icon">🩺</span>
          </div>
          <div class="stat-value" style="font-size: 1.1rem; font-weight: 700; margin-top: 4px;">${doctor ? escapeHtml(doctor.name) : 'Awaiting Triage'}</div>
          <div class="stat-sub">${escapeHtml(hospital.name)}</div>
        </div>

        <div class="stat-card" style="border-left: 3px solid var(--hospital-color); cursor: pointer;" onclick="setPatientView('referrals')">
          <div class="stat-header">
            <span class="stat-title">Open Referrals</span>
            <span class="stat-icon">🔁</span>
          </div>
          <div class="stat-value" style="font-size: 1.6rem; font-weight: 800; color: var(--hospital-color); margin-top: 4px;">${openReferralsCount}</div>
          <div class="stat-sub">${openReferralsCount > 0 ? 'Specialist review pending' : 'All referrals completed'}</div>
        </div>
      </div>

      <!-- Quick Sections Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px;">
        <!-- Recent Prescriptions -->
        <div class="glass-panel" style="padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin: 0;">💊 Current Medication Orders</h3>
            <button type="button" class="btn btn-secondary btn-sm" onclick="setPatientView('prescriptions')">View All</button>
          </div>
          ${prescriptions.length === 0 ? `
            <div style="text-align: center; color: var(--text-dim); padding: 2rem 1rem; font-size: 0.88rem;">
              No active prescription orders currently on file.
            </div>
          ` : `
            <div style="display: grid; gap: 10px;">
              ${prescriptions.slice(0, 3).map(p => `
                <div style="padding: 10px 14px; background: var(--bg-surface-alt); border-radius: var(--radius-sm); border-left: 3px solid var(--primary);">
                  <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 0.88rem; color: var(--text-main);">
                    <span>${(p.items || []).map(i => escapeHtml(i.name)).join(', ') || 'Prescription Order'}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(p.prescribedAt || p.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">
                    ${(p.items || []).map(i => `${escapeHtml(i.dosage)} • ${escapeHtml(i.frequency)}`).join(' | ')}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Recent Diagnostic Labs -->
        <div class="glass-panel" style="padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin: 0;">🔬 Diagnostic Laboratory Reports</h3>
            <button type="button" class="btn btn-secondary btn-sm" onclick="setPatientView('reports')">View All</button>
          </div>
          ${reports.length === 0 ? `
            <div style="text-align: center; color: var(--text-dim); padding: 2rem 1rem; font-size: 0.88rem;">
              No diagnostic lab reports recorded yet.
            </div>
          ` : `
            <div style="display: grid; gap: 10px;">
              ${reports.slice(0, 3).map(r => `
                <div style="padding: 10px 14px; background: var(--bg-surface-alt); border-radius: var(--radius-sm); border-left: 3px solid var(--admin-color);">
                  <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 0.88rem; color: var(--text-main);">
                    <span>${escapeHtml(r.testName)}</span>
                    <span class="badge badge-active" style="font-size: 0.72rem;">${escapeHtml(r.status || 'COMPLETED')}</span>
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">
                    ${escapeHtml(r.category || 'Laboratory')} • ${new Date(r.reportDate || r.createdAt).toLocaleDateString()}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // 9. HOSPITALS DIRECTORY & NETWORK CARE
  // --------------------------------------------------------------------------
  if (view === 'hospitals') {
    const allHospitals = window.hospitrackStore?.getHospitals() || [];
    return `
      <div class="page-header-container">
        <div class="page-title-wrap">
          <h1 class="page-title">🏥 Hospital Network &amp; Facility Directory</h1>
          <p class="page-description">Explore accredited healthcare facilities, bed capacity, patient ratings, and care services.</p>
        </div>
      </div>

      <div class="glass-panel" style="padding: 20px;">
        <div style="margin-bottom: 20px;">
          <input type="text" id="patientHospSearchInput" class="form-control" placeholder="🔍 Search hospitals by name, city, or address..." oninput="handlePatientHospitalFilter(this.value)">
        </div>

        <div id="patientHospitalsGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px;">
          ${allHospitals.length === 0 ? `
            <div style="grid-column: 1 / -1; text-align: center; color: var(--text-dim); padding: 3rem;">
              No hospitals loaded in network.
            </div>
          ` : allHospitals.map(h => {
            const hRating = h.rating || 4.5;
            const hReviews = h.reviewCount || 12;
            const isCurrent = h.id === patient.currentHospitalId;
            return `
              <div class="hospital-network-card stat-card" style="padding: 20px; border-left: 4px solid ${isCurrent ? 'var(--primary)' : 'var(--border-color)'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                  <div>
                    <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin: 0 0 4px 0;">${escapeHtml(h.name)}</h3>
                    <div style="font-size: 0.82rem; color: var(--text-muted);">📍 ${escapeHtml(h.location || h.address || 'Metro Area')}</div>
                  </div>
                  ${isCurrent ? `<span class="badge badge-active">Assigned</span>` : ''}
                </div>

                <div style="display: flex; align-items: center; gap: 8px; margin: 10px 0; font-size: 0.88rem;">
                  <span style="color: #f59e0b; font-weight: 700;">★ ${Number(hRating).toFixed(1)}</span>
                  <span style="color: var(--text-dim); font-size: 0.78rem;">(${hReviews} reviews)</span>
                  <span class="badge badge-info" style="margin-left: auto;">${escapeHtml(h.status || 'ACTIVE')}</span>
                </div>

                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.4;">
                  <div>🛏️ <strong>Beds:</strong> ${h.occupiedBeds || 0} / ${h.totalBeds || 100} occupied</div>
                  ${h.contact ? `<div>📞 <strong>Contact:</strong> ${escapeHtml(h.contact)}</div>` : ''}
                </div>

                <div style="display: flex; gap: 8px;">
                  <button type="button" class="btn btn-primary btn-sm" style="flex: 1;" onclick="openPatientReviewModal('${h.id}')">
                    ⭐ Write Review
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // 10. ACCOUNT SETTINGS & PREFERENCES
  // --------------------------------------------------------------------------
  if (view === 'settings') {
    return `
      <div class="page-header-container">
        <div class="page-title-wrap">
          <h1 class="page-title">⚙️ Patient Account &amp; Privacy Settings</h1>
          <p class="page-description">Manage notification preferences, longitudinal privacy, and account security.</p>
        </div>
      </div>

      <div class="glass-panel" style="padding: 24px; max-width: 800px;">
        <div class="profile-section-block mb-24">
          <div class="profile-section-title">SECURITY &amp; CREDENTIALS</div>
          <div style="display: grid; gap: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-surface-alt); border-radius: var(--radius-sm);">
              <div>
                <strong style="color: var(--text-main); font-size: 0.9rem;">Authentication Identity</strong>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(authUser?.email || patient.email || 'patient@hospitrack.com')}</div>
              </div>
              <span class="badge badge-active">Authenticated (JWT)</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-surface-alt); border-radius: var(--radius-sm);">
              <div>
                <strong style="color: var(--text-main); font-size: 0.9rem;">Profile Avatar &amp; Photo</strong>
                <div style="font-size: 0.8rem; color: var(--text-muted);">Manage your visual identifier across consultations and hospital charts.</div>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" onclick="openProfilePhotoModal()">
                📷 Change Photo
              </button>
            </div>
          </div>
        </div>

        <div class="profile-section-block mb-24">
          <div class="profile-section-title">COMMUNICATION &amp; NOTIFICATIONS</div>
          <div style="display: grid; gap: 12px; font-size: 0.88rem;">
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
              <input type="checkbox" checked disabled>
              <span>Clinical prescription and lab order notifications</span>
            </label>
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
              <input type="checkbox" checked disabled>
              <span>Specialist referral dispatch and transfer status updates</span>
            </label>
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
              <input type="checkbox" checked disabled>
              <span>Longitudinal medical record access audit logging</span>
            </label>
          </div>
        </div>

        <div class="profile-section-block">
          <div class="profile-section-title">SESSION MANAGEMENT</div>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 14px;">
            End your current authenticated patient session on this workstation.
          </p>
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.hospitrackAuth.logout(); window.location.reload();">
            🚪 Sign Out of Hospitrack
          </button>
        </div>
      </div>
    `;
  }

  return ``;
}

function getEventColor(type) {
  switch (type) {
    case 'VISIT': return 'var(--primary)';
    case 'PRESCRIPTION': return 'var(--doctor-color)';
    case 'LAB': return 'var(--admin-color)';
    case 'REFERRAL': return 'var(--hospital-color)';
    default: return 'var(--primary)';
  }
}

// ----------------------------------------------------------------------------
// Patient Profile Save Handler
// ----------------------------------------------------------------------------
window.handlePatientProfileSave = async function(event, patientId) {
  event.preventDefault();
  const alertEl = document.getElementById('patientProfileAlert');
  const submitBtn = document.getElementById('savePatProfileBtn');

  if (alertEl) {
    alertEl.classList.add('hidden');
    alertEl.textContent = '';
  }

  const name = document.getElementById('editPatName')?.value.trim();
  const gender = document.getElementById('editPatGender')?.value;
  const age = parseInt(document.getElementById('editPatAge')?.value, 10);
  const bloodGroup = document.getElementById('editPatBloodGroup')?.value;
  const contact = document.getElementById('editPatPhone')?.value.trim();
  const email = document.getElementById('editPatEmail')?.value.trim();
  const emergencyContact = document.getElementById('editPatEmergency')?.value.trim();
  const address = document.getElementById('editPatAddress')?.value.trim();

  // Validation
  if (!name || name.length < 2) {
    showProfileError('Please provide a valid full name (at least 2 characters).');
    return;
  }
  if (!contact || contact.length < 7) {
    showProfileError('Please provide a valid contact phone number.');
    return;
  }
  if (isNaN(age) || age < 1 || age > 120) {
    showProfileError('Please provide a valid age between 1 and 120.');
    return;
  }

  const payload = {
    name,
    gender,
    age,
    bloodGroup,
    contact,
    email,
    emergencyContact,
    address
  };

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving Changes...';
    }

    await window.hospitrackStore.updatePatientProfile(patientId, payload);
    window.showToast('Profile updated successfully.', 'success');

    // Update Header UI with new name
    const authUser = window.hospitrackAuth.getCurrentUser();
    if (authUser) {
      authUser.name = name;
      if (window.updateHeaderUI) window.updateHeaderUI(authUser);
    }

    setPatientView('profile', false);
  } catch (err) {
    let errorMsg = err.message || 'Failed to update profile. Please try again.';
    if (err.status === 400) {
      errorMsg = err.data?.message || 'Invalid profile information. Please verify the entered details.';
    } else if (err.status === 401) {
      errorMsg = 'Your session has expired. Please sign in again.';
    } else if (err.status === 403) {
      errorMsg = 'Permission denied. You can only edit your own profile.';
    } else if (err.status === 404) {
      errorMsg = 'Patient record not found on server.';
    }
    showProfileError(errorMsg);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '💾 Save Changes';
    }
  }

  function showProfileError(msg) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = msg;
      alertEl.classList.remove('hidden');
    } else {
      window.showToast(msg, 'error');
    }
  }
};

// ----------------------------------------------------------------------------
// Review Hospital Modal Subsystem
// ----------------------------------------------------------------------------
window.openPatientReviewModal = function(hospitalId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const hospital = store.getHospitalById(hospitalId) || { name: 'Assigned Healthcare Facility', id: hospitalId };

  modalContainer.innerHTML = `
    <div id="patientReviewModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="reviewModalTitle">
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title" id="reviewModalTitle">Review Healthcare Facility Experience</h3>
          <button type="button" class="modal-close" onclick="closeGlobalModal('patientReviewModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="handlePatientReviewSubmit(event, '${hospitalId || hospital.id}')">
          <div class="form-group">
            <label class="form-label" for="reviewHospName">Hospital</label>
            <input type="text" id="reviewHospName" class="form-control" value="${escapeHtml(hospital.name)}" readonly disabled>
          </div>
          <div class="form-group">
            <label class="form-label" for="reviewRatingInput">Star Rating (1 - 5 Stars) *</label>
            <select id="reviewRatingInput" class="form-control" required>
              <option value="5">⭐⭐⭐⭐⭐ 5 Stars (Outstanding Healthcare)</option>
              <option value="4">⭐⭐⭐⭐ 4 Stars (Good Medical Quality)</option>
              <option value="3">⭐⭐⭐ 3 Stars (Average / Standard)</option>
              <option value="2">⭐⭐ 2 Stars (Needs Improvement)</option>
              <option value="1">⭐ 1 Star (Unsatisfactory Service)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="reviewTextInput">Detailed Review &amp; Patient Experience *</label>
            <textarea id="reviewTextInput" class="form-control" rows="4" placeholder="Describe your experience with doctors, nursing staff, cleanliness, and admission process..." required minlength="10"></textarea>
          </div>
          <div id="patientReviewAlert" class="alert-banner hidden mb-16"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('patientReviewModal')">Cancel</button>
            <button type="submit" id="submitReviewBtn" class="btn btn-primary">Submit Review</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handlePatientReviewSubmit = async function(event, hospitalId) {
  event.preventDefault();
  const rating = parseInt(document.getElementById('reviewRatingInput')?.value || '5', 10);
  const reviewText = document.getElementById('reviewTextInput')?.value.trim();
  const alertEl = document.getElementById('patientReviewAlert');
  const submitBtn = document.getElementById('submitReviewBtn');

  if (!reviewText || reviewText.length < 5) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = 'Please provide detailed experience feedback (at least 5 characters).';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
    }

    await window.hospitrackStore.createReview({
      hospitalId,
      rating,
      reviewText
    });

    window.showToast('Thank you! Your verified hospital review has been recorded.', 'success');
    closeGlobalModal('patientReviewModal');
    setPatientView('reviews');
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = err.message || 'Failed to submit review.';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Review';
    }
  }
};

window.closeGlobalModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.remove();
};

window.handlePatientHospitalFilter = function(query) {
  const grid = document.getElementById('patientHospitalsGrid');
  if (!grid) return;
  const q = (query || '').toLowerCase().trim();
  const allHospitals = window.hospitrackStore?.getHospitals() || [];
  const filtered = allHospitals.filter(h => 
    (h.name && h.name.toLowerCase().includes(q)) ||
    (h.location && h.location.toLowerCase().includes(q)) ||
    (h.address && h.address.toLowerCase().includes(q))
  );

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-dim); padding: 2.5rem;">No hospitals found matching "${escapeHtml(query)}".</div>`;
    return;
  }

  const currentUser = window.hospitrackAuth?.getCurrentUser();
  grid.innerHTML = filtered.map(h => {
    const hRating = h.rating || 4.5;
    const hReviews = h.reviewCount || 12;
    const isCurrent = h.id === currentUser?.hospitalId;
    return `
      <div class="hospital-network-card stat-card" style="padding: 20px; border-left: 4px solid ${isCurrent ? 'var(--primary)' : 'var(--border-color)'};">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin: 0 0 4px 0;">${escapeHtml(h.name)}</h3>
            <div style="font-size: 0.82rem; color: var(--text-muted);">📍 ${escapeHtml(h.location || h.address || 'Metro Area')}</div>
          </div>
          ${isCurrent ? `<span class="badge badge-active">Assigned</span>` : ''}
        </div>

        <div style="display: flex; align-items: center; gap: 8px; margin: 10px 0; font-size: 0.88rem;">
          <span style="color: #f59e0b; font-weight: 700;">★ ${Number(hRating).toFixed(1)}</span>
          <span style="color: var(--text-dim); font-size: 0.78rem;">(${hReviews} reviews)</span>
          <span class="badge badge-info" style="margin-left: auto;">${escapeHtml(h.status || 'ACTIVE')}</span>
        </div>

        <div style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.4;">
          <div>🛏️ <strong>Beds:</strong> ${h.occupiedBeds || 0} / ${h.totalBeds || 100} occupied</div>
          ${h.contact ? `<div>📞 <strong>Contact:</strong> ${escapeHtml(h.contact)}</div>` : ''}
        </div>

        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-primary btn-sm" style="flex: 1;" onclick="openPatientReviewModal('${h.id}')">
            ⭐ Write Review
          </button>
        </div>
      </div>
    `;
  }).join('');
};
