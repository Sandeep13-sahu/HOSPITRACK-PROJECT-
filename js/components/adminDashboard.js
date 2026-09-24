/**
 * Hospitrack — Super Admin Command Center Component (/admin)
 * Network-wide Operational Oversight, Live PostgreSQL KPIs, Facility Lifecycle Management,
 * Review Center Moderation, and Low-Rating Quality Alert Monitoring.
 */

let adminActiveSection = 'overview'; // overview | hospitals | doctors | patients | referrals | transfers | onboarding | reviews | audit | profile
let adminSearchQuery = '';
let adminReviewRatingFilter = 'ALL'; // ALL | 5 | 4 | 3 | 2 | 1 | FLAGGED
let currentDossierHospitalId = null;

window.renderAdminDashboard = function(container, subtab = null) {
  if (!container) container = document.getElementById('mainContentArea');
  if (!container) return;

  if (subtab) {
    adminActiveSection = subtab;
  }

  const store = window.hospitrackStore;
  const hospitals = store.getHospitals();
  const doctors = store.getDoctors();
  const patients = store.getPatients();
  const referrals = store.getReferrals();
  const transfers = store.getTransfers();
  const reviews = store.getReviews();
  const auditLogs = store.getAuditLogs();

  const overview = store.data.overview || {};

  const totalHospitals = overview.totalHospitals != null ? overview.totalHospitals : hospitals.length;
  const activeHospitals = overview.activeHospitals != null ? overview.activeHospitals : hospitals.filter(h => h.status === 'ACTIVE').length;
  const suspendedHospitals = overview.suspendedHospitals != null ? overview.suspendedHospitals : hospitals.filter(h => h.status === 'SUSPENDED').length;
  const deactivatedHospitals = overview.deactivatedHospitals != null ? overview.deactivatedHospitals : hospitals.filter(h => h.status === 'DEACTIVATED').length;
  const totalDoctors = overview.totalDoctors != null ? overview.totalDoctors : doctors.length;
  const totalPatients = overview.totalPatients != null ? overview.totalPatients : patients.length;
  const totalReferrals = overview.totalReferrals != null ? overview.totalReferrals : referrals.length;
  const totalTransfers = overview.totalTransfers != null ? overview.totalTransfers : transfers.length;
  const avgRating = overview.averageRating != null ? overview.averageRating : (
    hospitals.filter(h => h.rating).reduce((acc, h) => acc + h.rating, 0) / (hospitals.filter(h => h.rating).length || 1)
  ).toFixed(1);

  const lowRatingHospitals = store.getLowRatingHospitals(3.0);

  const subContentHtml = renderAdminSectionContent(adminActiveSection, {
    hospitals,
    doctors,
    patients,
    referrals,
    transfers,
    reviews,
    auditLogs,
    totalHospitals,
    activeHospitals,
    suspendedHospitals,
    deactivatedHospitals,
    totalDoctors,
    totalPatients,
    totalReferrals,
    totalTransfers,
    avgRating,
    lowRatingHospitals
  });

  container.innerHTML = `
    <!-- Super Admin Top Segmented Pill Bar -->
    <div class="pill-tabs-nav no-print">
      <button type="button" class="pill-tab ${adminActiveSection === 'overview' ? 'active' : ''}" onclick="setAdminSection('overview')">
        <span>🛡️</span> System Command
      </button>
      <button type="button" class="pill-tab ${adminActiveSection === 'hospitals' ? 'active' : ''}" onclick="setAdminSection('hospitals')">
        <span>🏥</span> Facilities <span class="pill-badge">${hospitals.length}</span>
      </button>
      <button type="button" class="pill-tab ${adminActiveSection === 'doctors' ? 'active' : ''}" onclick="setAdminSection('doctors')">
        <span>🩺</span> Doctor Directory <span class="pill-badge">${doctors.length}</span>
      </button>
      <button type="button" class="pill-tab ${adminActiveSection === 'patients' ? 'active' : ''}" onclick="setAdminSection('patients')">
        <span>👥</span> Patient Records <span class="pill-badge">${patients.length}</span>
      </button>
      <button type="button" class="pill-tab ${adminActiveSection === 'referrals' ? 'active' : ''}" onclick="setAdminSection('referrals')">
        <span>🔁</span> Referrals <span class="pill-badge">${referrals.length}</span>
      </button>
      <button type="button" class="pill-tab ${adminActiveSection === 'transfers' ? 'active' : ''}" onclick="setAdminSection('transfers')">
        <span>🚑</span> Transfers <span class="pill-badge">${transfers.length}</span>
      </button>
      <button type="button" class="pill-tab ${adminActiveSection === 'reviews' ? 'active' : ''}" onclick="setAdminSection('reviews')">
        <span>⭐</span> Review Center <span class="pill-badge">${reviews.length}</span>
      </button>
      <button type="button" class="pill-tab ${adminActiveSection === 'audit' ? 'active' : ''}" onclick="setAdminSection('audit')">
        <span>📜</span> Audit Ledger <span class="pill-badge">${auditLogs.length}</span>
      </button>
      <button type="button" class="pill-tab ${adminActiveSection === 'profile' ? 'active' : ''}" onclick="setAdminSection('profile')">
        <span>👤</span> Admin Profile
      </button>
    </div>

    <!-- Admin Subview Content -->
    <div class="admin-subview-content">
      ${subContentHtml}
    </div>
  `;
};

function setAdminSection(section) {
  adminActiveSection = section;
  if (window.navigateToRoleSection) {
    window.navigateToRoleSection('SUPER_ADMIN', section);
  } else {
    window.renderAdminDashboard(document.getElementById('mainContentArea'), section);
  }
}
window.setAdminSection = setAdminSection;

function renderAdminSectionContent(section, data) {
  const {
    hospitals,
    doctors,
    patients,
    referrals,
    transfers,
    reviews,
    auditLogs,
    totalHospitals,
    activeHospitals,
    suspendedHospitals,
    deactivatedHospitals,
    totalDoctors,
    totalPatients,
    totalReferrals,
    totalTransfers,
    avgRating,
    lowRatingHospitals
  } = data;

  // 1. SYSTEM OVERVIEW
  if (section === 'overview' || !section) {
    return `
      <!-- Top Executive Greeting Header -->
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge" style="background: rgba(168, 85, 247, 0.15); color: #c084fc;">🛡️ National Network Command</span>
          <h1 class="page-title">System Administrator Console</h1>
          <p class="page-subtitle">
            Centralized Facility Governance, Clinical Quality Monitoring, Inter-Hospital Logistics, and Audit Ledger.
          </p>
        </div>
        <div class="page-actions-toolbar">
          <button class="btn btn-primary btn-sm" onclick="openOnboardHospitalModal()">
            <span>+</span> Onboard Facility
          </button>
          <button class="btn btn-secondary btn-sm" onclick="setAdminSection('reviews')">
            <span>⭐</span> Review Center
          </button>
          <button class="btn btn-secondary btn-sm" onclick="window.print()" title="Print Summary">
            <span>🖨️</span> Print Network
          </button>
        </div>
      </div>

      <!-- Low Rating Hospital Quality Attention Banner -->
      ${lowRatingHospitals.length > 0 ? `
        <div class="rating-attention-banner mb-24">
          <div class="attention-text-wrap">
            <span class="attention-icon">⚠️</span>
            <div>
              <div class="attention-title">Attention Required: Facility Performance Alert</div>
              <div class="attention-sub">
                ${lowRatingHospitals.map(h => `<strong>${escapeHtml(h.name)}</strong> (${h.rating}★ / 5.0)`).join(', ')} is below the administrative threshold (3.0/5.0).
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-warning btn-sm" onclick="setAdminSection('reviews')">Inspect Reviews</button>
            <button class="btn btn-danger btn-sm" onclick="openDeactivateHospitalModal('${lowRatingHospitals[0].id}')">Administrative Action</button>
          </div>
        </div>
      ` : ''}

      <!-- Live KPI Metrics Grid -->
      <div class="stats-grid mb-24">
        <div class="stat-card" style="border-left: 3px solid var(--hospital-color);">
          <div class="stat-header">
            <span class="stat-title">Network Facilities</span>
            <span class="stat-icon">🏥</span>
          </div>
          <div class="stat-value">${totalHospitals}</div>
          <div class="stat-sub">${activeHospitals} Active • ${suspendedHospitals} Suspended • ${deactivatedHospitals} Deactivated</div>
        </div>
        <div class="stat-card" style="border-left: 3px solid var(--doctor-color);">
          <div class="stat-header">
            <span class="stat-title">Credentialed Physicians</span>
            <span class="stat-icon">🩺</span>
          </div>
          <div class="stat-value">${totalDoctors}</div>
          <div class="stat-sub">Across all network clinics</div>
        </div>
        <div class="stat-card" style="border-left: 3px solid var(--patient-color);">
          <div class="stat-header">
            <span class="stat-title">Registered Patients</span>
            <span class="stat-icon">👤</span>
          </div>
          <div class="stat-value">${totalPatients}</div>
          <div class="stat-sub">Inpatients and clinical profiles</div>
        </div>
        <div class="stat-card" style="border-left: 3px solid var(--warning);">
          <div class="stat-header">
            <span class="stat-title">Average Facility Rating</span>
            <span class="stat-icon">⭐</span>
          </div>
          <div class="stat-value" style="color: var(--warning);">${avgRating} ★</div>
          <div class="stat-sub">Based on verified patient reviews</div>
        </div>
      </div>

      <!-- Accredited Facilities Summary -->
      <div class="glass-panel mb-24">
        <div class="panel-header-modern" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
          <div>
            <h3 class="panel-title-modern">🏥 Accredited Healthcare Facilities</h3>
            <p class="panel-sub-modern">Active hospitals in the national network.</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="setAdminSection('hospitals')">Manage All Hospitals</button>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Hospital Name & Location</th>
                <th>Bed Inventory</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${hospitals.slice(0, 5).map(h => `
                <tr>
                  <td><code>${escapeHtml(h.code || h.id)}</code></td>
                  <td>
                    <strong>${escapeHtml(h.name)}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(h.location)}</div>
                  </td>
                  <td>${h.availableBeds || 0} / ${h.totalBeds || 0} Beds</td>
                  <td><span style="color: #f59e0b; font-weight: 700;">${h.rating || '5.0'} ★</span></td>
                  <td>
                    <span class="badge ${h.status === 'ACTIVE' ? 'badge-active' : h.status === 'SUSPENDED' ? 'badge-danger' : 'badge-warning'}">
                      ${escapeHtml(h.status || 'ACTIVE')}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-secondary btn-sm" onclick="openHospitalDossier('${h.id}')">Dossier</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Audit Activity -->
      <div class="glass-panel">
        <div class="panel-header-modern" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 class="panel-title-modern">📜 Recent Cryptographic Audit Logs</h3>
            <p class="panel-sub-modern">Immutable SHA-256 ledger records.</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="setAdminSection('audit')">View Audit Ledger</button>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Entity</th>
                <th>Verification</th>
              </tr>
            </thead>
            <tbody>
              ${auditLogs.slice(0, 5).map(a => `
                <tr>
                  <td style="font-size: 0.78rem;">${new Date(a.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td><span class="badge badge-info">${escapeHtml(a.action)}</span></td>
                  <td>${escapeHtml(a.performedBy || 'System')}</td>
                  <td><code>${escapeHtml(a.entityType)}:${escapeHtml(a.entityId)}</code></td>
                  <td><span class="badge badge-active" style="font-size: 0.72rem;">SHA-256 Valid</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 2. HOSPITALS
  if (section === 'hospitals') {
    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge">Administration</span>
          <h1 class="page-title">🏥 Hospital Facilities & Health Networks</h1>
          <p class="page-subtitle">Manage onboarding, operational status, capacity, and facility dossiers.</p>
        </div>
        <div class="page-actions-toolbar">
          <button class="btn btn-primary btn-sm" onclick="openOnboardHospitalModal()">
            <span>+</span> Onboard Hospital
          </button>
        </div>
      </div>

      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Code / ID</th>
                <th>Hospital Name & Location</th>
                <th>Bed Inventory</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Administrative Actions</th>
              </tr>
            </thead>
            <tbody>
              ${hospitals.map(h => `
                <tr>
                  <td><code>${escapeHtml(h.code || h.id)}</code></td>
                  <td>
                    <strong>${escapeHtml(h.name)}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(h.location)}</div>
                  </td>
                  <td>${h.availableBeds || 0} / ${h.totalBeds || 0} Available</td>
                  <td>
                    <span style="color: #f59e0b; font-weight: 700;">${h.rating || '5.0'} ★</span>
                    <span style="font-size: 0.75rem; color: var(--text-dim);">(${h.reviewCount || 0})</span>
                  </td>
                  <td>
                    <span class="badge ${h.status === 'ACTIVE' ? 'badge-active' : h.status === 'PENDING_APPROVAL' ? 'badge-warning' : h.status === 'SUSPENDED' ? 'badge-danger' : 'badge-info'}">
                      ${escapeHtml(h.status || 'ACTIVE')}
                    </span>
                  </td>
                  <td>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                      <button class="btn btn-secondary btn-sm" onclick="openHospitalDossier('${h.id}')" title="View Full Dossier">
                        Dossier
                      </button>
                      <button class="btn btn-secondary btn-sm" onclick="openEditHospitalModal('${h.id}')" title="Edit Hospital Facility Details">
                        ✏️ Edit
                      </button>
                      ${h.status === 'PENDING_APPROVAL' ? `
                        <button class="btn btn-primary btn-sm" onclick="handleApproveHospital('${h.id}')" title="Approve Hospital Registration">
                          ✓ Approve
                        </button>
                      ` : h.status === 'ACTIVE' ? `
                        <button class="btn btn-outline-danger btn-sm" onclick="openDeactivateHospitalModal('${h.id}')" title="Deactivate or Suspend">
                          Suspend
                        </button>
                      ` : `
                        <button class="btn btn-primary btn-sm" onclick="handleReactivateHospital('${h.id}')" title="Reactivate Facility">
                          Reactivate
                        </button>
                      `}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 3. DOCTORS
  if (section === 'doctors') {
    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge">Administration</span>
          <h1 class="page-title">🩺 Network Clinical Physicians</h1>
          <p class="page-subtitle">Directory of credentialed doctors across all facilities.</p>
        </div>
        <div class="page-actions-toolbar">
          <button class="btn btn-secondary btn-sm" onclick="setAdminSection('overview')">Back to Overview</button>
        </div>
      </div>

      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Physician</th>
                <th>Specialty</th>
                <th>License</th>
                <th>Affiliation</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              ${doctors.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No physicians registered.</td></tr>
              ` : doctors.map(d => `
                <tr>
                  <td><code>${escapeHtml(d.id)}</code></td>
                  <td><strong>${escapeHtml(d.name)}</strong></td>
                  <td><span class="badge badge-active">${escapeHtml(d.specialty)}</span></td>
                  <td><code>${escapeHtml(d.licenseNo || 'MCI-VERIFIED')}</code></td>
                  <td>${escapeHtml(d.hospitalName || d.hospitalId)}</td>
                  <td>${escapeHtml(d.email || 'N/A')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 4. PATIENTS
  if (section === 'patients') {
    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge">Administration</span>
          <h1 class="page-title">👤 National Patient Care Directory</h1>
          <p class="page-subtitle">Registry of patients and admission states across facilities.</p>
        </div>
        <div class="page-actions-toolbar">
          <button class="btn btn-secondary btn-sm" onclick="setAdminSection('overview')">Back to Overview</button>
        </div>
      </div>

      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name &amp; Age</th>
                <th>Facility</th>
                <th>Attending Doctor</th>
                <th>Status</th>
                <th>Emergency Contact</th>
                <th>Health Records</th>
              </tr>
            </thead>
            <tbody>
              ${patients.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No patients registered.</td></tr>
              ` : patients.map(p => `
                <tr>
                  <td><code>${escapeHtml(p.id)}</code></td>
                  <td>
                    <strong>${escapeHtml(p.name)}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${p.age} yrs • ${escapeHtml(p.gender)} • Blood: ${escapeHtml(p.bloodGroup || 'N/A')}</div>
                  </td>
                  <td>${escapeHtml(p.hospitalName || p.currentHospitalId)}</td>
                  <td>${escapeHtml(p.doctorName || p.primaryDoctorId || 'Unassigned')}</td>
                  <td><span class="badge ${p.status === 'DISCHARGED' ? 'badge-info' : 'badge-active'}">${escapeHtml(p.status || 'ACTIVE')}</span></td>
                  <td>${escapeHtml(p.emergencyContact || p.contact || 'N/A')}</td>
                  <td>
                    <button class="btn btn-secondary btn-sm" onclick="openPatientHealthSummaryPrint('${p.id}')" title="Print Comprehensive Longitudinal Medical Record">
                      <span>🖨️</span> Health Summary
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 5. REFERRALS
  if (section === 'referrals') {
    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge">Operations</span>
          <h1 class="page-title">🔁 Network Specialist Referrals</h1>
          <p class="page-subtitle">Inter-facility clinical referral pipeline and transfer justification.</p>
        </div>
        <div class="page-actions-toolbar">
          <button class="btn btn-secondary btn-sm" onclick="setAdminSection('overview')">Back to Overview</button>
        </div>
      </div>

      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Patient</th>
                <th>Origin Facility</th>
                <th>Target Facility</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              ${referrals.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No referrals recorded.</td></tr>
              ` : referrals.map(r => `
                <tr>
                  <td><code>${escapeHtml(r.id)}</code></td>
                  <td>${escapeHtml(r.patientId)}</td>
                  <td>${escapeHtml(r.fromHospitalId)}</td>
                  <td>${escapeHtml(r.toHospitalId)}</td>
                  <td><span class="badge ${r.priority === 'EMERGENCY' ? 'badge-danger' : r.priority === 'URGENT' ? 'badge-warning' : 'badge-info'}">${r.priority}</span></td>
                  <td><span class="badge badge-active">${r.status}</span></td>
                  <td style="max-width: 250px; font-size: 0.82rem;">${escapeHtml(r.reason)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 6. TRANSFERS
  if (section === 'transfers') {
    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge" style="background: rgba(239, 68, 68, 0.15); color: #f87171;">Operations</span>
          <h1 class="page-title">🚑 Inter-Hospital Emergency Transfers</h1>
          <p class="page-subtitle">Urgent patient logistics and bed reallocation records.</p>
        </div>
        <div class="page-actions-toolbar">
          <button class="btn btn-secondary btn-sm" onclick="setAdminSection('overview')">Back to Overview</button>
        </div>
      </div>

      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Patient</th>
                <th>Origin</th>
                <th>Destination</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Dispatched At</th>
              </tr>
            </thead>
            <tbody>
              ${transfers.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No emergency transfers logged.</td></tr>
              ` : transfers.map(t => `
                <tr>
                  <td><code>${escapeHtml(t.id)}</code></td>
                  <td>${escapeHtml(t.patientId)}</td>
                  <td>${escapeHtml(t.fromHospitalId)}</td>
                  <td>${escapeHtml(t.toHospitalId)}</td>
                  <td><span class="badge badge-danger">${t.priority}</span></td>
                  <td><span class="badge badge-active">${t.status}</span></td>
                  <td>${new Date(t.initiatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 7. ONBOARDING
  if (section === 'onboarding') {
    const pendingHospitals = hospitals.filter(h => h.status === 'PENDING_APPROVAL');
    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge">Operations</span>
          <h1 class="page-title">🏛️ Hospital Facility Onboarding Portal</h1>
          <p class="page-subtitle">Direct onboarding and credentialing of healthcare institutions.</p>
        </div>
        <div class="page-actions-toolbar">
          <button class="btn btn-primary btn-sm" onclick="openOnboardHospitalModal()">
            <span>+</span> Onboard New Facility
          </button>
        </div>
      </div>

      <div class="glass-panel mb-24">
        <div class="panel-header-modern">
          <h3 class="panel-title-modern">Facilities Awaiting Approval (${pendingHospitals.length})</h3>
          <p class="panel-sub-modern">Verify accreditation credentials before activating facility access.</p>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Hospital Name</th>
                <th>Code</th>
                <th>Total Beds</th>
                <th>Contact</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${pendingHospitals.length === 0 ? `
                <tr><td colspan="5" style="text-align: center; color: var(--text-dim); padding: 2rem;">No pending facility applications at this time.</td></tr>
              ` : pendingHospitals.map(h => `
                <tr>
                  <td><strong>${escapeHtml(h.name)}</strong></td>
                  <td><code>${escapeHtml(h.code || h.id)}</code></td>
                  <td>${h.totalBeds || 100} Beds</td>
                  <td>${escapeHtml(h.contact || h.email || 'N/A')}</td>
                  <td>
                    <button class="btn btn-primary btn-sm" onclick="handleApproveHospital('${h.id}')">
                      ✓ Approve Facility
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 8. REVIEWS
  if (section === 'reviews') {
    let filteredReviews = reviews;
    if (adminReviewRatingFilter !== 'ALL') {
      if (adminReviewRatingFilter === 'FLAGGED') {
        filteredReviews = reviews.filter(r => r.flagged);
      } else {
        const star = parseInt(adminReviewRatingFilter, 10);
        filteredReviews = reviews.filter(r => r.rating === star);
      }
    }

    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge">Quality &amp; Safety</span>
          <h1 class="page-title">⭐ Quality & Experience Review Center</h1>
          <p class="page-subtitle">Inspect patient experiences, monitor facility reputation, and flag abusive content.</p>
        </div>
        <div class="page-actions-toolbar">
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="btn ${adminReviewRatingFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="filterAdminReviews('ALL')">All</button>
            <button class="btn ${adminReviewRatingFilter === '5' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="filterAdminReviews('5')">5 ★</button>
            <button class="btn ${adminReviewRatingFilter === '4' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="filterAdminReviews('4')">4 ★</button>
            <button class="btn ${adminReviewRatingFilter === '3' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="filterAdminReviews('3')">3 ★</button>
            <button class="btn ${adminReviewRatingFilter === '2' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="filterAdminReviews('2')">2 ★</button>
            <button class="btn ${adminReviewRatingFilter === '1' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="filterAdminReviews('1')">1 ★</button>
          </div>
        </div>
      </div>

      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Review ID</th>
                <th>Facility</th>
                <th>Patient</th>
                <th>Rating</th>
                <th>Review Content</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filteredReviews.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No reviews matching filter criteria.</td></tr>
              ` : filteredReviews.map(r => `
                <tr>
                  <td><code>${escapeHtml(r.id)}</code></td>
                  <td><strong>${escapeHtml(r.hospitalName || r.hospitalId)}</strong></td>
                  <td>${escapeHtml(r.patientName || r.patientId)}</td>
                  <td><span style="color: #f59e0b; font-weight: 700;">${'★'.repeat(r.rating)}</span></td>
                  <td style="max-width: 320px; font-size: 0.82rem; line-height: 1.4;">${escapeHtml(r.reviewText)}</td>
                  <td>${new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>
                    ${!r.flagged ? `
                      <button class="btn btn-outline-danger btn-sm" onclick="handleFlagReview('${r.id}')" title="Flag for Review">
                        🚩 Flag
                      </button>
                    ` : `
                      <span class="badge badge-danger">FLAGGED</span>
                    `}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 9. AUDIT LEDGER
  if (section === 'audit') {
    if (window.renderAuditLogger) {
      setTimeout(() => {
        const container = document.getElementById('mainContentArea');
        if (container) window.renderAuditLogger(container);
      }, 0);
      return `<div style="text-align: center; padding: 2rem;">Loading Cryptographic Audit Ledger...</div>`;
    }
  }

  // 10. SUPER ADMIN PROFILE
  if (section === 'profile') {
    const authUser = window.hospitrackAuth.getCurrentUser();
    const initials = 'SA';
    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge" style="background: rgba(168, 85, 247, 0.15); color: #c084fc;">🛡️ Security &amp; Governance</span>
          <h1 class="page-title">Administrator System Profile</h1>
          <p class="page-subtitle">National Network root authority, security credentials, and system governance profile.</p>
        </div>
        <div class="page-actions-toolbar">
          <button type="button" class="btn btn-primary btn-sm" onclick="openAccountSettingsModal()">
            <span>⚙️</span> Account Settings
          </button>
        </div>
      </div>

      <div style="max-width: 900px; display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Profile Header Summary Banner -->
        <div class="glass-panel" style="padding: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; border-left: 4px solid var(--admin-color);">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div class="avatar avatar-lg" style="background: linear-gradient(135deg, #7C3AED, #5B21B6); font-weight: 800; color: #fff;">${initials}</div>
            <div>
              <h2 style="font-size: 1.3rem; font-weight: 700; color: #fff; margin: 0 0 4px 0;">${escapeHtml(authUser?.name || 'Super Administrator')}</h2>
              <div style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(authUser?.email || 'admin@hospitrack.com')}</div>
              <div style="display: flex; gap: 6px; margin-top: 6px; align-items: center;">
                <span class="badge badge-info" style="background: rgba(124, 58, 237, 0.2); color: #c084fc; font-size: 0.72rem; font-weight: 700;">SUPER_ADMIN</span>
                <span class="badge badge-active" style="font-size: 0.72rem;">ACTIVE / ROOT_AUTHORIZED</span>
              </div>
            </div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="openAccountSettingsModal()">
            <span>🔒</span> Security Settings
          </button>
        </div>

        <!-- Administrative Credentials & Scope -->
        <div class="glass-panel" style="padding: 1.25rem;">
          <div style="font-size: 0.78rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim); margin-bottom: 12px; letter-spacing: 0.5px;">
            Administrative Authority &amp; System Scope
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Admin ID</div>
              <div style="font-weight: 700; font-family: monospace; color: var(--admin-color); margin-top: 2px;">${escapeHtml(authUser?.id || 'ADMIN-001')}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">System Role</div>
              <div style="font-weight: 600; color: #fff; margin-top: 2px;">National System Administrator</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Cryptographic Access</div>
              <div style="font-weight: 600; color: var(--success); margin-top: 2px;">SHA-256 Audit Authority</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Facility Jurisdiction</div>
              <div style="font-weight: 600; color: #fff; margin-top: 2px;">Network-wide (All Hospitals)</div>
            </div>
          </div>
        </div>

        <!-- Contact & Security Information -->
        <div class="glass-panel" style="padding: 1.25rem;">
          <div style="font-size: 0.78rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim); margin-bottom: 12px; letter-spacing: 0.5px;">
            Security &amp; Contact Information
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Official Email</div>
              <div style="font-weight: 600; color: #fff; margin-top: 2px;">${escapeHtml(authUser?.email || 'admin@hospitrack.com')}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Account Status</div>
              <div style="font-weight: 600; color: var(--success); margin-top: 2px;">Verified &amp; Active</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Session Authentication</div>
              <div style="font-weight: 600; color: #fff; margin-top: 2px;">Spring Security 6 JWT Bearer</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Permissions Level</div>
              <div style="font-weight: 600; color: #fff; margin-top: 2px;">Full Network Governance</div>
            </div>
          </div>
        </div>

        <!-- System Governance Metrics Grid -->
        <div class="stats-grid">
          <div class="stat-card" style="border-left: 3px solid var(--hospital-color);">
            <div class="stat-header"><span class="stat-title">Network Hospitals</span><span class="stat-icon">🏥</span></div>
            <div class="stat-value">${totalHospitals}</div>
            <div class="stat-sub">Accredited facilities</div>
          </div>
          <div class="stat-card" style="border-left: 3px solid var(--doctor-color);">
            <div class="stat-header"><span class="stat-title">Registered Doctors</span><span class="stat-icon">🩺</span></div>
            <div class="stat-value">${totalDoctors}</div>
            <div class="stat-sub">Active medical specialists</div>
          </div>
          <div class="stat-card" style="border-left: 3px solid var(--patient-color);">
            <div class="stat-header"><span class="stat-title">Inpatients &amp; Records</span><span class="stat-icon">👤</span></div>
            <div class="stat-value">${totalPatients}</div>
            <div class="stat-sub">Longitudinal records</div>
          </div>
          <div class="stat-card" style="border-left: 3px solid var(--admin-color);">
            <div class="stat-header"><span class="stat-title">Audit Ledger Entries</span><span class="stat-icon">📜</span></div>
            <div class="stat-value" style="color: var(--admin-color);">${auditLogs.length}</div>
            <div class="stat-sub">Immutable tamper-evident events</div>
          </div>
        </div>
      </div>
    `;
  }

  return `<div class="glass-panel" style="padding: 2rem; text-align: center;">Section not found.</div>`;
}

window.filterAdminReviews = function(rating) {
  adminReviewRatingFilter = rating;
  window.renderAdminDashboard(document.getElementById('mainContentArea'));
};

// Hospital Dossier Viewer
window.openHospitalDossier = async function(hospitalId) {
  currentDossierHospitalId = hospitalId;
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const hospital = store.getHospitalById(hospitalId) || { name: 'Hospital Facility', id: hospitalId };

  modalContainer.innerHTML = `
    <div id="hospitalDossierModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="dossierHospitalName">
      <div class="modal-box modal-box-lg">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" id="dossierHospitalName">${escapeHtml(hospital.name)}</h3>
            <p class="modal-subtitle">Hospital intelligence dossier & operational record</p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('hospitalDossierModal')" aria-label="Close">✕</button>
        </div>
        <div id="dossierTabContent" class="modal-body">
          <div style="text-align: center; padding: 2rem;">Loading hospital intelligence dossier...</div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('hospitalDossierModal')">Close</button>
          <button type="button" class="btn btn-secondary" onclick="window.print()">🖨️ Print Dossier</button>
          <button type="button" class="btn btn-primary" onclick="closeGlobalModal('hospitalDossierModal'); openEditHospitalModal('${hospitalId}');">Edit Facility</button>
        </div>
      </div>
    </div>
  `;

  try {
    const details = await store.getHospitalDetails(hospitalId);
    renderDossierContent(details);
  } catch (err) {
    const contentEl = document.getElementById('dossierTabContent');
    if (contentEl) {
      contentEl.innerHTML = `<div style="color: var(--danger); padding: 2rem;">Failed to load dossier: ${escapeHtml(err.message)}</div>`;
    }
  }
};

function renderDossierContent(details) {
  const contentEl = document.getElementById('dossierTabContent');
  if (!contentEl) return;

  const h = details.hospital || {};
  const doctors = details.doctors || [];
  const patients = details.patients || [];
  const reviews = details.reviews || [];

  contentEl.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 1.25rem;">
      <div class="stat-card" style="padding: 12px;">
        <div style="font-size: 0.72rem; color: var(--text-dim); font-weight: 700;">BED CAPACITY</div>
        <div style="font-weight: 800; font-size: 1.15rem; color: var(--text-main); margin-top: 2px;">${h.availableBeds || 0} / ${h.totalBeds || 0} Available</div>
      </div>
      <div class="stat-card" style="padding: 12px;">
        <div style="font-size: 0.72rem; color: var(--text-dim); font-weight: 700;">DOCTORS</div>
        <div style="font-weight: 800; font-size: 1.15rem; color: var(--text-main); margin-top: 2px;">${doctors.length} Verified</div>
      </div>
      <div class="stat-card" style="padding: 12px;">
        <div style="font-size: 0.72rem; color: var(--text-dim); font-weight: 700;">ACTIVE INPATIENTS</div>
        <div style="font-weight: 800; font-size: 1.15rem; color: var(--text-main); margin-top: 2px;">${patients.length} Registered</div>
      </div>
      <div class="stat-card" style="padding: 12px;">
        <div style="font-size: 0.72rem; color: var(--text-dim); font-weight: 700;">QUALITY RATING</div>
        <div style="font-weight: 800; font-size: 1.15rem; color: var(--warning); margin-top: 2px;">${h.rating || '5.0'} ★ <span style="font-size: 0.78rem; color: var(--text-muted);">(${reviews.length})</span></div>
      </div>
    </div>

    <div class="profile-details-grid" style="font-size: 0.86rem;">
      <div class="profile-field-box">
        <div class="profile-field-label">Official Contact Phone</div>
        <div class="profile-field-value">${escapeHtml(h.contact || 'N/A')}</div>
      </div>
      <div class="profile-field-box">
        <div class="profile-field-label">Administrative Email</div>
        <div class="profile-field-value">${escapeHtml(h.email || 'N/A')}</div>
      </div>
      <div class="profile-field-box" style="grid-column: span 2;">
        <div class="profile-field-label">Physical Address</div>
        <div class="profile-field-value">${escapeHtml(h.location || 'N/A')}</div>
      </div>
      <div class="profile-field-box">
        <div class="profile-field-label">Operational Status</div>
        <div class="profile-field-value"><span class="badge ${h.status === 'ACTIVE' ? 'badge-active' : 'badge-danger'}">${escapeHtml(h.status || 'ACTIVE')}</span></div>
      </div>
      <div class="profile-field-box">
        <div class="profile-field-label">Facility Code</div>
        <div class="profile-field-value"><code>${escapeHtml(h.code || h.id)}</code></div>
      </div>
    </div>
  `;
}

// Edit Hospital Modal
window.openEditHospitalModal = function(hospitalId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const h = store.getHospitalById(hospitalId);
  if (!h) return;

  modalContainer.innerHTML = `
    <div id="editHospitalModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="editHospTitle">
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title" id="editHospTitle">✏️ Edit Facility Details</h3>
          <button type="button" class="modal-close" onclick="closeGlobalModal('editHospitalModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="handleEditHospitalSubmit(event, '${h.id}')">
          <div class="form-group">
            <label class="form-label" for="editHospNameInput">Hospital Name *</label>
            <input type="text" id="editHospNameInput" class="form-control" value="${escapeHtml(h.name)}" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="editHospContactInput">Official Contact Phone *</label>
            <input type="tel" id="editHospContactInput" class="form-control" value="${escapeHtml(h.contact || '')}" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="editHospEmailInput">Administrative Email</label>
            <input type="email" id="editHospEmailInput" class="form-control" value="${escapeHtml(h.email || '')}">
          </div>
          <div class="form-group">
            <label class="form-label" for="editHospLocInput">Location / Address *</label>
            <input type="text" id="editHospLocInput" class="form-control" value="${escapeHtml(h.location || '')}" required>
          </div>
          <div id="editHospAlert" class="alert-banner hidden"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('editHospitalModal')">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Facility Details</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleEditHospitalSubmit = async function(event, hospitalId) {
  event.preventDefault();
  const name = document.getElementById('editHospNameInput')?.value.trim();
  const contact = document.getElementById('editHospContactInput')?.value.trim();
  const email = document.getElementById('editHospEmailInput')?.value.trim();
  const location = document.getElementById('editHospLocInput')?.value.trim();
  const alertEl = document.getElementById('editHospAlert');

  try {
    await window.hospitrackStore.updateHospitalProfile(hospitalId, {
      name,
      contact,
      email,
      location
    });
    window.showToast('Hospital details updated successfully.', 'success');
    closeGlobalModal('editHospitalModal');
    window.renderAdminDashboard(document.getElementById('mainContentArea'));
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to update hospital details.';
      alertEl.classList.remove('hidden');
    }
  }
};

// Deactivation Modal with Reason Confirmation
window.openDeactivateHospitalModal = function(hospitalId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const hospital = store.getHospitalById(hospitalId) || { name: 'Hospital Facility', rating: 4.8, reviewCount: 0, status: 'ACTIVE' };

  modalContainer.innerHTML = `
    <div id="deactivateHospModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="deactModalTitle">
      <div class="modal-box">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" id="deactModalTitle" style="color: var(--danger);">Deactivate Hospital</h3>
            <p class="modal-subtitle">Administrative action to decommission or suspend healthcare facility</p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('deactivateHospModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="handleDeactivateHospitalSubmit(event, '${hospitalId}')">
          <div style="background: var(--danger-light); border: 1px solid var(--danger-border); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
            <div style="font-size: 1rem; font-weight: 700; color: var(--danger-text);">${escapeHtml(hospital.name)}</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; font-size: 0.8rem; color: var(--text-secondary);">
              <div>Rating: <strong>${hospital.rating || 'N/A'}★</strong></div>
              <div>Reviews: <strong>${hospital.reviewCount || 0}</strong></div>
              <div>Status: <span class="badge badge-${(hospital.status || 'ACTIVE').toLowerCase()}">${hospital.status || 'ACTIVE'}</span></div>
            </div>
            <p style="font-size: 0.76rem; color: var(--text-muted); margin-top: 8px;">
              Soft deactivation: Historical clinical records, patient timelines, and audit records remain fully preserved.
            </p>
          </div>

          <div class="form-group">
            <label class="form-label" for="deactActionType">Action Type *</label>
            <select id="deactActionType" class="form-control" required>
              <option value="DEACTIVATED">DEACTIVATE — Decommission facility from active operations</option>
              <option value="SUSPENDED">SUSPEND — Temporary operational hold</option>
              <option value="WARNED">WARN — Administrative quality warning</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="deactReason">Reason for Action *</label>
            <textarea id="deactReason" class="form-control" rows="3" placeholder="Mandatory administrative justification (e.g. Clinical quality audit failure, rating below 3.0 threshold)..." required minlength="5"></textarea>
          </div>

          <div class="mb-16">
            <label style="display: flex; align-items: flex-start; gap: 10px; font-size: 0.84rem; color: var(--text-secondary); cursor: pointer;">
              <input type="checkbox" id="deactAcknowledge" required style="margin-top: 3px;">
              <span>I understand this will deactivate the hospital from active operations.</span>
            </label>
          </div>

          <div id="deactAlert" class="alert-banner hidden"></div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('deactivateHospModal')">Cancel</button>
            <button type="submit" id="confirmDeactBtn" class="btn btn-danger">Deactivate Hospital</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleDeactivateHospitalSubmit = async function(event, hospitalId) {
  event.preventDefault();
  const status = document.getElementById('deactActionType')?.value;
  const reason = document.getElementById('deactReason')?.value.trim();
  const alertEl = document.getElementById('deactAlert');

  try {
    await window.hospitrackStore.updateHospitalStatus(hospitalId, status, reason);
    window.showToast(`Facility status updated to ${status}.`, 'info');
    closeGlobalModal('deactivateHospModal');
    window.renderAdminDashboard(document.getElementById('mainContentArea'));
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to update facility status.';
      alertEl.classList.remove('hidden');
    }
  }
};

window.handleApproveHospital = async function(hospitalId) {
  if (confirm(`Approve hospital facility registration for ${hospitalId}? This will activate the hospital and allow the hospital administrator to log in.`)) {
    try {
      await window.hospitrackStore.approveHospital(hospitalId);
      window.showToast('Hospital approved and activated successfully.', 'success');
      window.renderAdminDashboard(document.getElementById('mainContentArea'));
    } catch (err) {
      window.showToast(err.message || 'Failed to approve hospital.', 'error');
    }
  }
};

window.handleReactivateHospital = async function(hospitalId) {
  if (confirm(`Reactivate hospital facility ${hospitalId} to ACTIVE status?`)) {
    try {
      await window.hospitrackStore.updateHospitalStatus(hospitalId, 'ACTIVE', 'Administrative reactivation approved.');
      window.showToast('Facility reactivated to ACTIVE operational status.', 'success');
      window.renderAdminDashboard(document.getElementById('mainContentArea'));
    } catch (err) {
      window.showToast(err.message || 'Failed to reactivate hospital.', 'error');
    }
  }
};

window.handleFlagReview = async function(reviewId) {
  if (confirm(`Flag review ${reviewId} for administrative inspection?`)) {
    try {
      await window.hospitrackStore.flagReview(reviewId);
      window.showToast('Review flagged for quality inspection.', 'info');
      window.renderAdminDashboard(document.getElementById('mainContentArea'));
    } catch (err) {
      window.showToast(err.message || 'Failed to flag review.', 'error');
    }
  }
};

// Onboard Hospital Modal
window.openOnboardHospitalModal = function() {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div id="onboardHospModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="onboardHospModalTitle">
      <div class="modal-box modal-box-register">
        <div class="modal-header">
          <h3 class="modal-title" id="onboardHospModalTitle">Onboard Healthcare Facility</h3>
          <button type="button" class="modal-close" onclick="closeGlobalModal('onboardHospModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="handleOnboardHospitalSubmit(event)">
          <div class="form-grid-2col">
            <div class="form-group full-width">
              <label class="form-label" for="onboardHospName">Facility Name *</label>
              <input type="text" id="onboardHospName" class="form-control" placeholder="e.g. Apollo Super Speciality Hospital" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="onboardHospCode">Network Facility Code *</label>
              <input type="text" id="onboardHospCode" class="form-control" placeholder="e.g. ASH-04" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="onboardHospEmail">Official Email *</label>
              <input type="email" id="onboardHospEmail" class="form-control" placeholder="admin@apollo.in" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="onboardHospBeds">Total Bed Capacity *</label>
              <input type="number" id="onboardHospBeds" class="form-control" min="1" placeholder="e.g. 350" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="onboardHospPhone">Contact Telephone *</label>
              <input type="tel" id="onboardHospPhone" class="form-control" placeholder="+91 11 9988 7766" required>
            </div>
            <div class="form-group full-width">
              <label class="form-label" for="onboardHospLocation">Physical Address / City *</label>
              <input type="text" id="onboardHospLocation" class="form-control" placeholder="e.g. Sarita Vihar, Mathura Road, New Delhi" required>
            </div>
          </div>
          <div id="onboardHospAlert" class="alert-banner hidden"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('onboardHospModal')">Cancel</button>
            <button type="submit" class="btn btn-primary">Onboard Facility</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleOnboardHospitalSubmit = async function(event) {
  event.preventDefault();
  const name = document.getElementById('onboardHospName')?.value.trim();
  const code = document.getElementById('onboardHospCode')?.value.trim();
  const email = document.getElementById('onboardHospEmail')?.value.trim();
  const totalBeds = parseInt(document.getElementById('onboardHospBeds')?.value || '100', 10);
  const contact = document.getElementById('onboardHospPhone')?.value.trim();
  const location = document.getElementById('onboardHospLocation')?.value.trim();
  const alertEl = document.getElementById('onboardHospAlert');

  try {
    await window.hospitrackStore.createHospital({
      name,
      code,
      email,
      totalBeds,
      contact,
      location
    });
    window.showToast(`Facility ${name} onboarded into national network.`, 'success');
    closeGlobalModal('onboardHospModal');
    window.renderAdminDashboard(document.getElementById('mainContentArea'));
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to onboard hospital.';
      alertEl.classList.remove('hidden');
    }
  }
};

// Patient Health Summary Viewer & Print Controller
window.openPatientHealthSummaryPrint = async function(patientId) {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const patient = store.getPatientById(patientId) || (store.getPatients() || []).find(p => p.id === patientId) || { id: patientId, name: 'Patient Record' };
  const hospital = store.getHospitalById(patient.currentHospitalId || patient.hospitalId) || { name: 'Assigned Hospital Facility', location: 'National Health Network' };
  const doctor = store.getDoctorById(patient.primaryDoctorId) || { name: 'Attending Physician', specialty: 'General Clinical Medicine' };
  
  const prescriptions = store.getPrescriptionsByPatient ? store.getPrescriptionsByPatient(patientId) : [];
  const reports = store.getLabsByPatient ? store.getLabsByPatient(patientId) : [];

  modalContainer.innerHTML = `
    <div id="adminPatientSummaryModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="summaryModalTitle">
      <div class="modal-box modal-box-lg">
        <div class="modal-header no-print">
          <div>
            <h3 class="modal-title" id="summaryModalTitle">📄 Longitudinal Health Summary</h3>
            <p class="modal-subtitle">Official verified clinical dossier for ${escapeHtml(patient.name || patientId)}</p>
          </div>
          <button type="button" class="modal-close" onclick="closeGlobalModal('adminPatientSummaryModal')" aria-label="Close">✕</button>
        </div>

        <div class="medical-summary-document" style="padding: 1.5rem; background: #ffffff; color: #0f172a; border-radius: var(--radius-md);">
          <!-- Header -->
          <div style="border-bottom: 2px solid #0d9488; padding-bottom: 1rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 1.3rem; font-weight: 800; color: #0d9488; letter-spacing: -0.5px;">HOSPITRACK NATIONAL HEALTHCARE NETWORK</div>
              <div style="font-size: 0.82rem; color: #64748b; margin-top: 2px;">Comprehensive Longitudinal Health Record Summary</div>
            </div>
            <div style="text-align: right; font-size: 0.78rem; color: #64748b;">
              <div>Generated: <strong>${new Date().toLocaleDateString([], { dateStyle: 'full' })}</strong></div>
              <div>Ledger: <strong style="color: #059669;">SHA-256 Verified</strong></div>
            </div>
          </div>

          <!-- Demographics -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 8px; margin-bottom: 1.25rem;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 8px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px;">Patient Demographics</div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; font-size: 0.84rem;">
              <div><strong>Full Name:</strong> ${escapeHtml(patient.name)}</div>
              <div><strong>Patient ID:</strong> <code>${escapeHtml(patient.id)}</code></div>
              <div><strong>Age / Gender:</strong> ${patient.age || 'N/A'} yrs / ${escapeHtml(patient.gender || 'N/A')}</div>
              <div><strong>Blood Group:</strong> <strong style="color: #0d9488;">${escapeHtml(patient.bloodGroup || 'N/A')}</strong></div>
              <div><strong>Contact Phone:</strong> ${escapeHtml(patient.contact || 'N/A')}</div>
              <div><strong>Email:</strong> ${escapeHtml(patient.email || 'N/A')}</div>
              <div><strong>Emergency Contact:</strong> ${escapeHtml(patient.emergencyContact || 'N/A')}</div>
              <div><strong>Address:</strong> ${escapeHtml(patient.address || 'N/A')}</div>
            </div>
          </div>

          <!-- Facility & Doctor -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 1.25rem;">
            <div style="padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
              <div style="font-size: 0.75rem; color: #64748b; font-weight: 700;">ASSIGNED HEALTHCARE FACILITY</div>
              <div style="font-weight: 700; font-size: 0.95rem; color: #0f172a; margin-top: 2px;">${escapeHtml(hospital.name)}</div>
              <div style="font-size: 0.8rem; color: #64748b;">${escapeHtml(hospital.location)}</div>
            </div>
            <div style="padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
              <div style="font-size: 0.75rem; color: #64748b; font-weight: 700;">ATTENDING PHYSICIAN</div>
              <div style="font-weight: 700; font-size: 0.95rem; color: #0f172a; margin-top: 2px;">${escapeHtml(doctor.name)}</div>
              <div style="font-size: 0.8rem; color: #64748b;">${escapeHtml(doctor.specialty || 'Clinical Medicine')}</div>
            </div>
          </div>

          <!-- Active Prescriptions -->
          <div style="margin-bottom: 1.25rem;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px; font-size: 0.88rem;">Active Medication Regimens (${prescriptions.length})</div>
            ${prescriptions.length === 0 ? `<p style="color: #64748b; font-size: 0.82rem; margin: 0;">No active prescriptions recorded.</p>` : `
              <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;">
                <thead>
                  <tr style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                    <th style="padding: 6px 8px;">Date</th>
                    <th style="padding: 6px 8px;">Medications</th>
                    <th style="padding: 6px 8px;">Dosage &amp; Frequency</th>
                    <th style="padding: 6px 8px;">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  ${prescriptions.map(p => `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 6px 8px;">${new Date(p.prescribedAt || p.createdAt).toLocaleDateString()}</td>
                      <td style="padding: 6px 8px;">${(p.items || []).map(i => `<strong>${escapeHtml(i.name)}</strong>`).join(', ')}</td>
                      <td style="padding: 6px 8px;">${(p.items || []).map(i => `${escapeHtml(i.dosage)} (${escapeHtml(i.frequency)})`).join(', ')}</td>
                      <td style="padding: 6px 8px;">${(p.items || []).map(i => escapeHtml(i.duration)).join(', ')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>

          <!-- Diagnostic Labs -->
          <div style="margin-bottom: 1.25rem;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px; font-size: 0.88rem;">Diagnostic Laboratory Findings (${reports.length})</div>
            ${reports.length === 0 ? `<p style="color: #64748b; font-size: 0.82rem; margin: 0;">No diagnostic reports recorded.</p>` : `
              <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;">
                <thead>
                  <tr style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                    <th style="padding: 6px 8px;">Date</th>
                    <th style="padding: 6px 8px;">Test Name</th>
                    <th style="padding: 6px 8px;">Category</th>
                    <th style="padding: 6px 8px;">Result Finding</th>
                  </tr>
                </thead>
                <tbody>
                  ${reports.map(r => `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 6px 8px;">${new Date(r.reportDate || r.createdAt).toLocaleDateString()}</td>
                      <td style="padding: 6px 8px;"><strong>${escapeHtml(r.testName)}</strong></td>
                      <td style="padding: 6px 8px;">${escapeHtml(r.category || 'General')}</td>
                      <td style="padding: 6px 8px;">${escapeHtml(r.resultSummary || 'Normal')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 0.75rem; font-size: 0.75rem; color: #64748b; text-align: center;">
            Official document generated from Hospitrack Enterprise Healthcare Network. Tamper-evident and privacy-protected.
          </div>
        </div>

        <div class="modal-actions no-print" style="margin-top: 1rem; display: flex; justify-content: flex-end; gap: 8px;">
          <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('adminPatientSummaryModal')">Close</button>
          <button type="button" class="btn btn-primary" onclick="window.print()">🖨️ Print Health Summary</button>
        </div>
      </div>
    </div>
  `;
};
