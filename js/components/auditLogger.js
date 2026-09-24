/**
 * Hospitrack - System Audit Trail & Security Ledger Component
 * Cryptographically signed chronological event log with multi-factor search, role & action filtering
 */

let auditSearchText = '';
let auditRoleSelected = 'ALL';
let auditActionSelected = 'ALL';

window.renderAuditLogger = function(container) {
  const store = window.hospitrackStore;
  const logs = store.getAuditLogs(auditRoleSelected, auditActionSelected, auditSearchText);

  container.innerHTML = `
    <!-- Top Ledger Banner -->
    <div class="workspace-banner" style="border-left: 4px solid var(--primary);">
      <div class="banner-left">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="badge badge-info">Immutable Ledger</span>
          <span class="badge badge-active">SHA-256 State Signatures</span>
        </div>
        <h1 class="banner-title">System Audit Trail & Compliance Log</h1>
        <p class="banner-subtitle">
          Real-time tamper-evident log capturing all hospital referrals, patient admissions, physician prescriptions, and administrative operations.
        </p>
      </div>
      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <button class="btn btn-secondary btn-sm" onclick="exportAuditLogsJson()">
          <span>💾</span> Export JSON Log
        </button>
        <button class="btn btn-secondary btn-sm" onclick="window.print()">
          <span>🖨️</span> Print Audit Summary
        </button>
      </div>
    </div>

    <!-- Filter & Search Bar -->
    <div class="glass-panel">
      <div class="glass-panel-header">
        <h3 class="panel-title">
          <span>📜</span> Event Inspection & Filter Controls
        </h3>
        <span class="badge badge-neutral">${logs.length} Matching Audit Records</span>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 12px; align-items: center;">
        <div>
          <label class="form-label" for="auditSearchInput">Search Details, Entities or IDs</label>
          <input 
            type="text" 
            id="auditSearchInput" 
            class="form-control" 
            placeholder="e.g. John Doe, PAT-301, RX-801, or CGH-01..."
            value="${auditSearchText}"
            oninput="handleAuditSearchChange(this.value)"
          >
        </div>
        <div>
          <label class="form-label" for="auditRoleFilter">Filter by Actor Role</label>
          <select id="auditRoleFilter" class="form-control" onchange="handleAuditRoleFilter(this.value)">
            <option value="ALL" ${auditRoleSelected === 'ALL' ? 'selected' : ''}>All Roles</option>
            <option value="ADMIN" ${auditRoleSelected === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
            <option value="HOSPITAL" ${auditRoleSelected === 'HOSPITAL' ? 'selected' : ''}>HOSPITAL</option>
            <option value="DOCTOR" ${auditRoleSelected === 'DOCTOR' ? 'selected' : ''}>DOCTOR</option>
            <option value="PATIENT" ${auditRoleSelected === 'PATIENT' ? 'selected' : ''}>PATIENT</option>
          </select>
        </div>
        <div>
          <label class="form-label" for="auditActionFilter">Filter by Action Type</label>
          <select id="auditActionFilter" class="form-control" onchange="handleAuditActionFilter(this.value)">
            <option value="ALL" ${auditActionSelected === 'ALL' ? 'selected' : ''}>All Actions</option>
            <option value="HOSPITAL" ${auditActionSelected === 'HOSPITAL' ? 'selected' : ''}>Hospital Operations</option>
            <option value="PATIENT" ${auditActionSelected === 'PATIENT' ? 'selected' : ''}>Patient Admissions</option>
            <option value="PRESCRIPTION" ${auditActionSelected === 'PRESCRIPTION' ? 'selected' : ''}>Prescriptions</option>
            <option value="REFERRAL" ${auditActionSelected === 'REFERRAL' ? 'selected' : ''}>Referrals</option>
            <option value="TRANSFER" ${auditActionSelected === 'TRANSFER' ? 'selected' : ''}>Transfers</option>
            <option value="VISIT" ${auditActionSelected === 'VISIT' ? 'selected' : ''}>Clinical Visits</option>
          </select>
        </div>
        <div style="padding-top: 22px;">
          <button class="btn btn-secondary" onclick="resetAuditFilters()">
            Clear Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Timeline of Audit Events -->
    <div class="glass-panel">
      <div id="auditTimelineContainer">
        ${renderAuditTimelineList(logs)}
      </div>
    </div>
  `;
};

function renderAuditTimelineList(logs) {
  if (logs.length === 0) {
    return `
      <div class="empty-state">
        <span class="empty-icon">📜</span>
        <h4 class="empty-title">No Audit Records Found</h4>
        <p class="empty-desc">No events matched the current search terms and role filters.</p>
      </div>
    `;
  }

  return `
    <div class="timeline-track">
      ${logs.map(l => {
        const roleBadgeClass = getAuditRoleBadgeClass(l.actorRole);
        const actionIcon = getActionIcon(l.action);

        return `
          <div class="timeline-node">
            <div class="timeline-bullet" style="background: ${getRoleColor(l.actorRole)};"></div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span class="badge ${roleBadgeClass}">${l.actorRole}</span>
                <span style="font-size: 1rem;">${actionIcon}</span>
                <strong style="color: var(--text-main); font-size: 0.95rem;">${l.action}</strong>
                <span class="badge badge-neutral">${l.targetEntity}: ${l.targetId}</span>
              </div>
              <span style="font-size: 0.75rem; color: var(--text-dim); font-family: monospace;">
                🕒 ${new Date(l.timestamp).toLocaleString()}
              </span>
            </div>

            <p style="color: var(--text-secondary); font-size: 0.86rem; line-height: 1.5; margin: 4px 0;">
              ${l.details}
            </p>

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-dim); border-top: 1px dashed rgba(255,255,255,0.06); padding-top: 6px; margin-top: 6px;">
              <span>Actor: <strong>${l.actorName || l.actorId}</strong> (<code>${l.actorId}</code>)</span>
              <span>Ledger Ref: <code>${l.id}</code></span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function getAuditRoleBadgeClass(role) {
  if (role === 'ADMIN') return 'badge-danger';
  if (role === 'HOSPITAL') return 'badge-info';
  if (role === 'DOCTOR') return 'badge-active';
  if (role === 'PATIENT') return 'badge-warning';
  return 'badge-neutral';
}

function getRoleColor(role) {
  if (role === 'ADMIN') return 'var(--admin-color)';
  if (role === 'HOSPITAL') return 'var(--hospital-color)';
  if (role === 'DOCTOR') return 'var(--doctor-color)';
  if (role === 'PATIENT') return 'var(--patient-color)';
  return 'var(--primary)';
}

function getActionIcon(action) {
  if (action.includes('HOSPITAL')) return '🏥';
  if (action.includes('PATIENT')) return '👥';
  if (action.includes('PRESCRIPTION')) return '💊';
  if (action.includes('REFERRAL')) return '🔁';
  if (action.includes('TRANSFER')) return '🚑';
  if (action.includes('VISIT')) return '📋';
  if (action.includes('REPORT')) return '🧪';
  return '⚡';
}

window.handleAuditSearchChange = function(val) {
  auditSearchText = val;
  const store = window.hospitrackStore;
  const logs = store.getAuditLogs(auditRoleSelected, auditActionSelected, auditSearchText);
  const container = document.getElementById('auditTimelineContainer');
  if (container) container.innerHTML = renderAuditTimelineList(logs);
};

window.handleAuditRoleFilter = function(role) {
  auditRoleSelected = role;
  const store = window.hospitrackStore;
  const logs = store.getAuditLogs(auditRoleSelected, auditActionSelected, auditSearchText);
  const container = document.getElementById('auditTimelineContainer');
  if (container) container.innerHTML = renderAuditTimelineList(logs);
};

window.handleAuditActionFilter = function(action) {
  auditActionSelected = action;
  const store = window.hospitrackStore;
  const logs = store.getAuditLogs(auditRoleSelected, auditActionSelected, auditSearchText);
  const container = document.getElementById('auditTimelineContainer');
  if (container) container.innerHTML = renderAuditTimelineList(logs);
};

window.resetAuditFilters = function() {
  auditSearchText = '';
  auditRoleSelected = 'ALL';
  auditActionSelected = 'ALL';
  document.getElementById('auditSearchInput').value = '';
  document.getElementById('auditRoleFilter').value = 'ALL';
  document.getElementById('auditActionFilter').value = 'ALL';
  window.renderAuditLogger(document.getElementById('mainContentArea'));
};

window.exportAuditLogsJson = function() {
  const store = window.hospitrackStore;
  const logs = store.getAuditLogs();
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hospitrack-audit-trail-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  window.showToast('Audit log JSON exported successfully!', 'success');
};
