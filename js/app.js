/**
 * Hospitrack — Production Router & Application Controller
 * Real Spring Security + JWT Authentication, Role-Aware Router,
 * Real-time Duplicate Medicine Check, Multi-facility Referral & Emergency Transfer Engine.
 */

let activeRole = null;
let activeTab = 'dashboard';
let activeRoleSubtab = 'overview';

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  const auth = window.hospitrackAuth;
  const store = window.hospitrackStore;

  // Initialize Modal Subsystem
  if (window.initModalManager) {
    window.initModalManager();
  }

  // Initialize Global Keyboard Navigation (Ctrl+K, Up/Down/Enter in search, Escape)
  initKeyboardNavigation();

  // Listen to hash changes for deep linking
  window.addEventListener('hashchange', handleUrlHashRouting);

  // Global Click-Outside Listener
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('open');
    }
    const profileWrap = document.querySelector('.header-profile-wrap');
    if (profileWrap && !profileWrap.contains(e.target)) {
      closeProfileDropdown();
    }
    const notifWrap = document.querySelector('.notification-btn-wrap');
    if (notifWrap && !notifWrap.contains(e.target)) {
      closeNotifDropdown();
    }
    const searchWrap = document.querySelector('.global-search-container');
    if (searchWrap && !searchWrap.contains(e.target)) {
      closeGlobalSearch();
    }
  });

  // Authentication State Check
  if (auth && auth.isAuthenticated()) {
    const authUser = auth.getCurrentUser();
    await store.syncAllData();
    showAuthenticatedApp(authUser);
  } else {
    // Check if user specifically navigated to #login or is landing on home
    if (window.location.hash === '#login') {
      showLoginView();
    } else {
      showLandingView();
    }
  }
}

// --------------------------------------------------------------------------
// URL Hash Deep-Link Handling (Email Verification, Password Reset & Workspaces)
// --------------------------------------------------------------------------
function handleUrlHashRouting() {
  const hash = window.location.hash;
  if (!hash) return;

  if (hash.startsWith('#verify-email=')) {
    const token = hash.replace('#verify-email=', '').trim();
    openVerifyEmailModal(token);
    return;
  }
  if (hash.startsWith('#reset-password=')) {
    const token = hash.replace('#reset-password=', '').trim();
    openResetPasswordModal(token);
    return;
  }

  const auth = window.hospitrackAuth;
  const isAuth = auth && auth.isAuthenticated();
  const user = isAuth ? auth.getCurrentUser() : null;

  if (hash === '#login' || hash === '#/login') {
    if (!isAuth) {
      showLoginView();
    }
    return;
  }

  if (hash.startsWith('#register')) {
    if (!isAuth) {
      showRegisterView();
    }
    return;
  }

  if (hash === '#home' || hash === '#about' || hash === '#how-it-works' || hash === '#for-patients' || hash === '#for-doctors' || hash === '#for-hospitals') {
    if (!isAuth) {
      showLandingView();
      navigateToLandingSection(hash.substring(1));
    }
    return;
  }

  // Authenticated Deep Routes: #role/section OR #{type}/workspace/{id}(/{tab})
  if (isAuth && user) {
    const rawHash = hash.replace(/^#\/?/, '');
    const parts = rawHash.split('/');
    const prefix = (parts[0] || '').toLowerCase();
    const secondPart = (parts[1] || '').toLowerCase();

    // Check for workspace deep route: #{type}/workspace/{id}(/{tab})
    if (secondPart === 'workspace' && parts[2]) {
      const workspaceType = prefix;
      const entityId = parts[2];
      const subtab = parts[3] ? parts[3].toLowerCase() : 'overview';
      openWorkspace(workspaceType, entityId, subtab, false);
      return;
    }

    const sectionName = parts[1] || (prefix !== user.role.toLowerCase() ? prefix : null);

    if (prefix === 'patient' || user.role === 'PATIENT') {
      navigateToRoleSection('PATIENT', sectionName || 'timeline', null, false);
    } else if (prefix === 'hospital' || user.role === 'HOSPITAL_ADMIN' || user.role === 'HOSPITAL') {
      navigateToRoleSection('HOSPITAL_ADMIN', sectionName || 'overview', null, false);
    } else if (prefix === 'doctor' || user.role === 'DOCTOR') {
      navigateToRoleSection('DOCTOR', sectionName || 'dashboard', null, false);
    } else if (prefix === 'admin' || user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      navigateToRoleSection('SUPER_ADMIN', sectionName || 'overview', null, false);
    }
  } else if (!isAuth) {
    showLoginView();
  }
}

// --------------------------------------------------------------------------
// View State Router (Landing, Login, Registration, App)
// --------------------------------------------------------------------------
function showLandingView() {
  const landingContainer = document.getElementById('landingViewContainer');
  const loginContainer = document.getElementById('loginViewContainer');
  const registerContainer = document.getElementById('registerViewContainer');
  const appContainer = document.getElementById('authenticatedAppContainer');

  if (landingContainer) landingContainer.classList.remove('hidden');
  if (loginContainer) loginContainer.classList.add('hidden');
  if (registerContainer) registerContainer.classList.add('hidden');
  if (appContainer) appContainer.classList.add('hidden');
}
window.showLandingView = showLandingView;

function navigateToLandingSection(sectionId) {
  showLandingView();
  if (sectionId) {
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
window.navigateToLandingSection = navigateToLandingSection;

function showLoginView() {
  const landingContainer = document.getElementById('landingViewContainer');
  const loginContainer = document.getElementById('loginViewContainer');
  const registerContainer = document.getElementById('registerViewContainer');
  const appContainer = document.getElementById('authenticatedAppContainer');

  if (landingContainer) landingContainer.classList.add('hidden');
  if (loginContainer) loginContainer.classList.remove('hidden');
  if (registerContainer) registerContainer.classList.add('hidden');
  if (appContainer) appContainer.classList.add('hidden');

  clearLoginAlert();
}
window.showLoginView = showLoginView;

function navigateToLogin(roleHint = 'PATIENT') {
  showLoginView();
  if (roleHint) {
    selectLoginRole(roleHint);
  }
}
window.navigateToLogin = navigateToLogin;

function showRegisterView() {
  const landingContainer = document.getElementById('landingViewContainer');
  const loginContainer = document.getElementById('loginViewContainer');
  const registerContainer = document.getElementById('registerViewContainer');
  const appContainer = document.getElementById('authenticatedAppContainer');

  if (landingContainer) landingContainer.classList.add('hidden');
  if (loginContainer) loginContainer.classList.add('hidden');
  if (registerContainer) registerContainer.classList.remove('hidden');
  if (appContainer) appContainer.classList.add('hidden');

  const successScreen = document.getElementById('registerSuccessScreen');
  if (successScreen) successScreen.classList.add('hidden');
  clearRegisterAlert();
}
window.showRegisterView = showRegisterView;

function navigateToRegister(type = 'PATIENT') {
  showRegisterView();
  switchRegistrationType(type);
}
window.navigateToRegister = navigateToRegister;

function showAuthenticatedApp(user) {
  const landingContainer = document.getElementById('landingViewContainer');
  const loginContainer = document.getElementById('loginViewContainer');
  const registerContainer = document.getElementById('registerViewContainer');
  const appContainer = document.getElementById('authenticatedAppContainer');

  if (landingContainer) landingContainer.classList.add('hidden');
  if (loginContainer) loginContainer.classList.add('hidden');
  if (registerContainer) registerContainer.classList.add('hidden');
  if (appContainer) appContainer.classList.remove('hidden');

  updateHeaderUI(user);
  renderDynamicSidebar(user);
  renderNotificationsDropdown();

  // If page was loaded with a deep link / workspace hash, route to it!
  const hash = window.location.hash;
  if (hash && hash !== '#login' && hash !== '#register' && hash !== '#home' && hash !== '#/login') {
    handleUrlHashRouting();
    return;
  }

  // Initial role default section
  const initialRole = user.role || 'PATIENT';
  let defaultSection = 'overview';
  if (initialRole === 'PATIENT') defaultSection = 'timeline';
  else if (initialRole === 'DOCTOR') defaultSection = 'dashboard';

  navigateToRoleSection(initialRole, activeRoleSubtab || defaultSection, null, true);
}
window.showAuthenticatedApp = showAuthenticatedApp;

// --------------------------------------------------------------------------
// Login Role Tabs (Visual Hint only - backend determines authoritative role)
// --------------------------------------------------------------------------
function selectLoginRole(role) {
  const patientTab = document.getElementById('loginRoleTabPatient');
  const doctorTab = document.getElementById('loginRoleTabDoctor');
  const hospitalTab = document.getElementById('loginRoleTabHospital');

  if (patientTab) patientTab.classList.remove('active');
  if (doctorTab) doctorTab.classList.remove('active');
  if (hospitalTab) hospitalTab.classList.remove('active');

  const identifierInput = document.getElementById('loginIdentifier');
  if (role === 'PATIENT') {
    if (patientTab) patientTab.classList.add('active');
    if (identifierInput && !identifierInput.value) identifierInput.placeholder = 'e.g. ramesh@example.com';
  } else if (role === 'DOCTOR') {
    if (doctorTab) doctorTab.classList.add('active');
    if (identifierInput && !identifierInput.value) identifierInput.placeholder = 'e.g. dr.mehta@carepoint.in';
  } else if (role === 'HOSPITAL') {
    if (hospitalTab) hospitalTab.classList.add('active');
    if (identifierInput && !identifierInput.value) identifierInput.placeholder = 'e.g. admin@carepoint.in';
  }
}
window.selectLoginRole = selectLoginRole;
window.selectLoginRoleTab = selectLoginRole;

// --------------------------------------------------------------------------
// Registration Type Switcher (Patient vs Hospital)
// --------------------------------------------------------------------------
function switchRegistrationType(type) {
  const patTab = document.getElementById('regTabPatient');
  const hospTab = document.getElementById('regTabHospital');
  const patForm = document.getElementById('patientRegisterForm');
  const hospForm = document.getElementById('hospitalRegisterForm');
  const successScreen = document.getElementById('registerSuccessScreen');

  if (successScreen) successScreen.classList.add('hidden');
  clearRegisterAlert();

  if (type === 'HOSPITAL') {
    if (patTab) patTab.classList.remove('active');
    if (hospTab) hospTab.classList.add('active');
    if (patForm) patForm.classList.add('hidden');
    if (hospForm) hospForm.classList.remove('hidden');
  } else {
    if (patTab) patTab.classList.add('active');
    if (hospTab) hospTab.classList.remove('active');
    if (patForm) patForm.classList.remove('hidden');
    if (hospForm) hospForm.classList.add('hidden');
  }
}
window.switchRegistrationType = switchRegistrationType;

// --------------------------------------------------------------------------
// Password Strength Meter
// --------------------------------------------------------------------------
window.updatePasswordStrength = function(inputId, barId, labelId) {
  const input = document.getElementById(inputId);
  const bar = document.getElementById(barId);
  const label = document.getElementById(labelId);
  if (!input || !bar) return;

  const pwd = input.value || '';
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  bar.className = 'strength-bar-bg';
  if (score === 1) {
    bar.classList.add('weak');
    if (label) { label.textContent = 'Weak password'; label.style.color = 'var(--danger)'; }
  } else if (score === 2 || score === 3) {
    bar.classList.add('medium');
    if (label) { label.textContent = 'Moderate password'; label.style.color = 'var(--warning)'; }
  } else if (score === 4) {
    bar.classList.add('strong');
    if (label) { label.textContent = 'Strong password'; label.style.color = 'var(--success)'; }
  } else {
    if (label) { label.textContent = 'Password strength'; label.style.color = 'var(--text-dim)'; }
  }
};

function clearLoginAlert() {
  const banner = document.getElementById('loginAlertBanner');
  if (banner) {
    banner.className = 'alert-banner hidden';
    banner.textContent = '';
  }
}

function showLoginAlert(msg, type = 'error') {
  const banner = document.getElementById('loginAlertBanner');
  if (banner) {
    banner.className = `alert-banner ${type}`;
    banner.textContent = msg;
    banner.classList.remove('hidden');
  }
}

function clearRegisterAlert() {
  const banner = document.getElementById('registerAlertBanner');
  if (banner) {
    banner.className = 'alert-banner hidden';
    banner.textContent = '';
  }
}

function showRegisterAlert(msg, type = 'error') {
  const banner = document.getElementById('registerAlertBanner');
  if (banner) {
    banner.className = `alert-banner ${type}`;
    banner.textContent = msg;
    banner.classList.remove('hidden');
  }
}

// --------------------------------------------------------------------------
// Real Authentication Submission Handler
// --------------------------------------------------------------------------
async function handleLoginSubmit(event) {
  event.preventDefault();
  clearLoginAlert();

  const identifier = document.getElementById('loginIdentifier')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;
  const remember = document.getElementById('loginRememberMe')?.checked;

  const btn = document.getElementById('loginSubmitBtn');
  const spinner = document.getElementById('loginBtnSpinner');
  const btnText = document.getElementById('loginBtnText');

  if (!identifier || !password) {
    showLoginAlert('Please enter your email/username and password.', 'error');
    return;
  }

  try {
    if (btn) btn.disabled = true;
    if (spinner) spinner.classList.remove('hidden');
    if (btnText) btnText.textContent = 'Authenticating...';

    const user = await window.hospitrackAuth.login(identifier, password, remember);
    await window.hospitrackStore.syncAllData();
    window.showToast(`Welcome back, ${user.name || user.email}!`, 'success');
    showAuthenticatedApp(user);
  } catch (err) {
    showLoginAlert(err.message || 'Invalid credentials. Please verify and try again.', 'error');
  } finally {
    if (btn) btn.disabled = false;
    if (spinner) spinner.classList.add('hidden');
    if (btnText) btnText.textContent = 'Login';
  }
}
window.handleLoginSubmit = handleLoginSubmit;

// --------------------------------------------------------------------------
// Patient Registration Handler
// --------------------------------------------------------------------------
async function handlePatientRegisterSubmit(event) {
  event.preventDefault();
  clearRegisterAlert();

  const name = document.getElementById('regPatName')?.value.trim();
  const username = document.getElementById('regPatUsername')?.value.trim();
  const email = document.getElementById('regPatEmail')?.value.trim();
  const phone = document.getElementById('regPatPhone')?.value.trim();
  const dob = document.getElementById('regPatDob')?.value.trim();
  const gender = document.getElementById('regPatGender')?.value;
  const bloodGroup = document.getElementById('regPatBloodGroup')?.value;
  const address = document.getElementById('regPatAddress')?.value.trim();
  const emergencyContact = document.getElementById('regPatEmergencyContact')?.value.trim();
  const password = document.getElementById('regPatPassword')?.value;
  const confirmPassword = document.getElementById('regPatConfirmPassword')?.value;
  const submitBtn = document.getElementById('patRegSubmitBtn');

  if (!name || !email || !phone || !password) {
    showRegisterAlert('Please fill in all required patient fields.', 'error');
    return;
  }

  if (password.length < 8) {
    showRegisterAlert('Password must be at least 8 characters.', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showRegisterAlert('Passwords do not match.', 'error');
    return;
  }

  const payload = {
    name,
    username: username || email.split('@')[0],
    email,
    phone,
    dob,
    gender,
    bloodGroup,
    address,
    emergencyContact,
    password
  };

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';
  }

  try {
    const res = await window.hospitrackAuth.registerPatient(payload);
    window.showToast('Account created successfully.', 'success');

    const patForm = document.getElementById('patientRegisterForm');
    const successScreen = document.getElementById('registerSuccessScreen');
    const successTitle = document.getElementById('regSuccessTitle');
    const successDesc = document.getElementById('regSuccessDesc');

    if (patForm) patForm.classList.add('hidden');
    if (successTitle) successTitle.textContent = 'Account created successfully.';
    if (successDesc) successDesc.textContent = 'Your patient profile is active. You can log in immediately.';
    if (successScreen) successScreen.classList.remove('hidden');

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Patient Account';
    }
  } catch (err) {
    showRegisterAlert(err.message || 'Patient registration failed.', 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Patient Account';
    }
  }
}
window.handlePatientRegisterSubmit = handlePatientRegisterSubmit;

// --------------------------------------------------------------------------
// Hospital Registration Handler
// --------------------------------------------------------------------------
async function handleHospitalRegisterSubmit(event) {
  event.preventDefault();
  clearRegisterAlert();

  const hospitalName = document.getElementById('regHospName')?.value.trim();
  const registrationNumber = document.getElementById('regHospNumber')?.value.trim();
  const email = document.getElementById('regHospEmail')?.value.trim();
  const phone = document.getElementById('regHospPhone')?.value.trim();
  const hospitalType = document.getElementById('regHospType')?.value;
  const totalBeds = parseInt(document.getElementById('regHospBeds')?.value || '100', 10);
  const address = document.getElementById('regHospAddress')?.value.trim();
  const city = document.getElementById('regHospCity')?.value.trim();
  const state = document.getElementById('regHospState')?.value.trim();
  const pincode = document.getElementById('regHospPincode')?.value.trim();
  const password = document.getElementById('regHospPassword')?.value;
  const confirmPassword = document.getElementById('regHospConfirmPassword')?.value;
  const submitBtn = document.getElementById('hospRegSubmitBtn');

  if (!hospitalName || !registrationNumber || !email || !phone || !password) {
    showRegisterAlert('Please fill in all required hospital facility fields.', 'error');
    return;
  }

  if (password.length < 8) {
    showRegisterAlert('Password must be at least 8 characters.', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showRegisterAlert('Passwords do not match.', 'error');
    return;
  }

  const payload = {
    hospitalName,
    registrationNumber,
    email,
    phone,
    hospitalType,
    totalBeds,
    address,
    city,
    state,
    pincode,
    password
  };

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting Registration...';
  }

  try {
    const res = await window.hospitrackAuth.registerHospital(payload);
    window.showToast('Hospital registration submitted.', 'info');

    const hospForm = document.getElementById('hospitalRegisterForm');
    const successScreen = document.getElementById('registerSuccessScreen');
    const successTitle = document.getElementById('regSuccessTitle');
    const successDesc = document.getElementById('regSuccessDesc');

    if (hospForm) hospForm.classList.add('hidden');
    if (successTitle) successTitle.textContent = 'Hospital registration submitted.';
    if (successDesc) successDesc.textContent = 'Your hospital is awaiting administrator approval. You will be able to log in once an administrator approves your facility.';
    if (successScreen) successScreen.classList.remove('hidden');

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Hospital Registration';
    }
  } catch (err) {
    showRegisterAlert(err.message || 'Hospital registration failed.', 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Hospital Registration';
    }
  }
}
window.handleHospitalRegisterSubmit = handleHospitalRegisterSubmit;

// --------------------------------------------------------------------------
// Public Hospital Directory Modal Subsystem
// --------------------------------------------------------------------------
async function openPublicHospitalDiscoveryModal() {
  const modal = document.getElementById('publicHospitalDiscoveryModal');
  if (modal) modal.classList.add('open');

  try {
    await window.hospitrackStore.syncHospitals();
  } catch (e) {
    // Fallback to store cache
  }
  renderPublicHospitalList('');
}
window.openPublicHospitalDiscoveryModal = openPublicHospitalDiscoveryModal;

function renderPublicHospitalList(query = '') {
  const container = document.getElementById('publicHospListContainer');
  if (!container) return;

  const hospitals = window.hospitrackStore.getHospitals();
  const q = query.toLowerCase().trim();

  const filtered = hospitals.filter(h => {
    return h.name.toLowerCase().includes(q) ||
      h.location.toLowerCase().includes(q) ||
      h.code.toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 2rem;">No accredited hospitals matching '${query}'.</div>`;
    return;
  }

  container.innerHTML = filtered.map(h => `
    <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: var(--radius-md); padding: 18px; display: flex; justify-content: space-between; align-items: center; gap: 14px; margin-bottom: 12px;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <strong style="font-size: 1.05rem; color: #fff;">${h.name}</strong>
          <span style="font-size: 0.72rem; padding: 2px 8px; background: rgba(37, 99, 235, 0.15); color: #60a5fa; border-radius: 4px; font-weight: 700;">${h.code}</span>
        </div>
        <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">📍 ${h.location} • 📞 ${h.contact}</p>
        <div style="display: flex; gap: 12px; margin-top: 8px; font-size: 0.78rem;">
          <span style="color: var(--success); font-weight: 600;">🛏️ ${h.availableBeds} / ${h.totalBeds} Beds Available</span>
          <span style="color: var(--patient-color); font-weight: 600;">⭐ ${(h.rating || 5.0).toFixed(1)} / 5.0 (${h.reviewCount || 0} reviews)</span>
        </div>
      </div>
      <div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal('publicHospitalDiscoveryModal'); navigateToLogin('PATIENT');">
          Book Care
        </button>
      </div>
    </div>
  `).join('');
}
window.renderPublicHospitalList = renderPublicHospitalList;

// --------------------------------------------------------------------------
// Email Verification & Password Reset Modals
// --------------------------------------------------------------------------
function openVerifyEmailModal(token = '') {
  const modal = document.getElementById('verifyEmailModal');
  const input = document.getElementById('verifyTokenInput');
  if (input && token) input.value = token;
  if (modal) modal.classList.add('open');
}
window.openVerifyEmailModal = openVerifyEmailModal;

async function handleVerifyEmailSubmit(event) {
  event.preventDefault();
  const token = document.getElementById('verifyTokenInput')?.value.trim();
  const alertEl = document.getElementById('verifyEmailAlert');

  if (!token) {
    showModalAlert(alertEl, 'Please enter your verification token.', 'error');
    return;
  }

  try {
    const res = await window.hospitrackAuth.verifyEmail(token);
    window.showToast(res.message || 'Email verified successfully! You can now log in.', 'success');
    closeModal('verifyEmailModal');
    showLoginView();
  } catch (err) {
    showModalAlert(alertEl, err.message || 'Email verification failed.', 'error');
  }
}
window.handleVerifyEmailSubmit = handleVerifyEmailSubmit;

function openForgotPasswordModal() {
  const modal = document.getElementById('forgotPasswordModal');
  if (modal) modal.classList.add('open');
}
window.openForgotPasswordModal = openForgotPasswordModal;

async function handleForgotPasswordSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('forgotEmail')?.value.trim();
  const alertEl = document.getElementById('forgotPasswordAlert');

  if (!email) {
    showModalAlert(alertEl, 'Please enter your email.', 'error');
    return;
  }

  try {
    const res = await window.hospitrackAuth.forgotPassword(email);
    window.showToast(res.message || 'If an account exists, a reset link has been dispatched.', 'info');
    closeModal('forgotPasswordModal');
  } catch (err) {
    showModalAlert(alertEl, err.message || 'Password reset request failed.', 'error');
  }
}
window.handleForgotPasswordSubmit = handleForgotPasswordSubmit;

function openResetPasswordModal(token = '') {
  const modal = document.getElementById('resetPasswordModal');
  const input = document.getElementById('resetTokenInput');
  if (input && token) input.value = token;
  if (modal) modal.classList.add('open');
}
window.openResetPasswordModal = openResetPasswordModal;

async function handleResetPasswordSubmit(event) {
  event.preventDefault();
  const token = document.getElementById('resetTokenInput')?.value.trim();
  const newPassword = document.getElementById('newPasswordInput')?.value;
  const confirmPassword = document.getElementById('confirmPasswordInput')?.value;
  const alertEl = document.getElementById('resetPasswordAlert');

  if (!token || !newPassword) {
    showModalAlert(alertEl, 'Please enter all required fields.', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    showModalAlert(alertEl, 'Passwords do not match.', 'error');
    return;
  }

  try {
    const res = await window.hospitrackAuth.resetPassword(token, newPassword);
    window.showToast(res.message || 'Password reset successfully! Please sign in.', 'success');
    closeModal('resetPasswordModal');
    window.location.hash = '';
    showLoginView();
  } catch (err) {
    showModalAlert(alertEl, err.message || 'Password reset failed.', 'error');
  }
}
window.handleResetPasswordSubmit = handleResetPasswordSubmit;

function showModalAlert(element, message, type = 'error') {
  if (!element) return;
  element.className = `alert-banner ${type}`;
  element.textContent = message;
  element.classList.remove('hidden');
}

// --------------------------------------------------------------------------
// UI Interactivity Helpers: Password Visibility & Mobile Sidebar
// --------------------------------------------------------------------------
function togglePasswordVisibility(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (!input) return;

  if (input.type === 'password') {
    input.type = 'text';
    if (btn) btn.textContent = '🔒';
  } else {
    input.type = 'password';
    if (btn) btn.textContent = '👁️';
  }
}
window.togglePasswordVisibility = togglePasswordVisibility;

function toggleMobileSidebar() {
  const sidebar = document.getElementById('appSidebar');
  const overlay = document.getElementById('mobileNavOverlay');
  if (sidebar) {
    sidebar.classList.toggle('mobile-open');
  }
  if (overlay) {
    overlay.classList.toggle('mobile-open');
  }
}
window.toggleMobileSidebar = toggleMobileSidebar;

function closeMobileSidebar() {
  const sidebar = document.getElementById('appSidebar');
  const overlay = document.getElementById('mobileNavOverlay');
  if (sidebar) {
    sidebar.classList.remove('mobile-open');
  }
  if (overlay) {
    overlay.classList.remove('mobile-open');
  }
}
window.closeMobileSidebar = closeMobileSidebar;

// --------------------------------------------------------------------------
// User Profile Modal (View, Interactive Edit Mode & Profile Photo Uploader)
// --------------------------------------------------------------------------
let pendingPhotoDataUrl = null;

function openUserProfileModal(isEditMode = false) {
  const modal = document.getElementById('userProfileModal');
  const container = document.getElementById('userProfileModalContent');
  const modalTitle = document.getElementById('userProfileModalTitle');
  if (!modal || !container) return;

  const authUser = window.hospitrackAuth.getCurrentUser();
  if (!authUser) return;

  const roleName = authUser.role || 'GUEST';
  const hospitalDisplay = authUser.hospitalName || authUser.hospitalId || 'Central Healthcare Network';
  pendingPhotoDataUrl = null;

  if (modalTitle) {
    modalTitle.textContent = isEditMode ? 'Edit Account Profile' : 'Account Details';
  }

  if (isEditMode) {
    container.innerHTML = `
      <form id="userProfileEditForm" onsubmit="handleSaveUserProfile(event)" style="padding: 0.5rem 0;">
        <div id="userProfileModalAlert" class="alert-banner hidden mb-16"></div>

        <!-- Reusable Profile Photo Uploader -->
        <div class="profile-photo-uploader">
          <div class="photo-preview-wrap" id="modalPhotoPreviewContainer">
            ${renderAvatar(authUser, 'avatar-lg')}
          </div>
          <div class="photo-upload-controls">
            <label class="form-label" style="margin-bottom: 4px;">Profile Photo</label>
            <p>Upload a clear portrait. Formats: JPG, PNG, WEBP (Max 2MB).</p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              <label class="btn btn-secondary btn-sm" style="cursor: pointer; margin: 0;">
                <span>📷 Browse Image</span>
                <input type="file" id="modalProfileFileInput" accept="image/jpeg,image/png,image/webp" style="display: none;" onchange="handleModalPhotoSelect(event)">
              </label>
              ${authUser.avatarUrl ? `
                <button type="button" class="btn btn-secondary btn-sm" style="color: var(--danger);" onclick="handleModalPhotoRemove()">
                  Remove
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="form-group mb-16">
          <label class="form-label" for="userEditName">Full Name <span style="color: var(--danger);">*</span></label>
          <input type="text" id="userEditName" class="form-control" value="${escapeHtml(authUser.name || '')}" required minlength="2">
        </div>

        <div class="form-group mb-16">
          <label class="form-label" for="userEditEmail">Email Address <span style="color: var(--danger);">*</span></label>
          <input type="email" id="userEditEmail" class="form-control" value="${escapeHtml(authUser.email || '')}" required>
        </div>

        <div class="form-group mb-16">
          <label class="form-label" for="userEditPhone">Contact Phone</label>
          <input type="tel" id="userEditPhone" class="form-control" value="${escapeHtml(authUser.phone || authUser.contact || '')}" placeholder="+91 98765 43210">
        </div>

        <div style="background: var(--bg-surface-alt); padding: 12px 14px; border-radius: var(--radius-md); margin-bottom: 16px; border: 1px solid var(--border-color);">
          <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Role &amp; Facility</div>
          <div style="font-size: 0.88rem; color: var(--text-main); margin-top: 4px;">
            Role: <span class="badge badge-info">${roleName}</span> &bull; Facility: <strong>${escapeHtml(hospitalDisplay)}</strong>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="openUserProfileModal(false)">Cancel</button>
          <button type="submit" id="saveUserProfileBtn" class="btn btn-primary">Save Profile</button>
        </div>
      </form>
    `;
  } else {
    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: var(--bg-surface-alt); border-radius: var(--radius-card); margin-bottom: 20px;">
        ${renderAvatar(authUser, 'avatar-lg')}
        <div>
          <h3 style="font-size: 1.15rem; color: var(--text-main);">${escapeHtml(authUser.name || 'User')}</h3>
          <p style="font-size: 0.84rem; color: var(--text-secondary);">${escapeHtml(authUser.email || 'user@hospitrack.com')}</p>
          <div style="margin-top: 6px; display: flex; gap: 6px;">
            <span class="badge badge-info">${roleName}</span>
            <span class="badge badge-active">${authUser.status || 'ACTIVE'}</span>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
        <div style="padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">ASSIGNED FACILITY</div>
          <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin-top: 2px;">${escapeHtml(hospitalDisplay)}</div>
        </div>
        <div style="padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">CONTACT PHONE</div>
          <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin-top: 2px;">${escapeHtml(authUser.phone || 'N/A')}</div>
        </div>
        <div style="padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">MEMBER ID</div>
          <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin-top: 2px; font-family: monospace;">${escapeHtml(authUser.id || authUser.patientId || authUser.doctorId || 'N/A')}</div>
        </div>
        <div style="padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">ACCOUNT STATUS</div>
          <div style="font-size: 0.88rem; font-weight: 700; color: var(--success); margin-top: 2px;">✓ Verified Account</div>
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal('userProfileModal')">Close</button>
        <button type="button" class="btn btn-primary" onclick="openUserProfileModal(true)">Edit Profile</button>
      </div>
    `;
  }

  modal.classList.add('open');
}
window.openUserProfileModal = openUserProfileModal;

function handleModalPhotoSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    window.showToast('Please select a JPG, PNG, or WEBP image file.', 'warning');
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    window.showToast('Profile photo must be smaller than 2MB.', 'warning');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    pendingPhotoDataUrl = e.target.result;
    const previewContainer = document.getElementById('modalPhotoPreviewContainer');
    if (previewContainer) {
      previewContainer.innerHTML = `<div class="avatar avatar-lg"><img src="${pendingPhotoDataUrl}" alt="Preview"></div>`;
    }
  };
  reader.readAsDataURL(file);
}
window.handleModalPhotoSelect = handleModalPhotoSelect;

async function handleModalPhotoRemove() {
  const alertEl = document.getElementById('userProfileModalAlert');
  try {
    await window.hospitrackAuth.removeProfilePhoto();
    pendingPhotoDataUrl = null;
    const authUser = window.hospitrackAuth.getCurrentUser();
    if (window.updateHeaderUI) window.updateHeaderUI(authUser);
    window.showToast('Profile photo removed.', 'info');
    openUserProfileModal(true);
  } catch (err) {
    showModalAlert(alertEl, err.message || 'Failed to remove photo.', 'error');
  }
}
window.handleModalPhotoRemove = handleModalPhotoRemove;

async function handleSaveUserProfile(event) {
  event.preventDefault();
  const alertEl = document.getElementById('userProfileModalAlert');
  const submitBtn = document.getElementById('saveUserProfileBtn');

  const newName = document.getElementById('userEditName')?.value.trim();
  const newEmail = document.getElementById('userEditEmail')?.value.trim();
  const newPhone = document.getElementById('userEditPhone')?.value.trim();

  if (!newName || newName.length < 2) {
    showModalAlert(alertEl, 'Please enter a valid full name (at least 2 characters).', 'error');
    return;
  }
  if (!newEmail || !newEmail.includes('@')) {
    showModalAlert(alertEl, 'Please enter a valid email address.', 'error');
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    // 1. Upload photo if selected
    if (pendingPhotoDataUrl) {
      await window.hospitrackAuth.uploadProfilePhoto(pendingPhotoDataUrl);
      pendingPhotoDataUrl = null;
    }

    // 2. Update profile fields
    const updatedUser = await window.hospitrackAuth.updateProfile({
      name: newName,
      email: newEmail,
      phone: newPhone
    });

    if (window.updateHeaderUI) {
      window.updateHeaderUI(updatedUser);
    }
    await window.hospitrackStore.syncAllData();

    window.showToast('Profile updated successfully.', 'success');
    closeModal('userProfileModal');
    if (window.renderCurrentView) {
      window.renderCurrentView();
    }
  } catch (err) {
    showModalAlert(alertEl, err.message || 'Failed to update profile.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Profile';
    }
  }
}
window.handleSaveUserProfile = handleSaveUserProfile;

// --------------------------------------------------------------------------
// Static Modal Fallback Event Handlers
// --------------------------------------------------------------------------
async function handleAddDoctorSubmit(event) {
  event.preventDefault();
  const user = window.hospitrackAuth.getCurrentUser();
  const hospitalId = user?.hospitalId || 'HOSP-101';
  const name = document.getElementById('addDocName')?.value.trim();
  const email = document.getElementById('addDocEmail')?.value.trim();
  const licenseNo = document.getElementById('addDocLicense')?.value.trim();
  const specialty = document.getElementById('addDocSpecialty')?.value.trim();
  const contact = document.getElementById('addDocPhone')?.value.trim();
  const password = document.getElementById('addDocPassword')?.value;
  const alertEl = document.getElementById('addDocAlert');

  try {
    await window.hospitrackStore.createDoctor({
      hospitalId,
      name,
      email,
      licenseNo,
      specialty,
      contact,
      password: password || 'Doctor@123!'
    });
    window.showToast(`Doctor ${name} successfully added.`, 'success');
    closeModal('addDoctorModal');
    if (window.renderHospitalDashboard) {
      window.renderHospitalDashboard(document.getElementById('mainContentArea'));
    }
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to add doctor.';
      alertEl.classList.remove('hidden');
    }
  }
}
window.handleAddDoctorSubmit = handleAddDoctorSubmit;

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
}
window.closeModal = closeModal;

// --------------------------------------------------------------------------
// Helper functions for user avatars and role themes
function getUserInitials(name) {
  if (!name || typeof name !== 'string') return 'U';
  const clean = name.replace(/^(Dr\.|Dr|Mr\.|Mr|Ms\.|Ms|Mrs\.|Mrs)\s+/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getRoleColorHex(role) {
  switch ((role || '').toUpperCase()) {
    case 'SUPER_ADMIN': return '#7C3AED';
    case 'HOSPITAL_ADMIN':
    case 'HOSPITAL': return '#2563EB';
    case 'DOCTOR': return '#0D9488';
    case 'PATIENT': return '#0284C7';
    default: return '#0D9488';
  }
}

function getRoleGradient(role) {
  switch ((role || '').toUpperCase()) {
    case 'SUPER_ADMIN': return 'linear-gradient(135deg, #7C3AED, #5B21B6)';
    case 'HOSPITAL_ADMIN':
    case 'HOSPITAL': return 'linear-gradient(135deg, #2563EB, #1D4ED8)';
    case 'DOCTOR': return 'linear-gradient(135deg, #0D9488, #0F766E)';
    case 'PATIENT': return 'linear-gradient(135deg, #0284C7, #0369A1)';
    default: return 'linear-gradient(135deg, #0D9488, #0F766E)';
  }
}

function renderAvatar(user, sizeClass = 'avatar-sm', extraClass = '') {
  const name = (user && user.name) || 'User';
  const avatarUrl = user && user.avatarUrl;
  const role = (user && user.role) || 'PATIENT';
  const roleGrad = getRoleGradient(role);

  if (avatarUrl) {
    return `<div class="avatar ${sizeClass} ${extraClass}" title="${escapeHtml(name)}"><img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}"></div>`;
  }
  const initials = getUserInitials(name);
  return `<div class="avatar ${sizeClass} ${extraClass}" style="background: ${roleGrad};" title="${escapeHtml(name)}">${initials}</div>`;
}
window.renderAvatar = renderAvatar;

// Adaptive Role Header & Navigation
// --------------------------------------------------------------------------
function updateHeaderUI(user) {
  const authHeaderAvatar = document.getElementById('authHeaderAvatar');
  const authHeaderName = document.getElementById('authHeaderName');
  const authHeaderRole = document.getElementById('authHeaderRole');

  const profileDropdownAvatar = document.getElementById('profileDropdownAvatar');
  const profileDropdownName = document.getElementById('profileDropdownName');
  const profileDropdownEmail = document.getElementById('profileDropdownEmail');
  const profileDropdownRoleBadge = document.getElementById('profileDropdownRoleBadge');

  if (!user) return;

  const initials = getUserInitials(user.name || 'User');
  const roleName = user.role || 'PATIENT';
  const roleColor = getRoleColorHex(roleName);
  const roleGrad = getRoleGradient(roleName);

  if (authHeaderAvatar) {
    if (user.avatarUrl) {
      authHeaderAvatar.innerHTML = `<img src="${escapeHtml(user.avatarUrl)}" alt="${escapeHtml(user.name || 'User')}">`;
      authHeaderAvatar.style.background = 'transparent';
    } else {
      authHeaderAvatar.textContent = initials;
      authHeaderAvatar.style.background = roleGrad;
    }
  }
  if (authHeaderName) {
    authHeaderName.textContent = user.name || 'User';
  }
  if (authHeaderRole) {
    authHeaderRole.textContent = roleName;
    authHeaderRole.style.color = roleColor;
  }

  if (profileDropdownAvatar) {
    if (user.avatarUrl) {
      profileDropdownAvatar.innerHTML = `<img src="${escapeHtml(user.avatarUrl)}" alt="${escapeHtml(user.name || 'User')}">`;
      profileDropdownAvatar.style.background = 'transparent';
    } else {
      profileDropdownAvatar.textContent = initials;
      profileDropdownAvatar.style.background = roleGrad;
    }
  }
  if (profileDropdownName) {
    profileDropdownName.textContent = user.name || 'Healthcare User';
  }
  if (profileDropdownEmail) {
    profileDropdownEmail.textContent = user.email || 'user@hospitrack.com';
  }
  if (profileDropdownRoleBadge) {
    profileDropdownRoleBadge.textContent = roleName;
    profileDropdownRoleBadge.style.background = `${roleColor}22`;
    profileDropdownRoleBadge.style.color = roleColor;
  }
}

window.toggleProfileDropdown = function() {
  const menu = document.getElementById('profileDropdownMenu');
  const btn = document.getElementById('profileDropdownBtn');
  if (!menu) return;

  const isOpen = menu.classList.contains('open');
  if (isOpen) {
    closeProfileDropdown();
  } else {
    closeNotifDropdown();
    closeGlobalSearch();
    menu.classList.add('open');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }
};

window.closeProfileDropdown = function() {
  const menu = document.getElementById('profileDropdownMenu');
  const btn = document.getElementById('profileDropdownBtn');
  if (menu) menu.classList.remove('open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
};

window.handleProfileMenuClick = function(action) {
  closeProfileDropdown();
  const user = window.hospitrackAuth.getCurrentUser();
  if (!user) return;

  if (action === 'view') {
    if (user.role === 'PATIENT') {
      navigateToRoleSection('PATIENT', 'profile', { editMode: false });
    } else if (user.role === 'HOSPITAL_ADMIN' || user.role === 'HOSPITAL') {
      navigateToRoleSection('HOSPITAL_ADMIN', 'profile', { editMode: false });
    } else if (user.role === 'DOCTOR') {
      navigateToRoleSection('DOCTOR', 'profile', { editMode: false });
    } else if (user.role === 'SUPER_ADMIN') {
      navigateToRoleSection('SUPER_ADMIN', 'profile', { editMode: false });
    }
  } else if (action === 'edit') {
    if (user.role === 'PATIENT') {
      navigateToRoleSection('PATIENT', 'profile', { editMode: true });
    } else if (user.role === 'HOSPITAL_ADMIN' || user.role === 'HOSPITAL') {
      navigateToRoleSection('HOSPITAL_ADMIN', 'profile', { editMode: true });
    } else if (user.role === 'DOCTOR') {
      navigateToRoleSection('DOCTOR', 'profile', { editMode: true });
    } else if (user.role === 'SUPER_ADMIN') {
      navigateToRoleSection('SUPER_ADMIN', 'profile', { editMode: true });
    }
  } else if (action === 'settings') {
    if (window.openAccountSettingsModal) {
      window.openAccountSettingsModal();
    } else {
      openUserProfileModal(true);
    }
  } else if (action === 'logout') {
    handleLogoutAction();
  }
};

window.handleLogoutAction = function() {
  closeProfileDropdown();
  closeNotifDropdown();
  const modal = document.getElementById('confirmLogoutModal');
  if (modal) {
    modal.classList.add('open');
  } else {
    if (window.confirm('Are you sure you want to log out?')) {
      executeLogoutAction();
    }
  }
};

window.executeLogoutAction = async function() {
  const modal = document.getElementById('confirmLogoutModal');
  if (modal) modal.classList.remove('open');

  try {
    await window.hospitrackAuth.logout();
  } catch (e) {
    window.hospitrackAuth.clearSession();
  }

  if (window.hospitrackStore && typeof window.hospitrackStore.clearAll === 'function') {
    window.hospitrackStore.clearAll();
  }

  showLoginView();
  window.showToast('You have been signed out successfully.', 'info');
  window.history.replaceState(null, '', '#login');
};

function updateBreadcrumbs(user, tab, subtab) {
  const roleEl = document.getElementById('headerBreadcrumbRole');
  const titleEl = document.getElementById('headerBreadcrumbTitle');
  if (!roleEl || !titleEl || !user) return;

  const role = user.role;
  let roleLabel = 'Workspace';
  let titleLabel = 'Dashboard';

  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    roleLabel = 'Admin Command';
    if (subtab === 'audit' || tab === 'audit') titleLabel = 'Audit Ledger';
    else if (subtab === 'hospitals') titleLabel = 'Hospitals';
    else if (subtab === 'doctors') titleLabel = 'Doctors';
    else if (subtab === 'patients') titleLabel = 'Patients';
    else if (subtab === 'referrals') titleLabel = 'Referrals';
    else if (subtab === 'transfers') titleLabel = 'Transfers';
    else if (subtab === 'onboarding') titleLabel = 'Hospital Onboarding';
    else if (subtab === 'reviews') titleLabel = 'Review Center';
    else if (subtab === 'profile') titleLabel = 'Admin Profile';
    else titleLabel = 'System Overview';
  } else if (role === 'HOSPITAL_ADMIN' || role === 'HOSPITAL') {
    roleLabel = 'Hospital Operations';
    if (subtab === 'facility' || subtab === 'profile') titleLabel = 'Facility Profile';
    else if (subtab === 'departments') titleLabel = 'Departments';
    else if (subtab === 'bed-management' || subtab === 'capacity') titleLabel = 'Bed Management';
    else if (subtab === 'doctors' || subtab === 'staff') titleLabel = 'Medical Staff';
    else if (subtab === 'patients') titleLabel = 'Inpatient Patients';
    else if (subtab === 'consultations') titleLabel = 'Consultations';
    else if (subtab === 'referrals') titleLabel = 'Referrals';
    else if (subtab === 'transfers') titleLabel = 'Emergency Transfers';
    else if (subtab === 'lab-reports' || subtab === 'labs') titleLabel = 'Lab Reports';
    else if (subtab === 'prescriptions') titleLabel = 'Prescriptions';
    else titleLabel = 'Operations Overview';
  } else if (role === 'DOCTOR') {
    roleLabel = 'Doctor Workstation';
    if (subtab === 'patients') titleLabel = 'Patients';
    else if (subtab === 'consultations') titleLabel = 'Consultations';
    else if (subtab === 'prescriptions') titleLabel = 'Prescriptions';
    else if (subtab === 'laboratory' || subtab === 'labs') titleLabel = 'Laboratory';
    else if (subtab === 'referrals') titleLabel = 'Referrals';
    else if (subtab === 'profile') titleLabel = 'Doctor Profile';
    else titleLabel = 'Dashboard';
  } else if (role === 'PATIENT') {
    roleLabel = 'Patient Health';
    if (subtab === 'consultations' || subtab === 'visits') titleLabel = 'Consultations';
    else if (subtab === 'prescriptions') titleLabel = 'Prescriptions';
    else if (subtab === 'lab-reports' || subtab === 'reports' || subtab === 'labs') titleLabel = 'Lab Reports';
    else if (subtab === 'referrals') titleLabel = 'Referrals';
    else if (subtab === 'medical-summary' || subtab === 'summary') titleLabel = 'Medical Summary';
    else if (subtab === 'feedback' || subtab === 'reviews') titleLabel = 'Hospital Feedback';
    else if (subtab === 'profile') titleLabel = 'Patient Profile';
    else titleLabel = 'Care Timeline';
  }

  roleEl.textContent = roleLabel;
  titleEl.textContent = titleLabel;
}

function getRoleColorHex(role) {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return 'var(--admin-color)';
  if (role === 'HOSPITAL' || role === 'HOSPITAL_ADMIN') return 'var(--hospital-color)';
  if (role === 'DOCTOR') return 'var(--doctor-color)';
  if (role === 'PATIENT') return 'var(--patient-color)';
  return 'var(--primary)';
}

function getRoleGradient(role) {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return 'linear-gradient(135deg, #a855f7, #7e22ce)';
  if (role === 'HOSPITAL' || role === 'HOSPITAL_ADMIN') return 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
  if (role === 'DOCTOR') return 'linear-gradient(135deg, #10b981, #047857)';
  if (role === 'PATIENT') return 'linear-gradient(135deg, #0284c7, #0369a1)';
  return 'linear-gradient(135deg, #0ea5e9, #0284c7)';
}

function navigateToDefaultOverview() {
  const user = window.hospitrackAuth.getCurrentUser();
  if (!user) return;
  const role = user.role;
  let section = 'overview';
  if (role === 'PATIENT') section = 'timeline';
  else if (role === 'DOCTOR') section = 'dashboard';

  navigateToRoleSection(role, section);
}
window.navigateToDefaultOverview = navigateToDefaultOverview;

// --------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH ROUTER
// --------------------------------------------------------------------------
window.navigateToRoleSection = function(role, section, params = {}, updateUrl = true) {
  const auth = window.hospitrackAuth;
  const user = auth ? auth.getCurrentUser() : null;
  if (!user) {
    showLoginView();
    return;
  }

  // Close mobile sidebar drawer upon navigation
  closeMobileSidebar();
  closeProfileDropdown();
  closeNotifDropdown();
  closeGlobalSearch();

  // Normalize section aliases
  let sec = (section || 'overview').toLowerCase();
  if (sec === 'visits') sec = 'consultations';
  if (sec === 'reports' || sec === 'labs') sec = 'lab-reports';
  if (sec === 'summary') sec = 'medical-summary';
  if (sec === 'reviews' && role === 'PATIENT') sec = 'feedback';
  if (sec === 'capacity') sec = 'bed-management';
  if (sec === 'queue') sec = 'dashboard';

  activeRole = role || user.role;
  activeRoleSubtab = sec;
  activeTab = (sec === 'audit') ? 'audit' : 'dashboard';

  // Synchronize URL Hash if required
  if (updateUrl !== false) {
    let rolePrefix = 'patient';
    if (activeRole === 'DOCTOR') rolePrefix = 'doctor';
    else if (activeRole === 'HOSPITAL_ADMIN' || activeRole === 'HOSPITAL') rolePrefix = 'hospital';
    else if (activeRole === 'SUPER_ADMIN' || activeRole === 'ADMIN') rolePrefix = 'admin';

    const targetHash = `#${rolePrefix}/${sec}`;
    if (window.location.hash !== targetHash) {
      window.history.pushState(null, '', targetHash);
    }
  }

  // Synchronize dynamic sidebar active item
  renderDynamicSidebar(user);

  // Synchronize Breadcrumbs
  updateBreadcrumbs(user, activeTab, activeRoleSubtab);

  // Clean and Replace Main Content
  const container = document.getElementById('mainContentArea');
  if (!container) return;
  container.innerHTML = '';

  const editMode = params?.editMode || false;

  // Render Component View
  if (sec === 'audit') {
    if (window.renderAuditLogger) {
      window.renderAuditLogger(container);
    }
  } else if (sec === 'departments') {
    if (window.renderDepartmentWorkspace) {
      window.renderDepartmentWorkspace(container);
    }
  } else if (activeRole === 'SUPER_ADMIN' || activeRole === 'ADMIN') {
    if (window.renderAdminDashboard) {
      window.renderAdminDashboard(container, sec);
    }
  } else if (activeRole === 'HOSPITAL_ADMIN' || activeRole === 'HOSPITAL') {
    if (window.renderHospitalDashboard) {
      window.renderHospitalDashboard(container, sec, editMode);
    }
  } else if (activeRole === 'DOCTOR') {
    if (window.renderDoctorDashboard) {
      window.renderDoctorDashboard(container, sec);
    }
  } else if (activeRole === 'PATIENT') {
    if (window.renderPatientDashboard) {
      window.renderPatientDashboard(container, sec, editMode);
    }
  }
};

// Backward-compatibility navigation helpers all delegate to the single central router
window.navigateToAdminSection = function(section) {
  window.navigateToRoleSection('SUPER_ADMIN', section);
};
window.navigateToHospitalTab = function(tab, editMode = false) {
  window.navigateToRoleSection('HOSPITAL_ADMIN', tab, { editMode });
};
window.navigateToDoctorTab = function(tab) {
  window.navigateToRoleSection('DOCTOR', tab);
};
window.navigateToPatientTab = function(tab, editMode = false) {
  window.navigateToRoleSection('PATIENT', tab, { editMode });
};

// --------------------------------------------------------------------------
// Adaptive Role-Based Sidebar Navigation
// --------------------------------------------------------------------------
function renderDynamicSidebar(user) {
  const sidebar = document.getElementById('appSidebar');
  if (!sidebar || !user) return;

  const store = window.hospitrackStore;
  const role = user.role;
  const hospitalId = user.hospitalId || 'HOSP-101';
  const sec = activeRoleSubtab || 'overview';

  let navItemsHtml = '';

  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    const hospitals = store.getHospitals();
    const doctors = store.getDoctors();
    const patients = store.getPatients();
    const referrals = store.getReferrals();
    const transfers = store.getTransfers();

    navItemsHtml = `
      <div class="sidebar-heading" style="color: var(--primary); display: flex; align-items: center; justify-content: space-between;">
        <span style="display: flex; align-items: center; gap: 6px;"><span>🛡️</span> Command Center</span>
        <button type="button" class="sidebar-collapse-btn" onclick="toggleSidebarCollapse()" title="Toggle sidebar width">◀</button>
      </div>

      <div class="sidebar-category-label">OVERVIEW</div>
      <div class="nav-item ${sec === 'overview' ? 'active' : ''}" onclick="navigateToRoleSection('SUPER_ADMIN', 'overview')">
        <div class="nav-item-left">
          <span class="nav-icon">📊</span>
          <span class="nav-label">Command Center</span>
        </div>
      </div>
      <div class="nav-item ${sec === 'hospitals' ? 'active' : ''}" onclick="navigateToRoleSection('SUPER_ADMIN', 'hospitals')">
        <div class="nav-item-left">
          <span class="nav-icon">🏥</span>
          <span class="nav-label">Hospitals</span>
        </div>
        <span class="nav-badge">${hospitals.length}</span>
      </div>
      <div class="nav-item ${sec === 'doctors' ? 'active' : ''}" onclick="navigateToRoleSection('SUPER_ADMIN', 'doctors')">
        <div class="nav-item-left">
          <span class="nav-icon">🩺</span>
          <span class="nav-label">Doctors</span>
        </div>
        <span class="nav-badge">${doctors.length}</span>
      </div>
      <div class="nav-item ${sec === 'patients' ? 'active' : ''}" onclick="navigateToRoleSection('SUPER_ADMIN', 'patients')">
        <div class="nav-item-left">
          <span class="nav-icon">👤</span>
          <span class="nav-label">Patients</span>
        </div>
        <span class="nav-badge">${patients.length}</span>
      </div>

      <div class="sidebar-category-label mt-16">OPERATIONS</div>
      <div class="nav-item ${sec === 'referrals' ? 'active' : ''}" onclick="navigateToRoleSection('SUPER_ADMIN', 'referrals')">
        <div class="nav-item-left">
          <span class="nav-icon">🔁</span>
          <span class="nav-label">Referrals</span>
        </div>
        <span class="nav-badge">${referrals.length}</span>
      </div>
      <div class="nav-item ${sec === 'transfers' ? 'active' : ''}" onclick="navigateToRoleSection('SUPER_ADMIN', 'transfers')">
        <div class="nav-item-left">
          <span class="nav-icon">🚑</span>
          <span class="nav-label">Emergency Transfers</span>
        </div>
        <span class="nav-badge">${transfers.length}</span>
      </div>
      <div class="nav-item ${sec === 'beds' || sec === 'bed-network' ? 'active' : ''}" onclick="navigateToRoleSection('SUPER_ADMIN', 'beds')">
        <div class="nav-item-left">
          <span class="nav-icon">🛏️</span>
          <span class="nav-label">Bed Network</span>
        </div>
      </div>

      <div class="sidebar-category-label mt-16">QUALITY</div>
      <div class="nav-item ${sec === 'reviews' ? 'active' : ''}" onclick="navigateToRoleSection('SUPER_ADMIN', 'reviews')">
        <div class="nav-item-left">
          <span class="nav-icon">⭐</span>
          <span class="nav-label">Reviews &amp; Ratings</span>
        </div>
      </div>
      <div class="nav-item ${sec === 'quality' || sec === 'hospital-management' || sec === 'onboarding' ? 'active' : ''}" onclick="navigateToRoleSection('SUPER_ADMIN', 'quality')">
        <div class="nav-item-left">
          <span class="nav-icon">🏛️</span>
          <span class="nav-label">Hospital Management</span>
        </div>
      </div>

      <div class="sidebar-category-label mt-16">SECURITY &amp; RECORDS</div>
      <div class="nav-item ${sec === 'audit' ? 'active' : ''}" onclick="navigateToRoleSection('SUPER_ADMIN', 'audit')">
        <div class="nav-item-left">
          <span class="nav-icon">📜</span>
          <span class="nav-label">Audit Trail</span>
        </div>
      </div>
      <div class="nav-item ${sec === 'notifications' ? 'active' : ''}" onclick="navigateToRoleSection('SUPER_ADMIN', 'notifications')">
        <div class="nav-item-left">
          <span class="nav-icon">🔔</span>
          <span class="nav-label">Notifications</span>
        </div>
      </div>

      <div class="sidebar-category-label mt-16">ACCOUNT</div>
      <div class="nav-item ${sec === 'profile' ? 'active' : ''}" onclick="navigateToRoleSection('SUPER_ADMIN', 'profile')">
        <div class="nav-item-left">
          <span class="nav-icon">👤</span>
          <span class="nav-label">Profile</span>
        </div>
      </div>
      <div class="nav-item" onclick="openAccountSettingsModal()">
        <div class="nav-item-left">
          <span class="nav-icon">⚙️</span>
          <span class="nav-label">Settings</span>
        </div>
      </div>
      <div class="nav-item" onclick="handleLogoutAction()">
        <div class="nav-item-left">
          <span class="nav-icon">🚪</span>
          <span class="nav-label">Logout</span>
        </div>
      </div>
    `;
  } else if (role === 'HOSPITAL_ADMIN' || role === 'HOSPITAL') {
    const patients = store.getPatients(hospitalId);
    const doctors = store.getDoctors(hospitalId);
    const referrals = store.getReferrals(hospitalId);
    const transfers = store.getTransfers(hospitalId);
    const pendingTransfers = transfers.filter(t => t.toHospitalId === hospitalId && t.status === 'PENDING');

    navItemsHtml = `
      <div class="sidebar-heading" style="color: var(--hospital-color); display: flex; align-items: center; justify-content: space-between;">
        <span style="display: flex; align-items: center; gap: 6px;"><span>🏥</span> Hospital Workspace</span>
        <button type="button" class="sidebar-collapse-btn" onclick="toggleSidebarCollapse()" title="Toggle sidebar width">◀</button>
      </div>

      <div class="sidebar-category-label">WORKSPACE</div>
      <div class="nav-item ${sec === 'overview' || sec === 'dashboard' ? 'active' : ''}" onclick="navigateToRoleSection('HOSPITAL_ADMIN', 'overview')">
        <div class="nav-item-left">
          <span class="nav-icon">📊</span>
          <span class="nav-label">Dashboard</span>
        </div>
      </div>
      <div class="nav-item ${sec === 'patients' ? 'active' : ''}" onclick="navigateToRoleSection('HOSPITAL_ADMIN', 'patients')">
        <div class="nav-item-left">
          <span class="nav-icon">👤</span>
          <span class="nav-label">Patients</span>
        </div>
        <span class="nav-badge">${patients.length}</span>
      </div>
      <div class="nav-item ${sec === 'doctors' || sec === 'staff' ? 'active' : ''}" onclick="navigateToRoleSection('HOSPITAL_ADMIN', 'doctors')">
        <div class="nav-item-left">
          <span class="nav-icon">🩺</span>
          <span class="nav-label">Doctors</span>
        </div>
        <span class="nav-badge">${doctors.length}</span>
      </div>

      <div class="sidebar-category-label mt-16">OPERATIONS</div>
      <div class="nav-item ${sec === 'beds' || sec === 'bed-management' || sec === 'departments' ? 'active' : ''}" onclick="navigateToRoleSection('HOSPITAL_ADMIN', 'beds')">
        <div class="nav-item-left">
          <span class="nav-icon">🛏️</span>
          <span class="nav-label">Beds &amp; Wards</span>
        </div>
      </div>
      <div class="nav-item ${sec === 'referrals' ? 'active' : ''}" onclick="navigateToRoleSection('HOSPITAL_ADMIN', 'referrals')">
        <div class="nav-item-left">
          <span class="nav-icon">🔁</span>
          <span class="nav-label">Referrals</span>
        </div>
        <span class="nav-badge">${referrals.length}</span>
      </div>
      <div class="nav-item ${sec === 'transfers' ? 'active' : ''}" onclick="navigateToRoleSection('HOSPITAL_ADMIN', 'transfers')">
        <div class="nav-item-left">
          <span class="nav-icon">🚑</span>
          <span class="nav-label">Emergency Transfers</span>
        </div>
        ${pendingTransfers.length > 0 ? `<span class="nav-badge" style="background: var(--danger); color:#fff;">${pendingTransfers.length} PENDING</span>` : `<span class="nav-badge">${transfers.length}</span>`}
      </div>

      <div class="sidebar-category-label mt-16">CARE</div>
      <div class="nav-item ${sec === 'patient-records' || sec === 'consultations' || sec === 'lab-reports' ? 'active' : ''}" onclick="navigateToRoleSection('HOSPITAL_ADMIN', 'patient-records')">
        <div class="nav-item-left">
          <span class="nav-icon">📋</span>
          <span class="nav-label">Patient Records</span>
        </div>
      </div>
      <div class="nav-item ${sec === 'reviews' ? 'active' : ''}" onclick="navigateToRoleSection('HOSPITAL_ADMIN', 'reviews')">
        <div class="nav-item-left">
          <span class="nav-icon">⭐</span>
          <span class="nav-label">Reviews</span>
        </div>
      </div>

      <div class="sidebar-category-label mt-16">ACCOUNT</div>
      <div class="nav-item ${sec === 'profile' ? 'active' : ''}" onclick="navigateToRoleSection('HOSPITAL_ADMIN', 'profile')">
        <div class="nav-item-left">
          <span class="nav-icon">👤</span>
          <span class="nav-label">Profile</span>
        </div>
      </div>
      <div class="nav-item" onclick="openAccountSettingsModal()">
        <div class="nav-item-left">
          <span class="nav-icon">⚙️</span>
          <span class="nav-label">Settings</span>
        </div>
      </div>
      <div class="nav-item" onclick="handleLogoutAction()">
        <div class="nav-item-left">
          <span class="nav-icon">🚪</span>
          <span class="nav-label">Logout</span>
        </div>
      </div>
    `;
  } else if (role === 'DOCTOR') {
    const doctorId = user.doctorId || 'DOC-201';
    const doctor = store.getDoctorById(doctorId) || store.getDoctors()[0];
    const patients = store.getPatients(doctor ? doctor.hospitalId : 'HOSP-101');
    const labs = store.getLabs(doctorId);
    const myPrescriptions = store.getPrescriptions(null, doctorId);
    const referrals = store.getReferrals(doctor ? doctor.hospitalId : 'HOSP-101');

    navItemsHtml = `
      <div class="sidebar-heading" style="color: var(--doctor-color); display: flex; align-items: center; justify-content: space-between;">
        <span style="display: flex; align-items: center; gap: 6px;"><span>🩺</span> Doctor Workspace</span>
        <button type="button" class="sidebar-collapse-btn" onclick="toggleSidebarCollapse()" title="Toggle sidebar width">◀</button>
      </div>

      <div class="sidebar-category-label">WORKSPACE</div>
      <div class="nav-item ${sec === 'dashboard' || sec === 'overview' ? 'active' : ''}" onclick="navigateToRoleSection('DOCTOR', 'dashboard')">
        <div class="nav-item-left">
          <span class="nav-icon">📊</span>
          <span class="nav-label">Dashboard</span>
        </div>
      </div>
      <div class="nav-item ${sec === 'patients' ? 'active' : ''}" onclick="navigateToRoleSection('DOCTOR', 'patients')">
        <div class="nav-item-left">
          <span class="nav-icon">👥</span>
          <span class="nav-label">My Patients</span>
        </div>
        <span class="nav-badge">${patients.length}</span>
      </div>
      <div class="nav-item ${sec === 'consultations' ? 'active' : ''}" onclick="navigateToRoleSection('DOCTOR', 'consultations')">
        <div class="nav-item-left">
          <span class="nav-icon">📝</span>
          <span class="nav-label">Consultations</span>
        </div>
      </div>

      <div class="sidebar-category-label mt-16">CLINICAL</div>
      <div class="nav-item ${sec === 'prescriptions' ? 'active' : ''}" onclick="navigateToRoleSection('DOCTOR', 'prescriptions')">
        <div class="nav-item-left">
          <span class="nav-icon">💊</span>
          <span class="nav-label">Prescriptions</span>
        </div>
        ${myPrescriptions.length > 0 ? `<span class="nav-badge">${myPrescriptions.length}</span>` : ''}
      </div>
      <div class="nav-item ${sec === 'laboratory' || sec === 'lab-reports' || sec === 'labs' ? 'active' : ''}" onclick="navigateToRoleSection('DOCTOR', 'laboratory')">
        <div class="nav-item-left">
          <span class="nav-icon">🔬</span>
          <span class="nav-label">Laboratory</span>
        </div>
        ${labs.length > 0 ? `<span class="nav-badge">${labs.length}</span>` : ''}
      </div>
      <div class="nav-item ${sec === 'referrals' ? 'active' : ''}" onclick="navigateToRoleSection('DOCTOR', 'referrals')">
        <div class="nav-item-left">
          <span class="nav-icon">🔁</span>
          <span class="nav-label">Referrals</span>
        </div>
        ${referrals.length > 0 ? `<span class="nav-badge">${referrals.length}</span>` : ''}
      </div>

      <div class="sidebar-category-label mt-16">ACCOUNT</div>
      <div class="nav-item ${sec === 'profile' ? 'active' : ''}" onclick="navigateToRoleSection('DOCTOR', 'profile')">
        <div class="nav-item-left">
          <span class="nav-icon">👤</span>
          <span class="nav-label">Profile</span>
        </div>
      </div>
      <div class="nav-item" onclick="openAccountSettingsModal()">
        <div class="nav-item-left">
          <span class="nav-icon">⚙️</span>
          <span class="nav-label">Settings</span>
        </div>
      </div>
      <div class="nav-item" onclick="handleLogoutAction()">
        <div class="nav-item-left">
          <span class="nav-icon">🚪</span>
          <span class="nav-label">Logout</span>
        </div>
      </div>
    `;
  } else if (role === 'PATIENT') {
    navItemsHtml = `
      <div class="sidebar-heading" style="color: var(--patient-color); display: flex; align-items: center; justify-content: space-between;">
        <span style="display: flex; align-items: center; gap: 6px;"><span>👤</span> Patient Portal</span>
        <button type="button" class="sidebar-collapse-btn" onclick="toggleSidebarCollapse()" title="Toggle sidebar width">◀</button>
      </div>

      <div class="sidebar-category-label">MY HEALTH</div>
      <div class="nav-item ${sec === 'overview' ? 'active' : ''}" onclick="navigateToRoleSection('PATIENT', 'overview')">
        <div class="nav-item-left">
          <span class="nav-icon">📊</span>
          <span class="nav-label">Overview</span>
        </div>
      </div>
      <div class="nav-item ${sec === 'timeline' ? 'active' : ''}" onclick="navigateToRoleSection('PATIENT', 'timeline')">
        <div class="nav-item-left">
          <span class="nav-icon">⏳</span>
          <span class="nav-label">Medical Timeline</span>
        </div>
      </div>
      <div class="nav-item ${sec === 'prescriptions' ? 'active' : ''}" onclick="navigateToRoleSection('PATIENT', 'prescriptions')">
        <div class="nav-item-left">
          <span class="nav-icon">💊</span>
          <span class="nav-label">Prescriptions</span>
        </div>
      </div>
      <div class="nav-item ${sec === 'lab-reports' || sec === 'reports' || sec === 'labs' ? 'active' : ''}" onclick="navigateToRoleSection('PATIENT', 'lab-reports')">
        <div class="nav-item-left">
          <span class="nav-icon">🔬</span>
          <span class="nav-label">Lab Reports</span>
        </div>
      </div>
      <div class="nav-item ${sec === 'referrals' ? 'active' : ''}" onclick="navigateToRoleSection('PATIENT', 'referrals')">
        <div class="nav-item-left">
          <span class="nav-icon">🔁</span>
          <span class="nav-label">Referrals</span>
        </div>
      </div>

      <div class="sidebar-category-label mt-16">CARE</div>
      <div class="nav-item ${sec === 'hospitals' ? 'active' : ''}" onclick="navigateToRoleSection('PATIENT', 'hospitals')">
        <div class="nav-item-left">
          <span class="nav-icon">🏥</span>
          <span class="nav-label">Hospitals</span>
        </div>
      </div>
      <div class="nav-item ${sec === 'reviews' || sec === 'feedback' ? 'active' : ''}" onclick="navigateToRoleSection('PATIENT', 'reviews')">
        <div class="nav-item-left">
          <span class="nav-icon">⭐</span>
          <span class="nav-label">Reviews</span>
        </div>
      </div>

      <div class="sidebar-category-label mt-16">ACCOUNT</div>
      <div class="nav-item ${sec === 'profile' ? 'active' : ''}" onclick="navigateToRoleSection('PATIENT', 'profile')">
        <div class="nav-item-left">
          <span class="nav-icon">👤</span>
          <span class="nav-label">Profile</span>
        </div>
      </div>
      <div class="nav-item" onclick="openAccountSettingsModal()">
        <div class="nav-item-left">
          <span class="nav-icon">⚙️</span>
          <span class="nav-label">Settings</span>
        </div>
      </div>
      <div class="nav-item" onclick="handleLogoutAction()">
        <div class="nav-item-left">
          <span class="nav-icon">🚪</span>
          <span class="nav-label">Logout</span>
        </div>
      </div>
    `;
  }

  sidebar.innerHTML = `
    <div class="sidebar-nav">
      ${navItemsHtml}
    </div>
  `;
}
window.renderDynamicSidebar = renderDynamicSidebar;

window.toggleSidebarCollapse = function() {
  const sidebar = document.getElementById('appSidebar');
  const appContainer = document.querySelector('.app-container');
  if (sidebar) {
    sidebar.classList.toggle('collapsed');
  }
  if (appContainer) {
    appContainer.classList.toggle('sidebar-collapsed');
  }
};

function renderCurrentView() {
  const user = window.hospitrackAuth.getCurrentUser();
  if (!user) return;
  navigateToRoleSection(activeRole || user.role, activeRoleSubtab || 'overview', null, false);
}
window.renderCurrentView = renderCurrentView;

// --------------------------------------------------------------------------
// Global Instant Search Subsystem (Flow: Search -> Backend API -> Results)
// --------------------------------------------------------------------------
let globalSearchDebounceTimer = null;
let currentSearchSequence = 0;

window.handleGlobalSearchInput = function(query) {
  if (globalSearchDebounceTimer) {
    clearTimeout(globalSearchDebounceTimer);
  }

  const dropdown = document.getElementById('globalSearchDropdown');
  if (!query || query.trim() === '') {
    if (dropdown) {
      dropdown.classList.remove('open');
      dropdown.innerHTML = '';
    }
    return;
  }

  if (dropdown) {
    dropdown.innerHTML = `
      <div class="search-loading-state">
        <span class="btn-spinner"></span>
        <span>Searching records for "<strong>${escapeHtml(query.trim())}</strong>"...</span>
      </div>
    `;
    dropdown.classList.add('open');
  }

  globalSearchDebounceTimer = setTimeout(() => {
    executeGlobalSearch(query.trim());
  }, 200);
};

async function executeGlobalSearch(query) {
  const dropdown = document.getElementById('globalSearchDropdown');
  if (!dropdown) return;

  if (!query) {
    dropdown.classList.remove('open');
    dropdown.innerHTML = '';
    return;
  }

  const seq = ++currentSearchSequence;

  try {
    const results = await window.hospitrackStore.searchGlobal(query);
    // Ignore out-of-order stale responses
    if (seq !== currentSearchSequence) return;

    if (!results || results.length === 0) {
      dropdown.innerHTML = `
        <div class="search-empty-state">
          <span>🔍</span>
          <span>No matching records found for "<strong>${escapeHtml(query)}</strong>"</span>
        </div>
      `;
      dropdown.classList.add('open');
      return;
    }

    // Group results logically
    const groups = {
      PATIENT: [],
      DOCTOR: [],
      HOSPITAL: [],
      REFERRAL: [],
      TRANSFER: [],
      PRESCRIPTION: [],
      LAB_REPORT: []
    };

    results.forEach(r => {
      const type = (r.type || 'PATIENT').toUpperCase();
      if (groups[type]) {
        groups[type].push(r);
      } else {
        groups.PATIENT.push(r);
      }
    });

    let html = '';

    const groupMeta = [
      { key: 'PATIENT', label: '👤 PATIENTS', icon: '👤' },
      { key: 'DOCTOR', label: '🩺 PHYSICIANS', icon: '🩺' },
      { key: 'HOSPITAL', label: '🏥 HOSPITALS', icon: '🏥' },
      { key: 'REFERRAL', label: '🔁 SPECIALIST REFERRALS', icon: '🔁' },
      { key: 'TRANSFER', label: '🚑 EMERGENCY TRANSFERS', icon: '🚑' },
      { key: 'PRESCRIPTION', label: '💊 PRESCRIPTIONS', icon: '💊' },
      { key: 'LAB_REPORT', label: '🔬 LAB REPORTS', icon: '🔬' }
    ];

    groupMeta.forEach(g => {
      const list = groups[g.key];
      if (list && list.length > 0) {
        html += `<div class="search-group-header">${g.label}</div>`;
        list.forEach(item => {
          const statusBadge = item.status ? `<span class="badge ${getStatusBadgeClass(item.status)} ml-6">${escapeHtml(item.status)}</span>` : '';
          html += `
            <button type="button" class="search-result-item" data-type="${escapeHtml(item.type)}" data-id="${escapeHtml(item.id)}" tabindex="0">
              <span class="search-result-icon">${g.icon}</span>
              <div class="search-result-info">
                <div class="search-result-title-row">
                  <span class="search-result-title">${escapeHtml(item.title)}</span>
                  <span class="font-mono text-muted font-xs ml-4">(${escapeHtml(item.id)})</span>
                  ${statusBadge}
                </div>
                <span class="search-result-meta">${escapeHtml(item.subtitle || '')}</span>
              </div>
            </button>
          `;
        });
      }
    });

    dropdown.innerHTML = html;
    dropdown.classList.add('open');

    // Attach click and enter listeners to genuine button rows
    dropdown.querySelectorAll('.search-result-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const type = btn.getAttribute('data-type');
        const id = btn.getAttribute('data-id');
        window.openSearchResult({ type, id });
      });
    });
  } catch (err) {
    if (seq !== currentSearchSequence) return;
    dropdown.innerHTML = `
      <div class="search-error-state">
        <span>⚠️</span>
        <span>Search error: ${escapeHtml(err.message || 'Unable to fetch results')}</span>
      </div>
    `;
    dropdown.classList.add('open');
  }
}

function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
window.escapeHtml = escapeHtml;

window.closeGlobalSearch = function() {
  const dropdown = document.getElementById('globalSearchDropdown');
  if (dropdown) dropdown.classList.remove('open');
};

function getStatusBadgeClass(status) {
  if (!status) return 'badge-info';
  const s = status.toUpperCase();
  if (s === 'ACTIVE' || s === 'COMPLETED' || s === 'ACCEPTED' || s === 'FINAL') return 'badge-success';
  if (s === 'PENDING' || s === 'IN_PROGRESS' || s === 'TRANSFER_PENDING') return 'badge-warning';
  if (s === 'DISCHARGED' || s === 'TRANSFERRED') return 'badge-info';
  if (s === 'REJECTED' || s === 'CANCELLED' || s === 'SUSPENDED') return 'badge-danger';
  return 'badge-info';
}

// --------------------------------------------------------------------------
// Central Result Opener & Workspace Dispatcher
// --------------------------------------------------------------------------
window.openSearchResult = function(result) {
  if (!result || !result.type || !result.id) return;
  window.closeGlobalSearch();
  const input = document.getElementById('globalSearchInput');
  if (input) input.value = '';

  const type = result.type.toUpperCase();
  const id = result.id;

  if (type === 'PATIENT') {
    window.openPatientWorkspace(id);
  } else if (type === 'DOCTOR') {
    window.openDoctorWorkspace(id);
  } else if (type === 'HOSPITAL') {
    window.openHospitalWorkspace(id);
  } else if (type === 'REFERRAL') {
    window.openReferralWorkspace(id);
  } else if (type === 'TRANSFER') {
    window.openTransferWorkspace(id);
  } else if (type === 'PRESCRIPTION' || type === 'LAB_REPORT' || type === 'PATIENT_PRESCRIPTION' || type === 'PATIENT_LAB') {
    const pId = result.metadata?.patientId || result.patientId;
    if (pId) {
      const tab = (type.includes('LAB') || type.includes('REPORT')) ? 'labs' : 'prescriptions';
      window.openPatientWorkspace(pId, tab);
    } else {
      window.openPatientWorkspace(id);
    }
  } else {
    window.openPatientWorkspace(id);
  }
};

window.openPatientWorkspace = function(patientId, tab = 'overview') {
  const targetHash = `#patient/workspace/${encodeURIComponent(patientId)}${tab && tab !== 'overview' ? '/' + encodeURIComponent(tab) : ''}`;
  if (window.location.hash !== targetHash) {
    window.history.pushState(null, '', targetHash);
  }
  openWorkspace('patient', patientId, tab);
};

window.openDoctorWorkspace = function(doctorId, tab = 'overview') {
  const targetHash = `#doctor/workspace/${encodeURIComponent(doctorId)}`;
  if (window.location.hash !== targetHash) {
    window.history.pushState(null, '', targetHash);
  }
  openWorkspace('doctor', doctorId, tab);
};

window.openHospitalWorkspace = function(hospitalId, tab = 'overview') {
  const targetHash = `#hospital/workspace/${encodeURIComponent(hospitalId)}`;
  if (window.location.hash !== targetHash) {
    window.history.pushState(null, '', targetHash);
  }
  openWorkspace('hospital', hospitalId, tab);
};

window.openReferralWorkspace = function(referralId) {
  const targetHash = `#referral/workspace/${encodeURIComponent(referralId)}`;
  if (window.location.hash !== targetHash) {
    window.history.pushState(null, '', targetHash);
  }
  openWorkspace('referral', referralId);
};

window.openTransferWorkspace = function(transferId) {
  const targetHash = `#transfer/workspace/${encodeURIComponent(transferId)}`;
  if (window.location.hash !== targetHash) {
    window.history.pushState(null, '', targetHash);
  }
  openWorkspace('transfer', transferId);
};

// Unified Workspace Controller
window.openWorkspace = function(type, id, tab = 'overview', updateHistory = true) {
  const user = window.hospitrackAuth?.getCurrentUser();
  if (!user) {
    showLoginView();
    return;
  }

  // Ensure shell stays intact: close overlays/dropdowns
  closeMobileSidebar();
  closeProfileDropdown();
  closeNotifDropdown();
  closeGlobalSearch();

  const container = document.getElementById('mainContentArea');
  if (!container) return;

  const t = (type || '').toLowerCase();
  const normalizedId = (id || '').trim();

  // Update Breadcrumbs
  const roleEl = document.getElementById('headerBreadcrumbRole');
  const titleEl = document.getElementById('headerBreadcrumbTitle');
  if (roleEl) roleEl.textContent = 'Workspace';
  if (titleEl) titleEl.textContent = `${t.toUpperCase()} ${normalizedId}`;

  // Update Sidebar Active state
  activeRoleSubtab = 'workspace';
  renderDynamicSidebar(user);

  // Render via workspaceRenderer
  if (window.workspaceRenderer) {
    if (t === 'patient') {
      window.workspaceRenderer.renderPatientWorkspace(container, normalizedId, tab);
    } else if (t === 'doctor') {
      window.workspaceRenderer.renderDoctorWorkspace(container, normalizedId, tab);
    } else if (t === 'hospital') {
      window.workspaceRenderer.renderHospitalWorkspace(container, normalizedId, tab);
    } else if (t === 'referral') {
      window.workspaceRenderer.renderReferralWorkspace(container, normalizedId);
    } else if (t === 'transfer') {
      window.workspaceRenderer.renderTransferWorkspace(container, normalizedId);
    } else {
      window.workspaceRenderer.renderNotFound(container, 'Workspace', id);
    }
  }
};

window.navigateWorkspaceBack = function() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.navigateToDefaultOverview();
  }
};

// --------------------------------------------------------------------------
// Global Keyboard Navigation (Ctrl+K, Up/Down/Enter, Escape)
// --------------------------------------------------------------------------
function initKeyboardNavigation() {
  document.addEventListener('keydown', (e) => {
    // 1. Global ESC handler
    if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal-overlay.open');
      if (openModal) {
        openModal.classList.remove('open');
        return;
      }
      closeProfileDropdown();
      closeNotifDropdown();
      closeGlobalSearch();
      closeMobileSidebar();
      return;
    }

    // 2. Ctrl+K or Cmd+K: Focus search input
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('globalSearchInput');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
      return;
    }

    // 3. Search Dropdown Arrow & Enter Navigation
    const searchInput = document.getElementById('globalSearchInput');
    const dropdown = document.getElementById('globalSearchDropdown');
    const isDropdownOpen = dropdown && dropdown.classList.contains('open');

    if (!isDropdownOpen) return;

    const items = Array.from(dropdown.querySelectorAll('.search-result-item'));
    if (items.length === 0) return;

    const activeEl = document.activeElement;
    const activeIndex = items.indexOf(activeEl);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (activeEl === searchInput || activeIndex === -1) {
        items[0]?.focus();
      } else {
        const nextIndex = (activeIndex + 1) % items.length;
        items[nextIndex]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (activeIndex === 0 || activeIndex === -1) {
        searchInput?.focus();
      } else {
        items[activeIndex - 1]?.focus();
      }
    } else if (e.key === 'Enter' && activeEl === searchInput) {
      if (items.length > 0) {
        e.preventDefault();
        items[0].click();
      }
    }
  });
}

// --------------------------------------------------------------------------
// Notification Center
// --------------------------------------------------------------------------
window.toggleNotifDropdown = function() {
  const dropdown = document.getElementById('notifDropdown');
  if (dropdown) {
    dropdown.classList.toggle('open');
  }
};

window.closeNotifDropdown = function() {
  const dropdown = document.getElementById('notifDropdown');
  if (dropdown) {
    dropdown.classList.remove('open');
  }
};

window.renderNotificationsDropdown = function() {
  const store = window.hospitrackStore;
  const notifs = store.getNotifications();
  const unreadCount = notifs.filter(n => !n.read).length;

  const dotEl = document.getElementById('notifBadgeDot');
  if (dotEl) {
    if (unreadCount > 0) {
      dotEl.style.display = 'flex';
      dotEl.textContent = unreadCount > 9 ? '9+' : unreadCount;
    } else {
      dotEl.style.display = 'none';
    }
  }

  const listEl = document.getElementById('notifList');
  if (listEl) {
    if (notifs.length === 0) {
      listEl.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 1.5rem; font-size: 0.8rem;">No notifications.</div>`;
    } else {
      listEl.innerHTML = notifs.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}" onclick="handleNotifClick('${n.id}')" style="cursor: pointer;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: var(--text-main); font-size: 0.82rem;">${n.title}</strong>
            <span style="font-size: 0.7rem; color: var(--text-dim);">${new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p style="color: var(--text-muted); font-size: 0.76rem; line-height: 1.4;">${n.message}</p>
        </div>
      `).join('');
    }
  }
};

window.handleNotifClick = function(notifId) {
  const store = window.hospitrackStore;
  store.markNotificationRead(notifId);
  renderNotificationsDropdown();
};

window.markAllNotifsRead = function() {
  const store = window.hospitrackStore;
  store.markAllNotificationsRead();
  renderNotificationsDropdown();
  window.showToast('All notifications marked as read.', 'info');
};

// --------------------------------------------------------------------------
// Toast Notifications
// --------------------------------------------------------------------------
window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
    <span style="line-height: 1.4;">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4200);
};
