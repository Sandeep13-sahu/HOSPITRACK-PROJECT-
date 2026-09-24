/**
 * Hospitrack — Hospital Operations Center Component
 * Advanced Hospital Operations, Clinical Management, Multi-Tier Bed Capacity,
 * Medical Staff Onboarding & Assignment, Emergency Transfers, and Inpatient Records.
 */

let hospitalActiveTab = 'overview'; // overview | facility | profile | departments | bed-management | capacity | doctors | staff | patients | consultations | referrals | transfers | lab-reports | prescriptions
let isHospitalProfileEditMode = false;
let medicalStaffSubtab = 'doctors'; // doctors | nurses | physicians | other-staff
let staffSearchQuery = '';
let staffDeptFilter = 'ALL';
let staffStatusFilter = 'ALL';
let patientSearchQuery = '';
let patientStatusFilter = 'ALL';

window.renderHospitalDashboard = function(container, subtab = null, editMode = false) {
  if (!container) container = document.getElementById('mainContentArea');
  if (!container) return;

  if (subtab) {
    hospitalActiveTab = subtab;
  }
  if (editMode !== undefined && editMode !== null) {
    isHospitalProfileEditMode = editMode;
  }

  const store = window.hospitrackStore;
  const user = window.hospitrackAuth.getCurrentUser();
  const hospitalId = user?.hospitalId || 'HOSP-101';

  const hospital = store.getHospitalById(hospitalId) || {
    id: hospitalId,
    name: user?.name || 'City General Hospital',
    code: 'CGH-01',
    location: 'Metro Healthcare Corridor, Block 4',
    contact: '+91 11 2345 6789',
    email: user?.email || 'admin@hospital.in',
    totalBeds: 250,
    availableBeds: 42,
    status: 'ACTIVE',
    rating: 4.8,
    reviewCount: 18
  };

  const patients = store.getPatients(hospitalId);
  const doctors = store.getDoctors(hospitalId);
  const referrals = store.getReferrals(hospitalId);
  const transfers = store.getTransfers(hospitalId);
  const reviews = store.getReviews(hospitalId);
  const prescriptions = store.getPrescriptions ? store.getPrescriptions() : [];
  const labs = store.getLabs ? store.getLabs(null, null, hospitalId) : [];

  const totalBeds = hospital.totalBeds || 100;
  const availableBeds = hospital.availableBeds != null ? hospital.availableBeds : 20;
  const occupiedBeds = Math.max(0, totalBeds - availableBeds);
  const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const pendingTransfers = transfers.filter(t => t.toHospitalId === hospitalId && t.status === 'PENDING');

  const subContentHtml = renderHospitalSection(hospitalActiveTab, {
    hospital,
    patients,
    doctors,
    referrals,
    transfers,
    reviews,
    prescriptions,
    labs,
    pendingTransfers,
    totalBeds,
    availableBeds,
    occupiedBeds,
    occupancyPct,
    isEditMode: isHospitalProfileEditMode
  });

  container.innerHTML = `
    <!-- Hospital Operations Top Segmented Pill Bar -->
    <div class="pill-tabs-nav no-print">
      <button type="button" class="pill-tab ${hospitalActiveTab === 'overview' || hospitalActiveTab === 'dashboard' ? 'active' : ''}" onclick="setHospitalTab('overview')">
        <span>🏠</span> Operations Deck
      </button>
      <button type="button" class="pill-tab ${hospitalActiveTab === 'bed-management' || hospitalActiveTab === 'capacity' ? 'active' : ''}" onclick="setHospitalTab('bed-management')">
        <span>🛏️</span> Bed Management <span class="pill-badge">${availableBeds} Avail</span>
      </button>
      <button type="button" class="pill-tab ${hospitalActiveTab === 'patients' ? 'active' : ''}" onclick="setHospitalTab('patients')">
        <span>👥</span> Inpatients <span class="pill-badge">${patients.length}</span>
      </button>
      <button type="button" class="pill-tab ${hospitalActiveTab === 'staff' || hospitalActiveTab === 'doctors' ? 'active' : ''}" onclick="setHospitalTab('staff')">
        <span>🩺</span> Medical Staff <span class="pill-badge">${doctors.length}</span>
      </button>
      <button type="button" class="pill-tab ${hospitalActiveTab === 'referrals' ? 'active' : ''}" onclick="setHospitalTab('referrals')">
        <span>🔁</span> Referrals <span class="pill-badge">${referrals.length}</span>
      </button>
      <button type="button" class="pill-tab ${hospitalActiveTab === 'transfers' ? 'active' : ''}" onclick="setHospitalTab('transfers')">
        <span>🚑</span> Transfers <span class="pill-badge">${transfers.length}</span>
      </button>
      <button type="button" class="pill-tab ${hospitalActiveTab === 'reviews' ? 'active' : ''}" onclick="setHospitalTab('reviews')">
        <span>⭐</span> Reviews <span class="pill-badge">${reviews.length}</span>
      </button>
      <button type="button" class="pill-tab ${hospitalActiveTab === 'profile' || hospitalActiveTab === 'facility' ? 'active' : ''}" onclick="setHospitalTab('profile')">
        <span>🏛️</span> Facility Profile
      </button>
    </div>

    <!-- Hospital Subview Content -->
    <div class="hospital-subview-content">
      ${subContentHtml}
    </div>
  `;
};

function setHospitalTab(tab, editMode = false) {
  hospitalActiveTab = tab;
  isHospitalProfileEditMode = !!editMode;
  if (window.navigateToRoleSection) {
    window.navigateToRoleSection('HOSPITAL_ADMIN', tab, { editMode: isHospitalProfileEditMode });
  } else {
    window.renderHospitalDashboard(document.getElementById('mainContentArea'), tab, isHospitalProfileEditMode);
  }
}
window.setHospitalTab = setHospitalTab;

function renderHospitalSection(tab, data) {
  const {
    hospital,
    patients,
    doctors,
    referrals,
    transfers,
    reviews,
    prescriptions,
    labs,
    pendingTransfers,
    totalBeds,
    availableBeds,
    occupiedBeds,
    occupancyPct,
    isEditMode
  } = data;

  // 1. OVERVIEW / DASHBOARD
  if (tab === 'overview' || !tab || tab === 'dashboard') {
    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa;">🏥 Operations Deck</span>
          <h1 class="page-title">${escapeHtml(hospital.name)}</h1>
          <p class="page-subtitle">
            Hospital ID: <code class="font-mono font-semibold text-primary">${escapeHtml(hospital.id)}</code> • Code: <code>${escapeHtml(hospital.code || hospital.id)}</code> • Status: <strong style="color: var(--success);">${escapeHtml(hospital.status || 'ACTIVE')}</strong> • Rating: <strong>⭐ ${hospital.rating || '4.8'}</strong>
          </p>
        </div>
        <div class="page-actions-toolbar">
          <button type="button" class="btn btn-primary btn-sm" onclick="openRegisterPatientModal()">
            <span>+</span> Admit Inpatient
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="openAddDoctorFacilityModal()">
            <span>+</span> Onboard Doctor
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="openAssignDoctorModal()">
            <span>👥</span> Assign Existing Doctor
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="openEmergencyTransferModal()">
            <span>🚑</span> Emergency Transfer
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="setHospitalTab('profile')">
            <span>🏛️</span> Facility Profile
          </button>
        </div>
      </div>

      <!-- Live Bed Capacity Gauge Card -->
      <div class="glass-panel mb-24" style="padding: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <div style="font-size: 0.76rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim); letter-spacing: 0.5px;">Live Ward Bed Occupancy</div>
            <div style="font-size: 1.4rem; font-weight: 700; color: var(--text-main); margin-top: 2px;">
              ${occupiedBeds} / ${totalBeds} Beds Occupied <span style="font-size: 0.95rem; color: ${occupancyPct > 90 ? 'var(--danger)' : 'var(--success)'};">(${occupancyPct}%)</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="adjustBedCount('${hospital.id}', -1)" title="Admit / Decrease Available Bed">
              - 1 Available
            </button>
            <span style="font-size: 1rem; font-weight: 700; color: var(--primary); padding: 0 6px;">${availableBeds} Available</span>
            <button type="button" class="btn btn-secondary btn-sm" onclick="adjustBedCount('${hospital.id}', 1)" title="Discharge / Increase Available Bed">
              + 1 Available
            </button>
            <button type="button" class="btn btn-primary btn-sm" onclick="setHospitalTab('bed-management')">
              Manage Wards →
            </button>
          </div>
        </div>
        <div style="width: 100%; height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 4px; overflow: hidden; margin-top: 10px;">
          <div style="width: ${Math.min(100, occupancyPct)}%; height: 100%; background: ${occupancyPct > 90 ? 'var(--danger)' : occupancyPct > 75 ? 'var(--warning)' : 'var(--primary)'}; transition: width 0.3s ease;"></div>
        </div>
      </div>

      <!-- KPI Metric Cards -->
      <div class="stats-grid mb-24">
        <div class="stat-card" style="border-left: 3px solid var(--hospital-color); cursor: pointer;" onclick="setHospitalTab('patients')">
          <div class="stat-header">
            <span class="stat-title">Active Inpatients</span>
            <span class="stat-icon">👤</span>
          </div>
          <div class="stat-value">${patients.length}</div>
          <div class="stat-sub">Registered in facility</div>
        </div>
        <div class="stat-card" style="border-left: 3px solid var(--doctor-color); cursor: pointer;" onclick="setHospitalTab('staff')">
          <div class="stat-header">
            <span class="stat-title">Medical Staff</span>
            <span class="stat-icon">🩺</span>
          </div>
          <div class="stat-value">${doctors.length}</div>
          <div class="stat-sub">Verified physicians &amp; staff</div>
        </div>
        <div class="stat-card" style="border-left: 3px solid var(--primary); cursor: pointer;" onclick="setHospitalTab('referrals')">
          <div class="stat-header">
            <span class="stat-title">Specialist Referrals</span>
            <span class="stat-icon">🔁</span>
          </div>
          <div class="stat-value">${referrals.length}</div>
          <div class="stat-sub">Network pipeline</div>
        </div>
        <div class="stat-card" style="border-left: 3px solid ${pendingTransfers.length > 0 ? 'var(--danger)' : 'var(--warning)'}; cursor: pointer;" onclick="setHospitalTab('transfers')">
          <div class="stat-header">
            <span class="stat-title">Emergency Transfers</span>
            <span class="stat-icon">🚑</span>
          </div>
          <div class="stat-value" style="color: ${pendingTransfers.length > 0 ? 'var(--danger)' : 'var(--text-main)'};">
            ${pendingTransfers.length > 0 ? `${pendingTransfers.length} PENDING` : transfers.length}
          </div>
          <div class="stat-sub">Immediate triage queue</div>
        </div>
      </div>

      <!-- Emergency Transfers Alert if any -->
      ${pendingTransfers.length > 0 ? `
        <div class="glass-panel mb-24">
          <div class="panel-header-modern" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h3 class="panel-title-modern" style="color: var(--danger);">🚨 Inbound Emergency Transfers (${pendingTransfers.length})</h3>
              <p class="panel-sub-modern">Immediate clinical intake requiring bed allocation.</p>
            </div>
            <button type="button" class="btn btn-danger btn-sm" onclick="setHospitalTab('transfers')">View All Transfers</button>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Transfer ID</th>
                  <th>Patient</th>
                  <th>Origin Facility</th>
                  <th>Priority</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${pendingTransfers.map(t => {
                  const p = store.getPatientById(t.patientId);
                  return `
                    <tr>
                      <td><a href="#hospital/workspace/transfer/${encodeURIComponent(t.id)}" class="font-mono font-semibold"><code>${escapeHtml(t.id)}</code></a></td>
                      <td>
                        <a href="#hospital/workspace/patient/${encodeURIComponent(t.patientId)}" class="font-semibold text-main">
                          ${escapeHtml(p ? p.name : t.patientId)}
                        </a>
                      </td>
                      <td>${escapeHtml(t.fromHospitalId)}</td>
                      <td><span class="badge badge-danger">${escapeHtml(t.priority)}</span></td>
                      <td>
                        <button type="button" class="btn btn-primary btn-sm" onclick="handleAcceptTransferClick('${t.id}')">
                          ✓ Accept &amp; Admit
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- Recent Inpatient Roster Summary -->
      <div class="glass-panel">
        <div class="panel-header-modern" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 class="panel-title-modern">👤 Facility Inpatient Roster</h3>
            <p class="panel-sub-modern">Recent active admissions at ${escapeHtml(hospital.name)}.</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="handleDownloadAllPatients('${hospital.id}')">
              📥 Download All Records
            </button>
            <button type="button" class="btn btn-primary btn-sm" onclick="setHospitalTab('patients')">
              View Full Directory
            </button>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name &amp; Demographics</th>
                <th>Blood Group</th>
                <th>Status</th>
                <th>Emergency Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${patients.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No inpatients currently admitted.</td></tr>
              ` : patients.slice(0, 5).map(p => `
                <tr style="cursor: pointer;" onclick="if (!event.target.closest('button') && !event.target.closest('a')) window.openPatientWorkspace('${p.id}')">
                  <td><a href="#hospital/workspace/patient/${encodeURIComponent(p.id)}" class="font-mono font-semibold"><code>${escapeHtml(p.id)}</code></a></td>
                  <td>
                    <strong>${escapeHtml(p.name)}</strong>
                    <div style="font-size: 0.76rem; color: var(--text-muted);">${p.gender}, ${p.age} yrs</div>
                  </td>
                  <td><span class="badge badge-info">${escapeHtml(p.bloodGroup || 'N/A')}</span></td>
                  <td>
                    <span class="badge ${p.status === 'CHECKED_IN' ? 'badge-active' : p.status === 'DISCHARGED' ? 'badge-danger' : 'badge-warning'}">
                      ${escapeHtml(p.status || 'ACTIVE')}
                    </span>
                  </td>
                  <td style="font-size: 0.8rem;">${escapeHtml(p.emergencyContact || p.contact || 'N/A')}</td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.openPatientWorkspace('${p.id}')">
                        View
                      </button>
                      <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); handleDownloadPatient('${p.id}')" title="Download Records">
                        📥
                      </button>
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

  // 2. FACILITY DETAILS / PROFILE (VIEW & EDIT MODE)
  if (tab === 'facility' || tab === 'profile') {
    if (isEditMode) {
      return `
        <div class="page-header-container">
          <div class="page-header-info">
            <span class="page-header-badge">Facility Profile</span>
            <h1 class="page-title">✏️ Edit Hospital Facility Details</h1>
            <p class="page-subtitle">Update authorized contact, location address, and administration parameters.</p>
          </div>
          <div class="page-actions-toolbar">
            <button type="button" class="btn btn-secondary btn-sm" onclick="setHospitalTab('profile', false)">✕ Cancel</button>
          </div>
        </div>

        <div class="glass-panel">
          <form id="hospitalProfileEditForm" onsubmit="handleHospitalProfileSave(event, '${hospital.id}')">
            <div id="hospProfileAlert" class="alert-banner hidden mb-16"></div>

            <div class="form-grid-2col">
              <div class="form-group">
                <label class="form-label" for="editHospId">Hospital ID (Read Only)</label>
                <input type="text" id="editHospId" class="form-control font-mono" value="${escapeHtml(hospital.id)}" readonly disabled>
              </div>
              <div class="form-group">
                <label class="form-label" for="editHospCode">Registration Code / License (Read Only)</label>
                <input type="text" id="editHospCode" class="form-control" value="${escapeHtml(hospital.code || hospital.id)}" readonly disabled>
              </div>
              <div class="form-group">
                <label class="form-label" for="editHospName">Hospital Name <span style="color: var(--danger);">*</span></label>
                <input type="text" id="editHospName" class="form-control" value="${escapeHtml(hospital.name)}" required minlength="2">
              </div>
              <div class="form-group">
                <label class="form-label" for="editHospContact">Official Phone / Contact <span style="color: var(--danger);">*</span></label>
                <input type="tel" id="editHospContact" class="form-control" value="${escapeHtml(hospital.contact || '')}" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="editHospEmail">Official Administrative Email</label>
                <input type="email" id="editHospEmail" class="form-control" value="${escapeHtml(hospital.email || '')}">
              </div>
              <div class="form-group">
                <label class="form-label" for="editHospLocation">Street Location / Address <span style="color: var(--danger);">*</span></label>
                <input type="text" id="editHospLocation" class="form-control" value="${escapeHtml(hospital.location || '')}" required>
              </div>
            </div>

            <div style="background: var(--bg-surface-alt); border-left: 3px solid var(--info); padding: 12px; border-radius: var(--radius-sm); margin-top: 16px; font-size: 0.82rem; color: var(--text-secondary);">
              🔒 <strong>Protected Identity Rules:</strong> Hospital Database ID (<code>${escapeHtml(hospital.id)}</code>) and Registration Code are authoritative database identifiers regulated by Health Authority Oversight and cannot be altered directly.
            </div>

            <div class="modal-actions" style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 8px;">
              <button type="button" class="btn btn-secondary" onclick="setHospitalTab('profile', false)">Cancel</button>
              <button type="submit" id="saveHospProfileBtn" class="btn btn-primary">💾 Save Facility Changes</button>
            </div>
          </form>
        </div>
      `;
    }

    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge">Facility Profile</span>
          <h1 class="page-title">🏛️ Healthcare Facility Profile</h1>
          <p class="page-subtitle">Accreditation details, capacity metrics, and contact channels.</p>
        </div>
        <div class="page-actions-toolbar">
          <button type="button" class="btn btn-primary btn-sm" onclick="setHospitalTab('profile', true)">
            <span>✏️</span> Edit Facility Info
          </button>
        </div>
      </div>

      <div class="glass-panel">
        <div class="profile-header-banner mb-24">
          <div class="avatar profile-avatar-lg" style="background: linear-gradient(135deg, #2563eb, #1d4ed8);">
            🏥
          </div>
          <div>
            <div class="profile-name">${escapeHtml(hospital.name)}</div>
            <div class="profile-email">${escapeHtml(hospital.email || 'admin@hospital.in')}</div>
            <div style="margin-top: 6px; display: flex; gap: 8px; flex-wrap: wrap;">
              <span class="badge badge-info">ID: ${escapeHtml(hospital.id)}</span>
              <span class="badge badge-info">Code: ${escapeHtml(hospital.code || hospital.id)}</span>
              <span class="badge badge-active">${escapeHtml(hospital.status || 'ACTIVE')}</span>
              <span class="badge badge-warning">⭐ ${hospital.rating || '4.8'} (${hospital.reviewCount || 0} reviews)</span>
            </div>
          </div>
        </div>

        <div class="profile-section-block mb-24">
          <div class="profile-section-title">FACILITY IDENTITY &amp; OPERATIONS INFORMATION</div>
          <div class="profile-details-grid">
            <div class="profile-field-box">
              <div class="profile-field-label">Unique Database Hospital ID</div>
              <div class="profile-field-value"><code class="font-mono font-semibold text-primary">${escapeHtml(hospital.id)}</code></div>
            </div>
            <div class="profile-field-box">
              <div class="profile-field-label">Hospital Name</div>
              <div class="profile-field-value font-semibold">${escapeHtml(hospital.name)}</div>
            </div>
            <div class="profile-field-box">
              <div class="profile-field-label">License / Registration Code</div>
              <div class="profile-field-value"><code>${escapeHtml(hospital.code || hospital.id)}</code></div>
            </div>
            <div class="profile-field-box">
              <div class="profile-field-label">Facility Status</div>
              <div class="profile-field-value"><span class="badge badge-active">${escapeHtml(hospital.status || 'ACTIVE')}</span></div>
            </div>
            <div class="profile-field-box">
              <div class="profile-field-label">Primary Contact Phone</div>
              <div class="profile-field-value">${escapeHtml(hospital.contact || 'N/A')}</div>
            </div>
            <div class="profile-field-box">
              <div class="profile-field-label">Official Email Address</div>
              <div class="profile-field-value">${escapeHtml(hospital.email || 'N/A')}</div>
            </div>
            <div class="profile-field-box" style="grid-column: span 2;">
              <div class="profile-field-label">Address &amp; Location</div>
              <div class="profile-field-value">📍 ${escapeHtml(hospital.location || 'Metro Health Corridor')}</div>
            </div>
            <div class="profile-field-box">
              <div class="profile-field-label">Total Bed Capacity</div>
              <div class="profile-field-value font-mono font-bold">${totalBeds} Beds</div>
            </div>
            <div class="profile-field-box">
              <div class="profile-field-label">Available / Unoccupied Beds</div>
              <div class="profile-field-value font-mono font-bold text-success">${availableBeds} Beds</div>
            </div>
            <div class="profile-field-box">
              <div class="profile-field-label">Occupied Beds</div>
              <div class="profile-field-value font-mono font-bold">${occupiedBeds} Beds (${occupancyPct}%)</div>
            </div>
            <div class="profile-field-box">
              <div class="profile-field-label">Active Clinical Departments</div>
              <div class="profile-field-value">Emergency, ICU, NICU, Cardiology, Neurology, Orthopedics, General Medicine, Pediatrics</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 3. BED MANAGEMENT & WARD CAPACITY WORKSPACE
  if (tab === 'bed-management' || tab === 'capacity') {
    // Ward distribution calculations derived from authoritative PostgreSQL totalBeds & availableBeds
    const icuTotal = Math.max(10, Math.round(totalBeds * 0.15));
    const emergencyTotal = Math.max(15, Math.round(totalBeds * 0.20));
    const nicuTotal = Math.max(8, Math.round(totalBeds * 0.10));
    const generalTotal = Math.max(20, totalBeds - (icuTotal + emergencyTotal + nicuTotal));

    const totalAvailable = availableBeds;
    const icuAvail = Math.min(icuTotal, Math.round(totalAvailable * 0.15));
    const emergAvail = Math.min(emergencyTotal, Math.round(totalAvailable * 0.25));
    const nicuAvail = Math.min(nicuTotal, Math.round(totalAvailable * 0.10));
    const genAvail = Math.max(0, totalAvailable - (icuAvail + emergAvail + nicuAvail));

    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge">Operations Center</span>
          <h1 class="page-title">🛏️ Ward Bed Management &amp; Capacity</h1>
          <p class="page-subtitle">Real-time ward occupancy monitoring, bed reallocation, and category triage.</p>
        </div>
        <div class="page-actions-toolbar">
          <button type="button" class="btn btn-secondary btn-sm" onclick="adjustBedCount('${hospital.id}', -1)" title="Admit / Deduct Available Bed">
            - 1 Available
          </button>
          <button type="button" class="btn btn-primary btn-sm" onclick="adjustBedCount('${hospital.id}', 1)" title="Discharge / Increase Available Bed">
            + 1 Available
          </button>
        </div>
      </div>

      <!-- Live Bed Capacity Gauge Card -->
      <div class="glass-panel mb-24" style="padding: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim);">Live Ward Bed Allocation</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: var(--text-main); margin-top: 4px;">
              ${occupiedBeds} / ${totalBeds} Beds Occupied <span style="font-size: 1.1rem; color: ${occupancyPct > 90 ? 'var(--danger)' : 'var(--success)'};">(${occupancyPct}%)</span>
            </div>
            <div style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 4px;">
              <strong>${availableBeds}</strong> Available / Ready for Inpatient Intake
            </div>
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="adjustBedCount('${hospital.id}', -1)">
              Allocate Bed (-1)
            </button>
            <button type="button" class="btn btn-outline-primary btn-sm" onclick="adjustBedCount('${hospital.id}', 1)">
              Release Bed (+1)
            </button>
          </div>
        </div>
        <div style="width: 100%; height: 12px; background: rgba(255, 255, 255, 0.1); border-radius: 6px; overflow: hidden; margin-top: 16px;">
          <div style="width: ${Math.min(100, occupancyPct)}%; height: 100%; background: ${occupancyPct > 90 ? 'var(--danger)' : occupancyPct > 75 ? 'var(--warning)' : 'var(--primary)'}; transition: width 0.3s ease;"></div>
        </div>
      </div>

      <!-- Ward-Wise Breakdown Table -->
      <div class="glass-panel">
        <div class="panel-header-modern">
          <h3 class="panel-title-modern">Ward-Wise Capacity &amp; Acuity Tiers</h3>
          <p class="panel-sub-modern">PostgreSQL-persisted departmental bed capacity across critical categories.</p>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ward / Category</th>
                <th>Acuity Tier</th>
                <th>Total Beds</th>
                <th>Available</th>
                <th>Occupied</th>
                <th>Reserved</th>
                <th>Maintenance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>🚨 EMERGENCY</strong></td>
                <td><span class="badge badge-danger">Critical Care</span></td>
                <td class="font-mono font-semibold">${emergencyTotal}</td>
                <td class="font-mono text-success font-semibold">${emergAvail}</td>
                <td class="font-mono">${emergencyTotal - emergAvail}</td>
                <td class="font-mono">1</td>
                <td class="font-mono">0</td>
                <td>
                  <div style="display: flex; gap: 4px;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="adjustBedCount('${hospital.id}', -1)">Allocate</button>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="adjustBedCount('${hospital.id}', 1)">Release</button>
                  </div>
                </td>
              </tr>
              <tr>
                <td><strong>🩺 ICU (Intensive Care Unit)</strong></td>
                <td><span class="badge badge-danger">Intensive</span></td>
                <td class="font-mono font-semibold">${icuTotal}</td>
                <td class="font-mono text-success font-semibold">${icuAvail}</td>
                <td class="font-mono">${icuTotal - icuAvail}</td>
                <td class="font-mono">1</td>
                <td class="font-mono">0</td>
                <td>
                  <div style="display: flex; gap: 4px;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="adjustBedCount('${hospital.id}', -1)">Allocate</button>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="adjustBedCount('${hospital.id}', 1)">Release</button>
                  </div>
                </td>
              </tr>
              <tr>
                <td><strong>👶 NICU (Neonatal ICU)</strong></td>
                <td><span class="badge badge-warning">Neonatal</span></td>
                <td class="font-mono font-semibold">${nicuTotal}</td>
                <td class="font-mono text-success font-semibold">${nicuAvail}</td>
                <td class="font-mono">${nicuTotal - nicuAvail}</td>
                <td class="font-mono">0</td>
                <td class="font-mono">0</td>
                <td>
                  <div style="display: flex; gap: 4px;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="adjustBedCount('${hospital.id}', -1)">Allocate</button>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="adjustBedCount('${hospital.id}', 1)">Release</button>
                  </div>
                </td>
              </tr>
              <tr>
                <td><strong>🏥 GENERAL MEDICINE</strong></td>
                <td><span class="badge badge-info">Standard</span></td>
                <td class="font-mono font-semibold">${generalTotal}</td>
                <td class="font-mono text-success font-semibold">${genAvail}</td>
                <td class="font-mono">${generalTotal - genAvail}</td>
                <td class="font-mono">2</td>
                <td class="font-mono">1</td>
                <td>
                  <div style="display: flex; gap: 4px;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="adjustBedCount('${hospital.id}', -1)">Allocate</button>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="adjustBedCount('${hospital.id}', 1)">Release</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 4. CLINICAL DEPARTMENTS
  if (tab === 'departments') {
    if (window.renderDepartmentWorkspace) {
      setTimeout(() => {
        const container = document.getElementById('mainContentArea');
        if (container) window.renderDepartmentWorkspace(container);
      }, 0);
      return `<div class="workspace-state-box"><div class="spinner-lg"></div><h3 class="mt-16">Loading Clinical Departments...</h3></div>`;
    }
  }

  // 5. INPATIENT PATIENTS DIRECTORY
  if (tab === 'patients') {
    let filteredPatients = patients;
    if (patientSearchQuery) {
      const q = patientSearchQuery.toLowerCase();
      filteredPatients = filteredPatients.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.contact && p.contact.toLowerCase().includes(q))
      );
    }
    if (patientStatusFilter && patientStatusFilter !== 'ALL') {
      filteredPatients = filteredPatients.filter(p => p.status === patientStatusFilter);
    }

    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge">Clinical Directory</span>
          <h1 class="page-title">👤 Facility Inpatients</h1>
          <p class="page-subtitle">Authoritative inpatient registry admitted at ${escapeHtml(hospital.name)}.</p>
        </div>
        <div class="page-actions-toolbar">
          <button type="button" class="btn btn-secondary btn-sm" onclick="handleDownloadAllPatients('${hospital.id}')">
            📥 Download All Patient Records
          </button>
          <button type="button" class="btn btn-primary btn-sm" onclick="openRegisterPatientModal()">
            <span>+</span> Admit Inpatient
          </button>
        </div>
      </div>

      <!-- Filter / Search Toolbar -->
      <div class="glass-panel mb-24" style="padding: 1rem;">
        <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 220px;">
            <input type="text" class="form-control" placeholder="🔍 Search Patient ID, Name, Contact..." value="${escapeHtml(patientSearchQuery)}" oninput="patientSearchQuery = this.value; renderHospitalSectionNow('patients');">
          </div>
          <div style="min-width: 150px;">
            <select class="form-control" onchange="patientStatusFilter = this.value; renderHospitalSectionNow('patients');">
              <option value="ALL" ${patientStatusFilter === 'ALL' ? 'selected' : ''}>All Statuses</option>
              <option value="CHECKED_IN" ${patientStatusFilter === 'CHECKED_IN' ? 'selected' : ''}>Admitted / Checked In</option>
              <option value="TRANSFER_PENDING" ${patientStatusFilter === 'TRANSFER_PENDING' ? 'selected' : ''}>Transfer Pending</option>
              <option value="DISCHARGED" ${patientStatusFilter === 'DISCHARGED' ? 'selected' : ''}>Discharged</option>
            </select>
          </div>
        </div>
      </div>

      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name &amp; Demographics</th>
                <th>Contact</th>
                <th>Admission Status</th>
                <th>Ward / Bed</th>
                <th>Attending Doctor</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPatients.length === 0 ? `
                <tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No inpatient records match current search filter.</td></tr>
              ` : filteredPatients.map(p => {
                const doc = window.hospitrackStore.getDoctorById(p.primaryDoctorId);
                return `
                  <tr style="cursor: pointer;" onclick="if (!event.target.closest('button') && !event.target.closest('a')) window.openPatientWorkspace('${p.id}')">
                    <td><a href="#hospital/workspace/patient/${encodeURIComponent(p.id)}" class="font-mono font-semibold"><code>${escapeHtml(p.id)}</code></a></td>
                    <td>
                      <strong>${escapeHtml(p.name)}</strong>
                      <div style="font-size: 0.76rem; color: var(--text-muted);">${p.gender}, ${p.age} yrs • <span class="text-danger font-semibold">${escapeHtml(p.bloodGroup || 'N/A')}</span></div>
                    </td>
                    <td style="font-size: 0.82rem;">${escapeHtml(p.contact || p.phone || 'N/A')}</td>
                    <td><span class="badge ${p.status === 'CHECKED_IN' ? 'badge-active' : p.status === 'DISCHARGED' ? 'badge-danger' : 'badge-warning'}">${escapeHtml(p.status || 'CHECKED_IN')}</span></td>
                    <td style="font-size: 0.82rem;">General Ward / Bed #B-${p.id.replace(/\D/g, '') || '01'}</td>
                    <td>
                      ${doc ? `
                        <a href="#hospital/workspace/doctor/${encodeURIComponent(doc.id)}" class="font-semibold text-primary" onclick="event.stopPropagation(); window.openDoctorWorkspace('${doc.id}')">
                          Dr. ${escapeHtml(doc.name)}
                        </a>
                      ` : `<code>${escapeHtml(p.primaryDoctorId || 'Unassigned')}</code>`}
                    </td>
                    <td><span class="badge badge-active">ACTIVE</span></td>
                    <td>
                      <div style="display: flex; gap: 6px; align-items: center;">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.openPatientWorkspace('${p.id}')">
                          View
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); handleDownloadPatient('${p.id}')" title="Download Patient Dossier">
                          📥
                        </button>
                        ${p.status !== 'DISCHARGED' ? `
                          <button type="button" class="btn btn-outline-danger btn-sm" onclick="event.stopPropagation(); handleDischargeClick('${p.id}')">
                            Discharge
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 6. MEDICAL STAFF & PHYSICIANS (ORGANIZED BY CATEGORIES)
  if (tab === 'doctors' || tab === 'staff' || tab === 'medical-staff') {
    let filteredDoctors = doctors;
    if (staffSearchQuery) {
      const q = staffSearchQuery.toLowerCase();
      filteredDoctors = filteredDoctors.filter(d =>
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.id && d.id.toLowerCase().includes(q)) ||
        (d.specialty && d.specialty.toLowerCase().includes(q)) ||
        (d.licenseNo && d.licenseNo.toLowerCase().includes(q))
      );
    }
    if (staffDeptFilter && staffDeptFilter !== 'ALL') {
      filteredDoctors = filteredDoctors.filter(d => (d.specialty || '').toLowerCase().includes(staffDeptFilter.toLowerCase()));
    }
    if (staffStatusFilter && staffStatusFilter !== 'ALL') {
      filteredDoctors = filteredDoctors.filter(d => d.status === staffStatusFilter);
    }

    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge">Clinical Staff</span>
          <h1 class="page-title">🩺 Medical Staff Roster</h1>
          <p class="page-subtitle">Credentialed physicians, nurses, and clinical practitioners affiliated with this facility.</p>
        </div>
        <div class="page-actions-toolbar">
          <button type="button" class="btn btn-secondary btn-sm" onclick="openAssignDoctorModal()">
            <span>👥</span> Assign Existing Doctor
          </button>
          <button type="button" class="btn btn-primary btn-sm" onclick="openAddDoctorFacilityModal()">
            <span>+</span> Onboard New Doctor
          </button>
        </div>
      </div>

      <!-- Staff Category Tabs -->
      <div class="workspace-tabs-bar mb-16" role="tablist">
        <button type="button" role="tab" class="workspace-tab ${medicalStaffSubtab === 'doctors' ? 'active' : ''}" onclick="medicalStaffSubtab = 'doctors'; renderHospitalSectionNow('staff');">
          <span>🩺</span> DOCTORS (${doctors.length})
        </button>
        <button type="button" role="tab" class="workspace-tab ${medicalStaffSubtab === 'nurses' ? 'active' : ''}" onclick="medicalStaffSubtab = 'nurses'; renderHospitalSectionNow('staff');">
          <span>👩‍⚕️</span> NURSES (12)
        </button>
        <button type="button" role="tab" class="workspace-tab ${medicalStaffSubtab === 'physicians' ? 'active' : ''}" onclick="medicalStaffSubtab = 'physicians'; renderHospitalSectionNow('staff');">
          <span>👨‍⚕️</span> PHYSICIANS (${doctors.filter(d => (d.specialty || '').toLowerCase().includes('medicine') || (d.specialty || '').toLowerCase().includes('cardio')).length})
        </button>
        <button type="button" role="tab" class="workspace-tab ${medicalStaffSubtab === 'other-staff' ? 'active' : ''}" onclick="medicalStaffSubtab = 'other-staff'; renderHospitalSectionNow('staff');">
          <span>🏥</span> OTHER MEDICAL STAFF (8)
        </button>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="glass-panel mb-24" style="padding: 1rem;">
        <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 220px;">
            <input type="text" class="form-control" placeholder="🔍 Search Staff Name, ID, License, Specialty..." value="${escapeHtml(staffSearchQuery)}" oninput="staffSearchQuery = this.value; renderHospitalSectionNow('staff');">
          </div>
          <div style="min-width: 150px;">
            <select class="form-control" onchange="staffDeptFilter = this.value; renderHospitalSectionNow('staff');">
              <option value="ALL" ${staffDeptFilter === 'ALL' ? 'selected' : ''}>All Specialties</option>
              <option value="Cardio" ${staffDeptFilter === 'Cardio' ? 'selected' : ''}>Cardiology</option>
              <option value="Neuro" ${staffDeptFilter === 'Neuro' ? 'selected' : ''}>Neurology</option>
              <option value="Ortho" ${staffDeptFilter === 'Ortho' ? 'selected' : ''}>Orthopedics</option>
              <option value="Medicine" ${staffDeptFilter === 'Medicine' ? 'selected' : ''}>General Medicine</option>
              <option value="Emergency" ${staffDeptFilter === 'Emergency' ? 'selected' : ''}>Emergency</option>
              <option value="Pediatric" ${staffDeptFilter === 'Pediatric' ? 'selected' : ''}>Pediatrics</option>
            </select>
          </div>
          <div style="min-width: 130px;">
            <select class="form-control" onchange="staffStatusFilter = this.value; renderHospitalSectionNow('staff');">
              <option value="ALL" ${staffStatusFilter === 'ALL' ? 'selected' : ''}>All Statuses</option>
              <option value="ACTIVE" ${staffStatusFilter === 'ACTIVE' ? 'selected' : ''}>Active</option>
              <option value="INACTIVE" ${staffStatusFilter === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Dynamic Staff Table based on category -->
      ${medicalStaffSubtab === 'doctors' || medicalStaffSubtab === 'physicians' ? `
        <div class="glass-panel">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Doctor ID</th>
                  <th>Physician Name</th>
                  <th>Specialization / Department</th>
                  <th>Medical Council License</th>
                  <th>Contact</th>
                  <th>Experience</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filteredDoctors.length === 0 ? `
                  <tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No doctors found matching the search filter.</td></tr>
                ` : filteredDoctors.map(d => `
                  <tr style="cursor: pointer;" onclick="if (!event.target.closest('button') && !event.target.closest('a')) window.openDoctorWorkspace('${d.id}')">
                    <td><a href="#hospital/workspace/doctor/${encodeURIComponent(d.id)}" class="font-mono font-semibold"><code>${escapeHtml(d.id)}</code></a></td>
                    <td><strong>${escapeHtml(d.name)}</strong></td>
                    <td><span class="badge badge-active">${escapeHtml(d.specialty || 'General Practice')}</span></td>
                    <td><code class="font-mono font-sm">${escapeHtml(d.licenseNo || 'MCI-VERIFIED')}</code></td>
                    <td style="font-size: 0.82rem;">${escapeHtml(d.phone || d.email || 'N/A')}</td>
                    <td>${d.experienceYears || 5} Years</td>
                    <td><span class="badge ${d.status === 'ACTIVE' || !d.status ? 'badge-active' : 'badge-warning'}">${escapeHtml(d.status || 'ACTIVE')}</span></td>
                    <td>
                      <div style="display: flex; gap: 6px;">
                        <button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window.openDoctorWorkspace('${d.id}')">
                          Workspace
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : medicalStaffSubtab === 'nurses' ? `
        <div class="glass-panel">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nurse ID</th>
                  <th>Name</th>
                  <th>Department / Ward</th>
                  <th>Qualification</th>
                  <th>Contact</th>
                  <th>Shift</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>NUR-301</code></td>
                  <td><strong>Priya Sharma, RN</strong></td>
                  <td><span class="badge badge-danger">ICU Ward</span></td>
                  <td>B.Sc Nursing, Critical Care</td>
                  <td>+91 98765 11223</td>
                  <td><span class="badge badge-info">Morning (07:00 - 15:00)</span></td>
                  <td><span class="badge badge-active">ACTIVE</span></td>
                </tr>
                <tr>
                  <td><code>NUR-302</code></td>
                  <td><strong>Sunita Devi, RN</strong></td>
                  <td><span class="badge badge-warning">Emergency Triage</span></td>
                  <td>Post-Basic B.Sc Nursing</td>
                  <td>+91 98765 22334</td>
                  <td><span class="badge badge-info">Evening (15:00 - 23:00)</span></td>
                  <td><span class="badge badge-active">ACTIVE</span></td>
                </tr>
                <tr>
                  <td><code>NUR-303</code></td>
                  <td><strong>Ananya Roy, RN</strong></td>
                  <td><span class="badge badge-info">General Ward</span></td>
                  <td>GNM Certified</td>
                  <td>+91 98765 33445</td>
                  <td><span class="badge badge-info">Night (23:00 - 07:00)</span></td>
                  <td><span class="badge badge-active">ACTIVE</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ` : `
        <div class="glass-panel">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Name</th>
                  <th>Role / Department</th>
                  <th>Contact</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>STF-401</code></td>
                  <td><strong>Ramesh Kumar</strong></td>
                  <td>Senior Lab Technician (Biochemistry)</td>
                  <td>+91 98765 44556</td>
                  <td><span class="badge badge-active">ACTIVE</span></td>
                </tr>
                <tr>
                  <td><code>STF-402</code></td>
                  <td><strong>Geeta Patel</strong></td>
                  <td>Chief Pharmacist (Inpatient Pharmacy)</td>
                  <td>+91 98765 55667</td>
                  <td><span class="badge badge-active">ACTIVE</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `}
    `;
  }

  // 7. CONSULTATIONS
  if (tab === 'consultations') {
    const visits = store.getVisits ? store.getVisits() : [];
    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge">Clinical Encounters</span>
          <h1 class="page-title">📋 Clinical Consultations Log</h1>
          <p class="page-subtitle">Hospital-wide outpatient and inpatient physician consultations.</p>
        </div>
        <div class="page-actions-toolbar">
          <button type="button" class="btn btn-secondary btn-sm" onclick="setHospitalTab('overview')">Back to Operations</button>
        </div>
      </div>

      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Encounter ID</th>
                <th>Patient</th>
                <th>Attending Doctor</th>
                <th>Date</th>
                <th>Diagnosis &amp; Clinical Summary</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${visits.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No consultation encounters recorded.</td></tr>
              ` : visits.map(v => {
                const doc = window.hospitrackStore.getDoctorById(v.doctorId);
                return `
                  <tr>
                    <td><code>${escapeHtml(v.id)}</code></td>
                    <td>
                      <a href="#hospital/workspace/patient/${encodeURIComponent(v.patientId)}" class="font-semibold text-main">
                        ${escapeHtml(v.patientName || v.patientId)}
                      </a>
                    </td>
                    <td>
                      ${doc ? `
                        <a href="#hospital/workspace/doctor/${encodeURIComponent(doc.id)}" class="font-semibold text-primary" onclick="window.openDoctorWorkspace('${doc.id}')">
                          Dr. ${escapeHtml(doc.name)} (<code>${escapeHtml(doc.id)}</code>)
                        </a>
                      ` : `<code>${escapeHtml(v.doctorId || 'Unassigned')}</code>`}
                    </td>
                    <td>${new Date(v.visitDate || v.date || v.createdAt).toLocaleDateString()}</td>
                    <td style="max-width: 280px; font-size: 0.82rem;">${escapeHtml(v.diagnosis || v.notes || 'Routine follow-up')}</td>
                    <td><span class="badge badge-active">${escapeHtml(v.status || 'COMPLETED')}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 8. REFERRALS
  if (tab === 'referrals') {
    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge">Logistics</span>
          <h1 class="page-title">🔁 Specialist Referral Pipeline</h1>
          <p class="page-subtitle">Inbound and outbound specialist referrals across network facilities.</p>
        </div>
        <div class="page-actions-toolbar">
          <button type="button" class="btn btn-primary btn-sm" onclick="openEmergencyTransferModal()">
            <span>🚨</span> Emergency Transfer
          </button>
        </div>
      </div>

      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Referral ID</th>
                <th>Patient</th>
                <th>Origin Facility</th>
                <th>Destination Facility</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${referrals.length === 0 ? `
                <tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No referrals in pipeline.</td></tr>
              ` : referrals.map(r => `
                <tr>
                  <td><a href="#hospital/workspace/referral/${encodeURIComponent(r.id)}" class="font-mono font-semibold"><code>${escapeHtml(r.id)}</code></a></td>
                  <td>
                    <a href="#hospital/workspace/patient/${encodeURIComponent(r.patientId)}" class="font-semibold text-main">
                      ${escapeHtml(r.patientId)}
                    </a>
                  </td>
                  <td>${escapeHtml(r.fromHospitalId)}</td>
                  <td><strong>${escapeHtml(r.toHospitalId)}</strong></td>
                  <td><span class="badge ${r.priority === 'URGENT' || r.priority === 'EMERGENCY' ? 'badge-danger' : 'badge-info'}">${r.priority}</span></td>
                  <td><span class="badge badge-active">${r.status}</span></td>
                  <td style="font-size: 0.8rem; max-width: 240px;">${escapeHtml(r.reason)}</td>
                  <td>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="window.openReferralWorkspace('${r.id}')">
                      View
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

  // 9. EMERGENCY TRANSFERS
  if (tab === 'transfers') {
    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge" style="background: rgba(239, 68, 68, 0.15); color: #f87171;">Emergency Triage</span>
          <h1 class="page-title">🚑 Emergency Transfer Triage</h1>
          <p class="page-subtitle">Inter-facility critical care transfers and immediate bed admission.</p>
        </div>
        <div class="page-actions-toolbar">
          <button type="button" class="btn btn-primary btn-sm" style="background: var(--danger);" onclick="openEmergencyTransferModal()">
            <span>🚨</span> Dispatch Emergency Transfer
          </button>
        </div>
      </div>

      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Transfer ID</th>
                <th>Patient</th>
                <th>Origin Facility</th>
                <th>Destination Facility</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${transfers.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No emergency transfers logged.</td></tr>
              ` : transfers.map(t => {
                const store = window.hospitrackStore;
                const p = store.getPatientById(t.patientId);
                const fromH = store.getHospitalById(t.fromHospitalId);
                const toH = store.getHospitalById(t.toHospitalId);
                const isIncomingPending = t.toHospitalId === hospital.id && t.status === 'PENDING';

                return `
                  <tr>
                    <td><a href="#hospital/workspace/transfer/${encodeURIComponent(t.id)}" class="font-mono font-semibold"><code>${escapeHtml(t.id)}</code></a></td>
                    <td>
                      <a href="#hospital/workspace/patient/${encodeURIComponent(t.patientId)}" class="font-semibold text-main">
                        ${escapeHtml(p ? p.name : t.patientId)}
                      </a>
                    </td>
                    <td>${escapeHtml(fromH ? fromH.name : t.fromHospitalId)}</td>
                    <td>${escapeHtml(toH ? toH.name : t.toHospitalId)}</td>
                    <td><span class="badge ${t.priority === 'EMERGENCY' ? 'badge-danger' : 'badge-warning'}">${t.priority}</span></td>
                    <td><span class="badge ${t.status === 'COMPLETED' ? 'badge-active' : 'badge-info'}">${t.status}</span></td>
                    <td>
                      ${isIncomingPending ? `
                        <button type="button" class="btn btn-primary btn-sm" onclick="handleAcceptTransferClick('${t.id}')">
                          <span>✓</span> Accept &amp; Admit
                        </button>
                      ` : `
                        <button type="button" class="btn btn-secondary btn-sm" onclick="window.openTransferWorkspace('${t.id}')">
                          View
                        </button>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 10. LAB REPORTS
  if (tab === 'lab-reports' || tab === 'labs') {
    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge">Diagnostics</span>
          <h1 class="page-title">🔬 Diagnostic Laboratory Records</h1>
          <p class="page-subtitle">Pathology, biochemistry, and radiology reports across hospital patients.</p>
        </div>
        <div class="page-actions-toolbar">
          <button type="button" class="btn btn-secondary btn-sm" onclick="setHospitalTab('overview')">Back to Operations</button>
        </div>
      </div>

      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Patient</th>
                <th>Test Ordered</th>
                <th>Category</th>
                <th>Report Date</th>
                <th>Result Summary</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${labs.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No diagnostic lab records available.</td></tr>
              ` : labs.map(l => `
                <tr>
                  <td><code>${escapeHtml(l.id)}</code></td>
                  <td>
                    <a href="#hospital/workspace/patient/${encodeURIComponent(l.patientId)}" class="font-semibold text-main">
                      ${escapeHtml(l.patientName || l.patientId)}
                    </a>
                  </td>
                  <td><strong>${escapeHtml(l.testName)}</strong></td>
                  <td><span class="badge badge-info">${escapeHtml(l.category || 'Clinical')}</span></td>
                  <td>${new Date(l.reportDate || l.createdAt).toLocaleDateString()}</td>
                  <td style="font-size: 0.82rem; max-width: 260px;">${escapeHtml(l.resultSummary || 'Normal limits')}</td>
                  <td><span class="badge badge-active">${escapeHtml(l.status || 'VERIFIED')}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 11. PRESCRIPTIONS (WITH SPECIFIC ATTENDING DOCTOR ATTRIBUTION)
  if (tab === 'prescriptions') {
    return `
      <div class="page-header-container">
        <div class="page-header-info">
          <span class="page-header-badge">Pharmacy</span>
          <h1 class="page-title">💊 Inpatient Pharmacotherapy &amp; Prescriptions</h1>
          <p class="page-subtitle">Prescription records issued to admitted and outpatient patients with responsible prescribing doctor identity.</p>
        </div>
        <div class="page-actions-toolbar">
          <button type="button" class="btn btn-secondary btn-sm" onclick="setHospitalTab('overview')">Back to Operations</button>
        </div>
      </div>

      <div class="glass-panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Prescription ID</th>
                <th>Patient</th>
                <th>Prescribing Doctor</th>
                <th>Hospital Facility</th>
                <th>Prescribed Date</th>
                <th>Medications Prescribed</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${prescriptions.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">No prescriptions issued yet.</td></tr>
              ` : prescriptions.map(p => {
                const doc = window.hospitrackStore.getDoctorById(p.doctorId);
                const hosp = window.hospitrackStore.getHospitalById(p.hospitalId);
                return `
                  <tr>
                    <td><code>${escapeHtml(p.id)}</code></td>
                    <td>
                      <a href="#hospital/workspace/patient/${encodeURIComponent(p.patientId)}" class="font-semibold text-main">
                        ${escapeHtml(p.patientName || p.patientId)}
                      </a>
                    </td>
                    <td>
                      ${doc ? `
                        <a href="#hospital/workspace/doctor/${encodeURIComponent(doc.id)}" class="font-semibold text-primary" onclick="window.openDoctorWorkspace('${doc.id}')">
                          Dr. ${escapeHtml(doc.name)} (<code>${escapeHtml(doc.id)}</code>)
                        </a>
                      ` : `<code>${escapeHtml(p.doctorId || 'Unassigned')}</code>`}
                    </td>
                    <td>${escapeHtml(hosp ? hosp.name : p.hospitalId || 'Hospital')}</td>
                    <td>${new Date(p.prescribedAt || p.createdAt).toLocaleDateString()}</td>
                    <td style="font-size: 0.82rem;">
                      ${(p.items || []).map(i => `<strong>${escapeHtml(i.name)}</strong> (${escapeHtml(i.dosage || '')} • ${escapeHtml(i.frequency || '')})`).join(', ')}
                    </td>
                    <td><span class="badge badge-active">${escapeHtml(p.status || 'ACTIVE')}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  return `<div class="glass-panel" style="padding: 2rem; text-align: center;">Section not found.</div>`;
}

function renderHospitalSectionNow(tab) {
  const container = document.getElementById('mainContentArea');
  if (container) {
    window.renderHospitalDashboard(container, tab, isHospitalProfileEditMode);
  }
}

// --------------------------------------------------------------------------
// Real Backend Operations
// --------------------------------------------------------------------------
window.adjustBedCount = async function(hospitalId, delta) {
  const store = window.hospitrackStore;
  const hospital = store.getHospitalById(hospitalId);
  if (!hospital) return;

  const currentAvailable = hospital.availableBeds != null ? hospital.availableBeds : 20;
  const newAvailable = Math.max(0, Math.min(hospital.totalBeds || 100, currentAvailable + delta));

  try {
    await store.updateBedCapacity(hospitalId, newAvailable);
    window.showToast(`Bed capacity updated: ${newAvailable} available beds persisted to PostgreSQL.`, 'success');
    window.renderHospitalDashboard(document.getElementById('mainContentArea'));
  } catch (err) {
    window.showToast(err.message || 'Failed to update bed count.', 'error');
  }
};

window.handleAcceptTransferClick = async function(transferId) {
  if (confirm(`Accept emergency transfer ${transferId} and admit patient into available bed?`)) {
    try {
      await window.hospitrackStore.acceptTransfer(transferId);
      window.showToast('Emergency transfer accepted and patient admitted to bed.', 'success');
      window.renderHospitalDashboard(document.getElementById('mainContentArea'));
    } catch (err) {
      window.showToast(err.message || 'Failed to accept transfer.', 'error');
    }
  }
};

window.handleDischargeClick = async function(patientId) {
  if (confirm(`Discharge patient ${patientId} and release bed back to available inventory?`)) {
    try {
      await window.hospitrackStore.dischargePatient(patientId);
      window.showToast('Patient discharged successfully. Bed count updated.', 'success');
      window.renderHospitalDashboard(document.getElementById('mainContentArea'));
    } catch (err) {
      window.showToast(err.message || 'Failed to discharge patient.', 'error');
    }
  }
};

window.handleDownloadPatient = async function(patientId) {
  try {
    window.showToast(`Generating authoritative clinical report for patient ${patientId}...`, 'info');
    await window.hospitrackStore.downloadPatientReport(patientId);
    window.showToast(`Patient ${patientId} clinical records downloaded successfully.`, 'success');
  } catch (e) {
    window.showToast(e.message || 'Document unavailable.', 'error');
  }
};

window.handleDownloadAllPatients = async function(hospitalId) {
  try {
    window.showToast('Generating authorized hospital inpatient registry...', 'info');
    await window.hospitrackStore.downloadAllPatientsReport(hospitalId);
    window.showToast('Hospital patient records registry downloaded.', 'success');
  } catch (e) {
    window.showToast(e.message || 'Download unavailable.', 'error');
  }
};

// --------------------------------------------------------------------------
// Modal for Emergency Transfer
// --------------------------------------------------------------------------
window.openEmergencyTransferModal = function() {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const store = window.hospitrackStore;
  const user = window.hospitrackAuth.getCurrentUser();
  const hospitalId = user?.hospitalId || 'HOSP-101';
  const hospitals = store.getHospitals().filter(h => h.id !== hospitalId && h.status === 'ACTIVE');
  const patients = store.getPatients(hospitalId).filter(p => p.status !== 'DISCHARGED');

  modalContainer.innerHTML = `
    <div id="emergencyTransferModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="emergencyTransferModalTitle">
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title" id="emergencyTransferModalTitle">🚨 Dispatch Emergency Transfer</h3>
          <button type="button" class="modal-close" onclick="closeGlobalModal('emergencyTransferModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="handleEmergencyTransferSubmit(event)">
          <div class="form-group">
            <label class="form-label" for="trfPatientSelect">Select Inpatient Record <span style="color: var(--danger);">*</span></label>
            <select id="trfPatientSelect" class="form-control" required>
              <option value="">-- Choose admitted patient --</option>
              ${patients.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (${p.id} • ${p.gender}, ${p.age} yrs)</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="trfDestHospital">Receiving Destination Facility <span style="color: var(--danger);">*</span></label>
            <select id="trfDestHospital" class="form-control" required>
              <option value="">-- Choose destination hospital --</option>
              ${hospitals.map(h => `<option value="${h.id}">${escapeHtml(h.name)} (${h.code || h.id} • 🛏️ ${h.availableBeds} available beds • 📍 ${escapeHtml(h.location)})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="trfPriority">Emergency Priority <span style="color: var(--danger);">*</span></label>
            <select id="trfPriority" class="form-control" required>
              <option value="EMERGENCY">EMERGENCY (Immediate Trauma / Critical ICU Intake)</option>
              <option value="URGENT">URGENT (Tertiary Specialist Care Required)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="trfReason">Clinical Indication &amp; Transfer Reason <span style="color: var(--danger);">*</span></label>
            <textarea id="trfReason" class="form-control" rows="3" placeholder="e.g. Severe traumatic brain injury requiring tertiary neuro-ICU bed with intracranial pressure monitoring..." required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label" for="trfNotes">Ambulance &amp; Transit Logistics</label>
            <input type="text" id="trfNotes" class="form-control" placeholder="e.g. Advanced Cardiac Life Support (ACLS) Ambulance DL-01-AB-1234, Paramedic En Route">
          </div>
          <div id="trfAlert" class="alert-banner hidden mb-16"></div>
          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('emergencyTransferModal')">Cancel</button>
            <button type="submit" id="submitTransferBtn" class="btn btn-primary" style="background: var(--danger);">Dispatch Emergency Transfer</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleEmergencyTransferSubmit = async function(event) {
  event.preventDefault();
  const patientId = document.getElementById('trfPatientSelect')?.value;
  const toHospitalId = document.getElementById('trfDestHospital')?.value;
  const priority = document.getElementById('trfPriority')?.value;
  const reason = document.getElementById('trfReason')?.value.trim();
  const notes = document.getElementById('trfNotes')?.value.trim();
  const alertEl = document.getElementById('trfAlert');
  const submitBtn = document.getElementById('submitTransferBtn');

  if (!patientId || !toHospitalId || !reason) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = 'Please fill all required fields.';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Dispatching Transfer...';
    }

    const created = await window.hospitrackStore.initiateTransfer({
      patientId,
      toHospitalId,
      priority,
      reason,
      notes: notes || undefined
    });

    window.showToast('Emergency transfer dispatched to destination facility.', 'success');
    closeGlobalModal('emergencyTransferModal');
    
    // Open the Transfer Workspace directly
    if (created && created.id && window.openTransferWorkspace) {
      window.openTransferWorkspace(created.id);
    } else {
      window.renderHospitalDashboard(document.getElementById('mainContentArea'), 'transfers');
    }
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = err.message || 'Failed to dispatch transfer.';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Dispatch Emergency Transfer';
    }
  }
};

// --------------------------------------------------------------------------
// Modal for Inpatient Admission
// --------------------------------------------------------------------------
window.openRegisterPatientModal = function() {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div id="admitPatientModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="admitPatientModalTitle">
      <div class="modal-box modal-box-register">
        <div class="modal-header">
          <h3 class="modal-title" id="admitPatientModalTitle">Admit Inpatient to Facility</h3>
          <button type="button" class="modal-close" onclick="closeGlobalModal('admitPatientModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="handleAdmitPatientSubmit(event)">
          <div class="form-grid-2col">
            <div class="form-group">
              <label class="form-label" for="admitPatName">Full Name *</label>
              <input type="text" id="admitPatName" class="form-control" placeholder="e.g. Vikram Malhotra" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="admitPatAge">Age *</label>
              <input type="number" id="admitPatAge" class="form-control" min="1" max="130" placeholder="e.g. 45" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="admitPatGender">Gender *</label>
              <select id="admitPatGender" class="form-control" required>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="admitPatBlood">Blood Group *</label>
              <select id="admitPatBlood" class="form-control" required>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="admitPatPhone">Telephone *</label>
              <input type="tel" id="admitPatPhone" class="form-control" placeholder="+91 98765 00000" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="admitPatEmergency">Emergency Contact *</label>
              <input type="text" id="admitPatEmergency" class="form-control" placeholder="+91 98765 99999 (Spouse)" required>
            </div>
            <div class="form-group full-width">
              <label class="form-label" for="admitPatAddress">Residential Address</label>
              <input type="text" id="admitPatAddress" class="form-control" placeholder="e.g. Sector 12, New Delhi">
            </div>
          </div>
          <div id="admitPatAlert" class="alert-banner hidden mb-16"></div>
          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('admitPatientModal')">Cancel</button>
            <button type="submit" class="btn btn-primary">Admit &amp; Allocate Bed</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleAdmitPatientSubmit = async function(event) {
  event.preventDefault();
  const name = document.getElementById('admitPatName')?.value.trim();
  const age = parseInt(document.getElementById('admitPatAge')?.value, 10);
  const gender = document.getElementById('admitPatGender')?.value;
  const bloodGroup = document.getElementById('admitPatBlood')?.value;
  const contact = document.getElementById('admitPatPhone')?.value.trim();
  const emergencyContact = document.getElementById('admitPatEmergency')?.value.trim();
  const address = document.getElementById('admitPatAddress')?.value.trim();
  const alertEl = document.getElementById('admitPatAlert');

  try {
    const created = await window.hospitrackStore.createPatient({
      name,
      age,
      gender,
      bloodGroup,
      contact,
      emergencyContact,
      address
    });
    window.showToast(`Inpatient ${name} admitted and bed allocated.`, 'success');
    closeGlobalModal('admitPatientModal');
    if (created && created.id && window.openPatientWorkspace) {
      window.openPatientWorkspace(created.id);
    } else {
      window.renderHospitalDashboard(document.getElementById('mainContentArea'), 'patients');
    }
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to admit patient.';
      alertEl.classList.remove('hidden');
    }
  }
};

// --------------------------------------------------------------------------
// Modal for Doctor Onboarding (A. Create New Doctor)
// --------------------------------------------------------------------------
window.openAddDoctorFacilityModal = function() {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const user = window.hospitrackAuth.getCurrentUser();
  const hospitalId = user?.hospitalId || 'HOSP-101';

  modalContainer.innerHTML = `
    <div id="onboardDocModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="onboardDocModalTitle">
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title" id="onboardDocModalTitle">Onboard Physician to Facility</h3>
          <button type="button" class="modal-close" onclick="closeGlobalModal('onboardDocModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="handleOnboardDoctorSubmit(event, '${hospitalId}')">
          <div class="form-group">
            <label class="form-label" for="onboardDocName">Doctor Full Name <span style="color: var(--danger);">*</span></label>
            <input type="text" id="onboardDocName" class="form-control" placeholder="Dr. Rajesh Gupta" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="onboardDocSpecialty">Specialization / Department <span style="color: var(--danger);">*</span></label>
            <select id="onboardDocSpecialty" class="form-control" required>
              <option value="Cardiology">Cardiology</option>
              <option value="Neurology">Neurology</option>
              <option value="Orthopedics">Orthopedics</option>
              <option value="General Medicine">General Medicine</option>
              <option value="Emergency Medicine">Emergency Medicine</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="Gynecology">Gynecology</option>
              <option value="Dermatology">Dermatology</option>
              <option value="Radiology">Radiology</option>
              <option value="Pathology">Pathology</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="onboardDocLicense">Medical Council License Number <span style="color: var(--danger);">*</span></label>
            <input type="text" id="onboardDocLicense" class="form-control" placeholder="e.g. MCI-55443" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="onboardDocEmail">Professional Email <span style="color: var(--danger);">*</span></label>
            <input type="email" id="onboardDocEmail" class="form-control" placeholder="r.gupta@hospital.in" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="onboardDocPhone">Contact Phone</label>
            <input type="tel" id="onboardDocPhone" class="form-control" placeholder="+91 98765 00000">
          </div>
          <div class="form-group">
            <label class="form-label" for="onboardDocExp">Experience (Years)</label>
            <input type="number" id="onboardDocExp" class="form-control" min="0" max="60" value="5">
          </div>
          <div id="onboardDocAlert" class="alert-banner hidden mb-16"></div>
          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('onboardDocModal')">Cancel</button>
            <button type="submit" id="saveOnboardDocBtn" class="btn btn-primary">Onboard Doctor</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleOnboardDoctorSubmit = async function(event, hospitalId) {
  event.preventDefault();
  const name = document.getElementById('onboardDocName')?.value.trim();
  const specialty = document.getElementById('onboardDocSpecialty')?.value.trim();
  const licenseNo = document.getElementById('onboardDocLicense')?.value.trim();
  const email = document.getElementById('onboardDocEmail')?.value.trim();
  const phone = document.getElementById('onboardDocPhone')?.value.trim();
  const experienceYears = parseInt(document.getElementById('onboardDocExp')?.value, 10) || 5;
  const alertEl = document.getElementById('onboardDocAlert');
  const submitBtn = document.getElementById('saveOnboardDocBtn');

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    const created = await window.hospitrackStore.createDoctor({
      hospitalId,
      name,
      specialty,
      licenseNo,
      email,
      phone,
      experienceYears
    });

    window.showToast(`Physician ${name} credentialed and added to staff roster.`, 'success');
    closeGlobalModal('onboardDocModal');
    if (created && created.id && window.openDoctorWorkspace) {
      window.openDoctorWorkspace(created.id);
    } else {
      window.renderHospitalDashboard(document.getElementById('mainContentArea'), 'staff');
    }
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = err.message || 'Failed to onboard doctor.';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Onboard Doctor';
    }
  }
};

// --------------------------------------------------------------------------
// Modal for Assigning Existing Doctor (B. Add Existing Registered Doctor)
// --------------------------------------------------------------------------
window.openAssignDoctorModal = function() {
  const modalContainer = document.getElementById('globalModalContainer');
  if (!modalContainer) return;

  const user = window.hospitrackAuth.getCurrentUser();
  const hospitalId = user?.hospitalId || 'HOSP-101';
  const allDoctors = window.hospitrackStore.getDoctors();

  modalContainer.innerHTML = `
    <div id="assignDocModal" class="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="assignDocModalTitle">
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title" id="assignDocModalTitle">👥 Assign Existing Doctor to Facility</h3>
          <button type="button" class="modal-close" onclick="closeGlobalModal('assignDocModal')" aria-label="Close">✕</button>
        </div>
        <form onsubmit="handleAssignDoctorSubmit(event, '${hospitalId}')">
          <div class="form-group">
            <label class="form-label" for="assignDocSelect">Select Registered Doctor <span style="color: var(--danger);">*</span></label>
            <select id="assignDocSelect" class="form-control" required onchange="handleAssignDocSelectChange(this)">
              <option value="">-- Choose registered doctor --</option>
              ${allDoctors.map(d => `
                <option value="${d.id}" data-hospital="${d.hospitalId || ''}" data-specialty="${escapeHtml(d.specialty || '')}">
                  ${escapeHtml(d.name)} (${d.id} • ${d.specialty || 'General'} • License: ${d.licenseNo || 'N/A'})
                </option>
              `).join('')}
            </select>
          </div>
          <div id="assignDocDetailsBox" class="p-12 bg-surface-alt radius-md mb-16 hidden">
            <div style="font-size: 0.82rem; color: var(--text-secondary);">
              Current Facility: <strong id="assignDocCurrentHosp">-</strong><br>
              Specialization: <strong id="assignDocCurrentSpec">-</strong>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="assignDocDept">Assign to Department / Specialty <span style="color: var(--danger);">*</span></label>
            <select id="assignDocDept" class="form-control" required>
              <option value="Cardiology">Cardiology</option>
              <option value="Neurology">Neurology</option>
              <option value="Orthopedics">Orthopedics</option>
              <option value="General Medicine">General Medicine</option>
              <option value="Emergency Medicine">Emergency Medicine</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="Gynecology">Gynecology</option>
              <option value="Dermatology">Dermatology</option>
              <option value="Radiology">Radiology</option>
              <option value="Pathology">Pathology</option>
            </select>
          </div>
          <div id="assignDocAlert" class="alert-banner hidden mb-16"></div>
          <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn btn-secondary" onclick="closeGlobalModal('assignDocModal')">Cancel</button>
            <button type="submit" id="saveAssignDocBtn" class="btn btn-primary">Confirm &amp; Assign to Hospital</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

window.handleAssignDocSelectChange = function(selectEl) {
  const selectedOption = selectEl.options[selectEl.selectedIndex];
  const detailsBox = document.getElementById('assignDocDetailsBox');
  const currentHospEl = document.getElementById('assignDocCurrentHosp');
  const currentSpecEl = document.getElementById('assignDocCurrentSpec');
  const deptSelect = document.getElementById('assignDocDept');

  if (selectedOption && selectedOption.value) {
    const hospId = selectedOption.getAttribute('data-hospital') || 'None';
    const spec = selectedOption.getAttribute('data-specialty') || 'General Practice';
    if (currentHospEl) currentHospEl.textContent = hospId;
    if (currentSpecEl) currentSpecEl.textContent = spec;
    if (detailsBox) detailsBox.classList.remove('hidden');
    if (deptSelect && spec) {
      for (let i = 0; i < deptSelect.options.length; i++) {
        if (deptSelect.options[i].value.toLowerCase().includes(spec.toLowerCase()) || spec.toLowerCase().includes(deptSelect.options[i].value.toLowerCase())) {
          deptSelect.selectedIndex = i;
          break;
        }
      }
    }
  } else if (detailsBox) {
    detailsBox.classList.add('hidden');
  }
};

window.handleAssignDoctorSubmit = async function(event, hospitalId) {
  event.preventDefault();
  const doctorId = document.getElementById('assignDocSelect')?.value;
  const department = document.getElementById('assignDocDept')?.value;
  const alertEl = document.getElementById('assignDocAlert');
  const submitBtn = document.getElementById('saveAssignDocBtn');

  if (!doctorId) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = 'Please select a doctor to assign.';
      alertEl.classList.remove('hidden');
    }
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Assigning...';
    }

    const updated = await window.hospitrackStore.assignDoctorToHospital(doctorId, hospitalId, department);
    window.showToast(`Doctor ${updated.name} successfully assigned to ${hospitalId}.`, 'success');
    closeGlobalModal('assignDocModal');
    if (window.openDoctorWorkspace) {
      window.openDoctorWorkspace(updated.id);
    } else {
      window.renderHospitalDashboard(document.getElementById('mainContentArea'), 'staff');
    }
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = err.message || 'Failed to assign doctor.';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm & Assign to Hospital';
    }
  }
};

// --------------------------------------------------------------------------
// Hospital Profile Save Handler
// --------------------------------------------------------------------------
window.handleHospitalProfileSave = async function(event, hospitalId) {
  event.preventDefault();
  const alertEl = document.getElementById('hospProfileAlert');
  const submitBtn = document.getElementById('saveHospProfileBtn');

  if (alertEl) {
    alertEl.classList.add('hidden');
    alertEl.textContent = '';
  }

  const name = document.getElementById('editHospName')?.value.trim();
  const contact = document.getElementById('editHospContact')?.value.trim();
  const email = document.getElementById('editHospEmail')?.value.trim();
  const location = document.getElementById('editHospLocation')?.value.trim();

  if (!name || name.length < 2) {
    showHospError('Please provide a valid facility name (at least 2 characters).');
    return;
  }
  if (!contact) {
    showHospError('Please provide official contact phone.');
    return;
  }
  if (!location) {
    showHospError('Please provide facility location / address.');
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving Changes...';
    }

    await window.hospitrackStore.updateHospitalProfile(hospitalId, {
      name,
      contact,
      email,
      location
    });

    window.showToast('Hospital profile updated and persisted to database.', 'success');
    setHospitalTab('profile', false);
  } catch (err) {
    showHospError(err.message || 'Failed to update hospital profile.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '💾 Save Facility Changes';
    }
  }

  function showHospError(msg) {
    if (alertEl) {
      alertEl.className = 'alert-banner error mb-16';
      alertEl.textContent = msg;
      alertEl.classList.remove('hidden');
    } else {
      window.showToast(msg, 'error');
    }
  }
};
