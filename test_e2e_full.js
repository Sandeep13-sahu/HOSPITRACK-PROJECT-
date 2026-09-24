const http = require('http');
const assert = require('assert');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch(e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json
        });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('  HOSPITRACK END-TO-END VALIDATION SUITE');
  console.log('====================================================\n');

  let passCount = 0;
  let totalCount = 0;

  async function test(name, fn) {
    totalCount++;
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passCount++;
    } catch (e) {
      console.error(`[FAIL] ${name}:`, e.message);
    }
  }

  // 1. Health endpoint GET /api/health
  await test('1. Health endpoint GET /api/health directly on backend port 8080', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/health',
      method: 'GET'
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.status, 'UP');
  });

  // 2. Health endpoint GET /api/auth/health
  await test('2. Health endpoint GET /api/auth/health', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/health',
      method: 'GET'
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.status, 'UP');
  });

  // 3. Frontend server GET / on port 8000
  await test('3. Frontend server serving index.html on port 8000', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8000,
      path: '/',
      method: 'GET'
    });
    assert.strictEqual(res.statusCode, 200);
    assert(res.body.includes('Hospitrack'));
  });

  // 4. Frontend proxy GET /api/health on port 8000
  await test('4. Frontend proxy forwarding /api/health on port 8000', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8000,
      path: '/api/health',
      method: 'GET'
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.status, 'UP');
  });

  // 5. CORS Preflight OPTIONS request on /api/auth/login
  await test('5. CORS Preflight OPTIONS from origin http://localhost:8000', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/login',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:8000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['access-control-allow-origin'], 'http://localhost:8000');
    assert.strictEqual(res.headers['access-control-allow-credentials'], 'true');
  });

  // 6. CORS Preflight OPTIONS request from Vite port 5173
  await test('6. CORS Preflight OPTIONS from Vite origin http://localhost:5173', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/login',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['access-control-allow-origin'], 'http://localhost:5173');
    assert.strictEqual(res.headers['access-control-allow-credentials'], 'true');
  });

  // 7. Login with valid SUPER_ADMIN credentials
  let adminToken = null;
  await test('7. Login with seeded SUPER_ADMIN credentials', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:8000'
      }
    }, {
      identifier: 'admin@hospitrack.com',
      password: 'Admin@Hospitrack2026!'
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.success, true);
    assert(res.json.data.accessToken, 'Access token missing');
    assert.strictEqual(res.json.data.user.role, 'SUPER_ADMIN');
    adminToken = res.json.data.accessToken;
  });

  // 8. Login with invalid credentials returns 401 and error message
  await test('8. Login with invalid credentials returns 401 with proper message', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      identifier: 'admin@hospitrack.com',
      password: 'WrongPassword123!'
    });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.json.success, false);
    assert.strictEqual(res.json.message, 'Invalid email or password.');
  });

  // 9. Register a new patient account
  const testPatientEmail = `testpatient_${Date.now()}@example.com`;
  await test('9. Register new patient account via /api/auth/register/patient', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/register/patient',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      name: 'Aarav Sharma',
      username: `aarav_${Date.now()}`,
      email: testPatientEmail,
      phone: '+91 98765 43210',
      password: 'PatientPass123!',
      age: 28,
      gender: 'Male',
      bloodGroup: 'B+',
      address: '123 Test Street, New Delhi',
      emergencyContact: '+91 98765 00000'
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.success, true);
    assert.strictEqual(res.json.data.email, testPatientEmail);
    assert.strictEqual(res.json.data.role, 'PATIENT');
  });

  // 10. Login with newly created patient account
  let patientToken = null;
  await test('10. Login with newly created patient account', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      identifier: testPatientEmail,
      password: 'PatientPass123!'
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.success, true);
    assert(res.json.data.accessToken);
    assert.strictEqual(res.json.data.user.email, testPatientEmail);
    assert.strictEqual(res.json.data.user.role, 'PATIENT');
    patientToken = res.json.data.accessToken;
  });

  // 11. Duplicate registration rejection with 409
  await test('11. Duplicate patient registration returns 409 Conflict', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/register/patient',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      name: 'Duplicate Aarav',
      email: testPatientEmail,
      password: 'PatientPass123!'
    });
    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res.json.success, false);
    assert(res.json.message.includes('already exists'));
  });

  // 12. Register a new hospital facility
  const testHospitalEmail = `testhosp_${Date.now()}@facility.com`;
  await test('12. Register new hospital facility via /api/auth/register/hospital', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/register/hospital',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      hospitalName: 'St. Jude Memorial Hospital',
      registrationNumber: `REG-${Date.now()}`,
      email: testHospitalEmail,
      phone: '+91 98200 11223',
      hospitalType: 'Multispeciality',
      totalBeds: 350,
      address: '77 Medical Park',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      password: 'HospitalAdminPass123!'
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.success, true);
    assert.strictEqual(res.json.data.email, testHospitalEmail);
    assert.strictEqual(res.json.data.role, 'HOSPITAL_ADMIN');
  });

  // 13. Access protected /api/auth/me with JWT
  await test('13. Access protected /api/auth/me using JWT Bearer token', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/me',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${patientToken}`
      }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.success, true);
    assert.strictEqual(res.json.data.email, testPatientEmail);
  });

  // 14. Access protected API without token returns 403 / 401
  await test('14. Access protected endpoint without token is rejected', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/admin/overview',
      method: 'GET'
    });
    assert(res.statusCode === 401 || res.statusCode === 403);
  });

  // 15. Access admin endpoint with SUPER_ADMIN JWT
  await test('15. Access admin endpoint with valid SUPER_ADMIN JWT', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/admin/overview',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.success, true);
    assert(res.json.data.totalHospitals >= 0);
  });

  // 16. Test doctor login and data retrieval
  await test('16. Login as Doctor (Dr. Sarah Sharma) and fetch authorized clinical data', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      identifier: 's.sharma@citygeneral.in',
      password: 'Doctor@123!'
    });
    assert.strictEqual(res.statusCode, 200);
    const doctorToken = res.json.data.accessToken;

    const patListRes = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/patients',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${doctorToken}`
      }
    });
    assert.strictEqual(patListRes.statusCode, 200);
    assert.strictEqual(patListRes.json.success, true);
    assert(Array.isArray(patListRes.json.data));
  });

  console.log('\n====================================================');
  console.log(`  TEST RESULTS: ${passCount}/${totalCount} TESTS PASSED`);
  console.log('====================================================');

  if (passCount !== totalCount) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
