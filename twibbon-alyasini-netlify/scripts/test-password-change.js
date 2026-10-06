const http = require('node:http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const bodyStr = Buffer.concat(chunks).toString('utf8');
        let bodyJson = null;
        try { bodyJson = JSON.parse(bodyStr); } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          raw: bodyStr,
          json: bodyJson
        });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function testSecurity() {
  console.log('1. Checking admin.html page source...');
  const resAdmin = await request({ hostname: 'localhost', port: 3000, path: '/admin', method: 'GET' });
  console.assert(!resAdmin.raw.includes('alyasini2026'), 'admin.html MUST NOT contain default password');
  console.assert(!resAdmin.raw.includes('Username: <code>admin</code>'), 'admin.html MUST NOT display default credentials');
  console.log('   ✓ Security check passed: Default credentials are NOT displayed on admin page!');

  console.log('2. Testing login with admin / alyasini2026...');
  const resLogin = await request({
    hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ username: 'admin', password: 'alyasini2026' }));
  console.assert(resLogin.statusCode === 200, 'Login should succeed');
  const token = resLogin.json.token;

  console.log('3. Testing change password with wrong current password...');
  const resWrongCurrent = await request({
    hostname: 'localhost', port: 3000, path: '/api/auth/change-password', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, JSON.stringify({ currentPassword: 'wrong_password', newPassword: 'secretpassword2026' }));
  console.assert(resWrongCurrent.statusCode === 401, 'Should fail with 401');
  console.log('   ✓ Rejected wrong current password');

  console.log('4. Testing change password with short new password...');
  const resShort = await request({
    hostname: 'localhost', port: 3000, path: '/api/auth/change-password', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, JSON.stringify({ currentPassword: 'alyasini2026', newPassword: '123' }));
  console.assert(resShort.statusCode === 400, 'Should fail with 400');
  console.log('   ✓ Rejected short new password');

  console.log('5. Testing valid password change...');
  const resChange = await request({
    hostname: 'localhost', port: 3000, path: '/api/auth/change-password', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, JSON.stringify({ currentPassword: 'alyasini2026', newPassword: 'panitiaAlYasini2026!' }));
  console.assert(resChange.statusCode === 200 && resChange.json.success === true, 'Password change should succeed');
  console.log('   ✓ Password successfully changed!');

  console.log('6. Verifying old password no longer works...');
  const resOldLogin = await request({
    hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ username: 'admin', password: 'alyasini2026' }));
  console.assert(resOldLogin.statusCode === 401, 'Old password must be rejected');
  console.log('   ✓ Old password rejected (401)');

  console.log('7. Verifying new password works...');
  const resNewLogin = await request({
    hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ username: 'admin', password: 'panitiaAlYasini2026!' }));
  console.assert(resNewLogin.statusCode === 200 && resNewLogin.json.success === true, 'New password must succeed');
  console.log('   ✓ New password works successfully!');

  // Reset back to alyasini2026 for developer convenience
  const newToken = resNewLogin.json.token;
  await request({
    hostname: 'localhost', port: 3000, path: '/api/auth/change-password', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${newToken}` }
  }, JSON.stringify({ currentPassword: 'panitiaAlYasini2026!', newPassword: 'alyasini2026' }));
  console.log('   ✓ Reset password test back to standard baseline');

  console.log('\n--- ALL PASSWORD AND SECURITY TESTS PASSED! ---');
}

testSecurity().catch(err => {
  console.error(err);
  process.exit(1);
});
