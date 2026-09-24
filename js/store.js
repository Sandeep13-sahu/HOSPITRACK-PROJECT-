/**
 * Hospitrack Production Data Store & API Synchronization Engine
 * Connects directly to Spring Boot REST APIs with JWT Bearer Authentication.
 * Authoritative data resides exclusively in PostgreSQL.
 */

function getApiBaseUrl() {
  return (window.HOSPITRACK_CONFIG && window.HOSPITRACK_CONFIG.API_BASE_URL) || (window.hospitrackAuth && window.hospitrackAuth.getApiBaseUrl()) || 'http://localhost:8080';
}

class HospitrackStore {
  constructor() {
    this.data = {
      hospitals: [],
      doctors: [],
      patients: [],
      prescriptions: [],
      labs: [],
      referrals: [],
      transfers: [],
      reviews: [],
      auditLogs: [],
      notifications: [],
      overview: null
    };

    this.isLoading = false;
    this.lastSync = null;
    this.listeners = [];
  }

  // Event subscription for UI reactivity
  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.listeners.forEach(cb => {
      try { cb(this.data); } catch (e) { console.error('Store listener error:', e); }
    });
  }

  getAuthHeader() {
    const token = window.hospitrackAuth?.getAccessToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  getCurrentUser() {
    return window.hospitrackAuth?.getCurrentUser();
  }

  async apiRequest(path, method = 'GET', body = null) {
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader()
    };

    const options = {
      method,
      headers
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}${path}`, options);
      let json = {};
      try {
        json = await response.json();
      } catch (e) {
        json = {};
      }

      if (!response.ok) {
        if (response.status === 401) {
          window.hospitrackAuth?.clearSession();
          if (window.showLoginView) window.showLoginView();
          const authErr = new Error('Session expired. Please sign in again.');
          authErr.status = 401;
          throw authErr;
        }
        const err = new Error(json.message || `Request failed with status ${response.status}`);
        err.status = response.status;
        err.data = json;
        throw err;
      }

      return json;
    } catch (err) {
      if (err.status) {
        throw err;
      }
      throw new Error('Unable to connect to Hospitrack API backend. Please check your network connection.');
    }
  }

  // --------------------------------------------------------------------------
  // Synchronize Live Backend Data
  // --------------------------------------------------------------------------
  async syncAllData() {
    if (!window.hospitrackAuth?.isAuthenticated()) return;
    this.isLoading = true;

    try {
      const user = this.getCurrentUser();
      const role = user?.role;

      // 1. Fetch hospitals (publicly accessible across authorized sessions)
      const hospRes = await this.apiRequest('/api/hospitals').catch(() => ({ data: [] }));
      this.data.hospitals = hospRes.data || [];

      // 2. Fetch doctors
      const docRes = await this.apiRequest('/api/doctors').catch(() => ({ data: [] }));
      this.data.doctors = docRes.data || [];

      // 3. Fetch patients
      const patRes = await this.apiRequest('/api/patients').catch(() => ({ data: [] }));
      this.data.patients = patRes.data || [];

      // 4. Fetch referrals
      const refRes = await this.apiRequest('/api/referrals').catch(() => ({ data: [] }));
      this.data.referrals = refRes.data || [];

      // 5. Fetch transfers
      const trfRes = await this.apiRequest('/api/transfers').catch(() => ({ data: [] }));
      this.data.transfers = trfRes.data || [];

      // 6. Fetch diagnostic laboratory reports
      const labRes = await this.apiRequest('/api/labs').catch(() => ({ data: [] }));
      this.data.labs = labRes.data || [];

      // 7. Admin or role-specific data
      if (role === 'SUPER_ADMIN') {
        const ovRes = await this.apiRequest('/api/admin/overview').catch(() => ({ data: null }));
        this.data.overview = ovRes.data;

        const revRes = await this.apiRequest('/api/admin/reviews').catch(() => ({ data: [] }));
        this.data.reviews = revRes.data || [];

        const audRes = await this.apiRequest('/api/audit').catch(() => ({ data: [] }));
        this.data.auditLogs = audRes.data || [];
      } else if (role === 'HOSPITAL_ADMIN' && user?.hospitalId) {
        const revRes = await this.apiRequest(`/api/reviews/hospital/${user.hospitalId}`).catch(() => ({ data: [] }));
        this.data.reviews = revRes.data || [];

        const audRes = await this.apiRequest('/api/audit').catch(() => ({ data: [] }));
        this.data.auditLogs = audRes.data || [];
      } else if (role === 'PATIENT' && user?.patientId) {
        const rxRes = await this.apiRequest(`/api/prescriptions/patient/${user.patientId}`).catch(() => ({ data: [] }));
        this.data.prescriptions = rxRes.data || [];

        const revRes = await this.apiRequest(`/api/reviews/patient/${user.patientId}`).catch(() => ({ data: [] }));
        this.data.reviews = revRes.data || [];
      }

      this.generateLiveNotifications();
      this.lastSync = new Date();
      this.notify();
    } catch (err) {
      console.warn('Sync notice:', err.message);
    } finally {
      this.isLoading = false;
    }
  }

  generateLiveNotifications() {
    const user = this.getCurrentUser();
    if (!user) return;

    const notifs = [];
    const role = user.role;

    if (role === 'HOSPITAL_ADMIN' || role === 'HOSPITAL') {
      const pendingTransfers = this.data.transfers.filter(t => t.toHospitalId === user.hospitalId && t.status === 'PENDING');
      pendingTransfers.forEach(t => {
        notifs.push({
          id: `NOTIF-TRF-${t.id}`,
          title: '🚨 Emergency Transfer Pending',
          message: `Inbound transfer ${t.id} for patient ${t.patientId} requires immediate admission triage.`,
          timestamp: t.initiatedAt || new Date().toISOString(),
          read: false,
          type: 'TRANSFER'
        });
      });

      const pendingReferrals = this.data.referrals.filter(r => r.toHospitalId === user.hospitalId && r.status === 'PENDING');
      pendingReferrals.forEach(r => {
        notifs.push({
          id: `NOTIF-REF-${r.id}`,
          title: '🔁 Inbound Specialist Referral',
          message: `Referral ${r.id} for patient ${r.patientId} assigned to your facility.`,
          timestamp: r.createdAt || new Date().toISOString(),
          read: false,
          type: 'REFERRAL'
        });
      });
    } else if (role === 'DOCTOR') {
      const myRefs = this.data.referrals.filter(r => r.doctorId === user.doctorId);
      myRefs.slice(0, 3).forEach(r => {
        notifs.push({
          id: `NOTIF-DOC-REF-${r.id}`,
          title: `Referral Update (${r.status})`,
          message: `Specialist referral ${r.id} is currently ${r.status}.`,
          timestamp: r.createdAt || new Date().toISOString(),
          read: true,
          type: 'REFERRAL'
        });
      });
    } else if (role === 'PATIENT') {
      this.data.prescriptions.slice(0, 2).forEach(p => {
        notifs.push({
          id: `NOTIF-PAT-RX-${p.id}`,
          title: '💊 Active Prescription Order',
          message: `Signed prescription ${p.id} with ${p.items?.length || 0} active medication(s).`,
          timestamp: p.prescribedAt || new Date().toISOString(),
          read: true,
          type: 'PRESCRIPTION'
        });
      });
    } else if (role === 'SUPER_ADMIN') {
      const lowRating = this.getLowRatingHospitals(3.0);
      lowRating.forEach(h => {
        notifs.push({
          id: `NOTIF-ADM-LOW-${h.id}`,
          title: '⚠️ Facility Quality Alert',
          message: `${h.name} has dropped to ${h.rating}★ rating. Administrative review suggested.`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'ADMIN'
        });
      });
    }

    this.data.notifications = notifs;
  }

  // --------------------------------------------------------------------------
  // Getters
  // --------------------------------------------------------------------------
  getHospitals() {
    return this.data.hospitals || [];
  }

  getHospitalById(id) {
    return this.data.hospitals.find(h => h.id === id) || null;
  }

  getLowRatingHospitals(threshold = 3.0) {
    return this.data.hospitals.filter(h => h.rating && h.rating > 0 && h.rating < threshold && h.status === 'ACTIVE');
  }

  getDoctors(hospitalId = null) {
    if (hospitalId) {
      return this.data.doctors.filter(d => d.hospitalId === hospitalId);
    }
    return this.data.doctors || [];
  }

  getDoctorById(id) {
    return this.data.doctors.find(d => d.id === id) || null;
  }

  getPatients(hospitalId = null) {
    if (hospitalId) {
      return this.data.patients.filter(p => p.currentHospitalId === hospitalId);
    }
    return this.data.patients || [];
  }

  getPatientById(id) {
    return this.data.patients.find(p => p.id === id) || null;
  }

  async getPatientTimeline(patientId) {
    const res = await this.apiRequest(`/api/patients/${patientId}/timeline`);
    return res.data;
  }

  getPrescriptions(patientId = null, doctorId = null) {
    let list = this.data.prescriptions || [];
    if (patientId) {
      list = list.filter(p => p.patientId === patientId);
    }
    if (doctorId) {
      list = list.filter(p => p.doctorId === doctorId);
    }
    return list;
  }

  getLabs(doctorId = null, patientId = null, hospitalId = null) {
    let list = this.data.labs || [];
    if (patientId) {
      list = list.filter(l => l.patientId === patientId);
    }
    if (doctorId) {
      list = list.filter(l => l.doctorId === doctorId);
    }
    if (hospitalId) {
      list = list.filter(l => l.hospitalId === hospitalId);
    }
    return list;
  }

  getLabById(id) {
    return (this.data.labs || []).find(l => l.id === id) || null;
  }

  getRecentActivities(doctorId = null, hospitalId = null) {
    const activities = [];
    const patientsMap = new Map((this.data.patients || []).map(p => [p.id, p]));

    // 1. Prescriptions
    (this.data.prescriptions || []).forEach(rx => {
      if ((!doctorId || rx.doctorId === doctorId) && (!hospitalId || rx.hospitalId === hospitalId)) {
        const p = patientsMap.get(rx.patientId);
        activities.push({
          id: `ACT-RX-${rx.id}`,
          timestamp: rx.prescribedAt || new Date().toISOString(),
          type: 'PRESCRIPTION',
          icon: '💊',
          action: 'Prescription issued',
          patientName: p ? p.name : rx.patientId,
          patientId: rx.patientId,
          details: `${(rx.items || []).length} medication(s) prescribed`
        });
      }
    });

    // 2. Labs
    (this.data.labs || []).forEach(lab => {
      if ((!doctorId || lab.doctorId === doctorId) && (!hospitalId || lab.hospitalId === hospitalId)) {
        const p = patientsMap.get(lab.patientId);
        const isReviewed = lab.status === 'REVIEWED';
        activities.push({
          id: `ACT-LAB-${lab.id}`,
          timestamp: lab.reportDate || new Date().toISOString(),
          type: 'LAB',
          icon: '🔬',
          action: isReviewed ? 'Lab report reviewed' : 'Lab test ordered',
          patientName: p ? p.name : lab.patientId,
          patientId: lab.patientId,
          details: `${lab.testName} (${lab.status})`
        });
      }
    });

    // 3. Referrals
    (this.data.referrals || []).forEach(ref => {
      if ((!doctorId || ref.doctorId === doctorId) && (!hospitalId || ref.fromHospitalId === hospitalId || ref.toHospitalId === hospitalId)) {
        const p = patientsMap.get(ref.patientId);
        activities.push({
          id: `ACT-REF-${ref.id}`,
          timestamp: ref.createdAt || new Date().toISOString(),
          type: 'REFERRAL',
          icon: '🔁',
          action: `Referral ${ref.status.toLowerCase()}`,
          patientName: p ? p.name : ref.patientId,
          patientId: ref.patientId,
          details: `${ref.priority} • ${ref.reason}`
        });
      }
    });

    // Sort descending by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return activities;
  }

  getReferrals(hospitalId = null, role = null) {
    if (hospitalId) {
      return this.data.referrals.filter(r => r.fromHospitalId === hospitalId || r.toHospitalId === hospitalId);
    }
    return this.data.referrals || [];
  }

  getReferralById(id) {
    return (this.data.referrals || []).find(r => r.id === id) || null;
  }

  getTransfers(hospitalId = null, role = null) {
    if (hospitalId) {
      return this.data.transfers.filter(t => t.fromHospitalId === hospitalId || t.toHospitalId === hospitalId);
    }
    return this.data.transfers || [];
  }

  getTransferById(id) {
    return (this.data.transfers || []).find(t => t.id === id) || null;
  }

  async searchGlobal(query, type = null) {
    if (!query || !query.trim()) return [];
    let url = `/api/search?q=${encodeURIComponent(query.trim())}`;
    if (type && type !== 'ALL') url += `&type=${encodeURIComponent(type)}`;
    const res = await this.apiRequest(url);
    return res.data || [];
  }

  async fetchPatientById(id) {
    if (!id) return null;
    const res = await this.apiRequest(`/api/patients/${encodeURIComponent(id)}`);
    return res.data;
  }

  async fetchDoctorById(id) {
    if (!id) return null;
    const res = await this.apiRequest(`/api/doctors/${encodeURIComponent(id)}`);
    return res.data;
  }

  async fetchHospitalById(id) {
    if (!id) return null;
    const res = await this.apiRequest(`/api/hospitals/${encodeURIComponent(id)}`);
    return res.data;
  }

  async fetchReferralById(id) {
    if (!id) return null;
    const res = await this.apiRequest(`/api/referrals/${encodeURIComponent(id)}`);
    return res.data;
  }

  async fetchTransferById(id) {
    if (!id) return null;
    const res = await this.apiRequest(`/api/transfers/${encodeURIComponent(id)}`);
    return res.data;
  }

  getReviews(hospitalId = null) {
    if (hospitalId) {
      return this.data.reviews.filter(r => r.hospitalId === hospitalId);
    }
    return this.data.reviews || [];
  }

  getAuditLogs(role = null, search = null) {
    let logs = this.data.auditLogs || [];
    if (role && role !== 'ALL') {
      logs = logs.filter(l => l.role === role);
    }
    if (search && search.trim()) {
      const q = search.toLowerCase();
      logs = logs.filter(l =>
        l.action.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        l.actorName.toLowerCase().includes(q) ||
        l.entityId.toLowerCase().includes(q)
      );
    }
    return logs;
  }

  getNotifications() {
    return this.data.notifications || [];
  }

  markNotificationRead(id) {
    const n = this.data.notifications.find(item => item.id === id);
    if (n) {
      n.read = true;
      this.notify();
    }
  }

  markAllNotificationsRead() {
    this.data.notifications.forEach(item => item.read = true);
    this.notify();
  }

  // --------------------------------------------------------------------------
  // Real REST API Mutations
  // --------------------------------------------------------------------------
  async createPatient(payload) {
    const res = await this.apiRequest('/api/patients', 'POST', payload);
    await this.syncAllData();
    return res.data;
  }

  async dischargePatient(patientId) {
    const res = await this.apiRequest(`/api/patients/${patientId}/discharge`, 'PUT');
    await this.syncAllData();
    return res.data;
  }

  async logVisit(patientId, payload) {
    if (!payload.patientId) payload.patientId = patientId;
    const res = await this.apiRequest(`/api/patients/${patientId}/visits`, 'POST', payload);
    await this.syncAllData();
    return res.data;
  }

  async createPrescription(payload) {
    // Client-side duplicate check before POST (defense-in-depth)
    if (payload.medicines && Array.isArray(payload.medicines)) {
      const names = payload.medicines.map(m => m.name?.trim().toLowerCase()).filter(Boolean);
      const uniqueNames = new Set(names);
      if (uniqueNames.size < names.length) {
        throw new Error('Duplicate medication detected: Cannot prescribe the same drug multiple times in a single consultation.');
      }
    }

    const res = await this.apiRequest('/api/prescriptions', 'POST', payload);
    await this.syncAllData();
    return res.data;
  }

  async createLabRequest(payload) {
    const res = await this.apiRequest('/api/labs', 'POST', payload);
    await this.syncAllData();
    return res.data;
  }

  async updateLabStatus(labId, status, resultSummary = '') {
    const res = await this.apiRequest(`/api/labs/${labId}/status`, 'PATCH', { status, resultSummary });
    await this.syncAllData();
    return res.data;
  }

  async createReferral(payload) {
    const res = await this.apiRequest('/api/referrals', 'POST', payload);
    await this.syncAllData();
    return res.data;
  }

  async updateReferralStatus(referralId, status) {
    const res = await this.apiRequest(`/api/referrals/${referralId}/status`, 'PATCH', { status });
    await this.syncAllData();
    return res.data;
  }

  async initiateTransfer(payload) {
    const res = await this.apiRequest('/api/transfers', 'POST', payload);
    await this.syncAllData();
    return res.data;
  }

  async acceptTransfer(transferId) {
    const res = await this.apiRequest(`/api/transfers/${transferId}/accept`, 'POST');
    await this.syncAllData();
    return res.data;
  }

  async updateBedCapacity(hospitalId, availableBeds) {
    const res = await this.apiRequest(`/api/hospitals/${hospitalId}/beds`, 'PUT', { availableBeds });
    await this.syncAllData();
    return res.data;
  }

  async createReview(payload) {
    const res = await this.apiRequest('/api/reviews', 'POST', payload);
    await this.syncAllData();
    return res.data;
  }

  async flagReview(reviewId) {
    const res = await this.apiRequest(`/api/admin/reviews/${reviewId}/flag`, 'PUT');
    await this.syncAllData();
    return res.data;
  }

  async approveHospital(hospitalId) {
    const res = await this.apiRequest(`/api/admin/hospitals/${hospitalId}/approve`, 'POST');
    await this.syncAllData();
    return res.data;
  }

  async suspendHospital(hospitalId, reason = 'Administrative suspension') {
    const res = await this.apiRequest(`/api/admin/hospitals/${hospitalId}/suspend`, 'POST', { reason });
    await this.syncAllData();
    return res.data;
  }

  async reactivateHospital(hospitalId, reason = 'Administrative reactivation approved') {
    const res = await this.apiRequest(`/api/admin/hospitals/${hospitalId}/reactivate`, 'POST', { reason });
    await this.syncAllData();
    return res.data;
  }

  async updateHospitalStatus(hospitalId, status, reason = '') {
    if (status === 'ACTIVE') {
      return this.reactivateHospital(hospitalId, reason);
    } else if (status === 'SUSPENDED') {
      return this.suspendHospital(hospitalId, reason);
    }
    const res = await this.apiRequest(`/api/admin/hospitals/${hospitalId}/status`, 'PUT', { status, reason });
    await this.syncAllData();
    return res.data;
  }

  async getHospitalDetails(hospitalId) {
    const res = await this.apiRequest(`/api/admin/hospitals/${hospitalId}/details`);
    return res.data;
  }

  async updatePatientProfile(patientId, payload) {
    const res = await this.apiRequest(`/api/patients/${patientId}`, 'PUT', payload);
    // Update current patient in store
    const idx = (this.data.patients || []).findIndex(p => p.id === patientId);
    if (idx !== -1) {
      this.data.patients[idx] = res.data;
    }
    // Update current user if matching
    const currentUser = this.getCurrentUser();
    if (currentUser && (currentUser.patientId === patientId || currentUser.id === patientId)) {
      currentUser.name = res.data.name;
      currentUser.email = res.data.email || currentUser.email;
      const keys = window.HOSPITRACK_CONFIG?.STORAGE_KEYS || {};
      const storage = localStorage.getItem(keys.AUTH_USER) ? localStorage : sessionStorage;
      storage.setItem(keys.AUTH_USER, JSON.stringify(currentUser));
    }
    await this.syncAllData();
    return res.data;
  }

  async updateHospitalProfile(hospitalId, payload) {
    const res = await this.apiRequest(`/api/hospitals/${hospitalId}`, 'PUT', payload);
    const idx = (this.data.hospitals || []).findIndex(h => h.id === hospitalId);
    if (idx !== -1) {
      this.data.hospitals[idx] = res.data;
    }
    await this.syncAllData();
    return res.data;
  }

  clearAll() {
    this.data = {
      hospitals: [],
      doctors: [],
      patients: [],
      prescriptions: [],
      labs: [],
      referrals: [],
      transfers: [],
      reviews: [],
      auditLogs: [],
      notifications: [],
      overview: null
    };
    this.isLoading = false;
    this.lastSync = null;
    this.notify();
  }

  async createDoctor(payload) {
    const res = await this.apiRequest('/api/doctors', 'POST', payload);
    await this.syncAllData();
    return res.data;
  }

  async assignDoctorToHospital(doctorId, hospitalId, department = null) {
    const res = await this.apiRequest(`/api/doctors/${encodeURIComponent(doctorId)}/assign`, 'POST', {
      hospitalId,
      department: department || undefined,
      specialty: department || undefined
    });
    await this.syncAllData();
    return res.data;
  }

  async updateDoctor(doctorId, payload) {
    const res = await this.apiRequest(`/api/doctors/${encodeURIComponent(doctorId)}`, 'PUT', payload);
    await this.syncAllData();
    return res.data;
  }

  async downloadPatientReport(patientId) {
    const patient = await this.fetchPatientById(patientId);
    if (!patient) {
      throw new Error(`Patient record ${patientId} unavailable or not found.`);
    }

    let timeline = { visits: [], prescriptions: [], reports: [] };
    try {
      timeline = await this.getPatientTimeline(patientId);
    } catch (e) {
      console.warn('Timeline fetch error during export:', e);
    }

    const hospital = this.getHospitalById(patient.currentHospitalId) || { name: patient.currentHospitalId || 'Hospital' };
    const doctor = this.getDoctorById(patient.primaryDoctorId) || { name: patient.primaryDoctorId || 'Doctor' };
    const referrals = (this.data.referrals || []).filter(r => r.patientId === patientId);
    const transfers = (this.data.transfers || []).filter(t => t.patientId === patientId);

    const dossier = {
      hospitalSystem: 'HOSPITRACK CLINICAL NETWORK',
      exportTimestamp: new Date().toISOString(),
      facility: {
        id: hospital.id,
        name: hospital.name,
        code: hospital.code || hospital.id,
        location: hospital.location
      },
      patient: {
        id: patient.id,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        contact: patient.contact,
        email: patient.email,
        emergencyContact: patient.emergencyContact,
        address: patient.address,
        status: patient.status,
        admittedAt: patient.admittedAt,
        primaryDoctor: {
          id: doctor.id,
          name: doctor.name,
          specialty: doctor.specialty
        }
      },
      consultations: (timeline.visits || []).map(v => ({
        id: v.id,
        visitDate: v.visitDate,
        doctorId: v.doctorId,
        hospitalId: v.hospitalId,
        symptoms: v.symptoms,
        diagnosis: v.diagnosis,
        treatment: v.treatment,
        notes: v.notes
      })),
      prescriptions: (timeline.prescriptions || this.getPrescriptions(patientId)).map(rx => ({
        id: rx.id,
        prescribedAt: rx.prescribedAt,
        doctorId: rx.doctorId,
        hospitalId: rx.hospitalId,
        medications: (rx.items || []).map(i => ({
          name: i.name,
          dosage: i.dosage,
          frequency: i.frequency,
          duration: i.duration,
          instructions: i.instructions
        }))
      })),
      diagnosticLabReports: (timeline.reports || this.getLabs(null, patientId)).map(l => ({
        id: l.id,
        testName: l.testName,
        category: l.category,
        reportDate: l.reportDate,
        resultSummary: l.resultSummary,
        status: l.status
      })),
      referrals: referrals.map(r => ({
        id: r.id,
        fromHospitalId: r.fromHospitalId,
        toHospitalId: r.toHospitalId,
        specialty: r.specialty,
        priority: r.priority,
        status: r.status,
        reason: r.reason,
        notes: r.notes
      })),
      emergencyTransfers: transfers.map(t => ({
        id: t.id,
        fromHospitalId: t.fromHospitalId,
        toHospitalId: t.toHospitalId,
        priority: t.priority,
        status: t.status,
        reason: t.reason,
        initiatedAt: t.initiatedAt,
        notes: t.notes
      }))
    };

    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HOSPITRACK_PATIENT_${patientId}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return dossier;
  }

  async downloadAllPatientsReport(hospitalId) {
    const patients = this.getPatients(hospitalId);
    if (!patients || patients.length === 0) {
      throw new Error('No authorized patient records found to download.');
    }

    const hospital = this.getHospitalById(hospitalId) || { id: hospitalId, name: 'Hospital Facility' };
    const registry = {
      hospitalSystem: 'HOSPITRACK CLINICAL NETWORK',
      exportTimestamp: new Date().toISOString(),
      facility: {
        id: hospital.id,
        name: hospital.name,
        code: hospital.code || hospital.id,
        location: hospital.location,
        totalBeds: hospital.totalBeds,
        availableBeds: hospital.availableBeds
      },
      patientCount: patients.length,
      inpatients: patients.map(p => ({
        id: p.id,
        name: p.name,
        age: p.age,
        gender: p.gender,
        bloodGroup: p.bloodGroup,
        contact: p.contact,
        status: p.status,
        admittedAt: p.admittedAt,
        primaryDoctorId: p.primaryDoctorId
      }))
    };

    const blob = new Blob([JSON.stringify(registry, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HOSPITRACK_FACILITY_${hospitalId}_PATIENTS_REGISTRY_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return registry;
  }

  async createHospital(payload) {
    const res = await this.apiRequest('/api/hospitals', 'POST', payload);
    await this.syncAllData();
    return res.data;
  }
}

window.hospitrackStore = new HospitrackStore();
