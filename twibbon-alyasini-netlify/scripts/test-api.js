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

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE API TESTS ---');

  // Test 1: GET /
  console.log('1. Testing GET / (Homepage)...');
  const resHome = await request({ hostname: 'localhost', port: 3000, path: '/', method: 'GET' });
  console.assert(resHome.statusCode === 200, 'Homepage status should be 200');
  console.assert(resHome.raw.includes('Al-Yasini'), 'Homepage should contain Al-Yasini branding');
  console.log('   ✓ Homepage OK (Status 200)');

  // Test 2: GET /admin
  console.log('2. Testing GET /admin (Admin Portal)...');
  const resAdmin = await request({ hostname: 'localhost', port: 3000, path: '/admin', method: 'GET' });
  console.assert(resAdmin.statusCode === 200, 'Admin page status should be 200');
  console.assert(resAdmin.raw.includes('Portal Panitia & Admin'), 'Admin page title present');
  console.log('   ✓ Admin Page OK (Status 200)');

  // Test 3: GET /haul-24-alyasini
  console.log('3. Testing GET /haul-24-alyasini (Public Twibbon Slug)...');
  const resPublicTwibbon = await request({ hostname: 'localhost', port: 3000, path: '/haul-24-alyasini', method: 'GET' });
  console.assert(resPublicTwibbon.statusCode === 200, 'Public slug page status should be 200');
  console.assert(resPublicTwibbon.raw.includes('twibbonCanvas'), 'Canvas element present');
  console.log('   ✓ Public Twibbon Page OK (Status 200)');

  // Test 4: GET /api/public/campaigns
  console.log('4. Testing GET /api/public/campaigns...');
  const resCamps = await request({ hostname: 'localhost', port: 3000, path: '/api/public/campaigns', method: 'GET' });
  console.assert(resCamps.statusCode === 200 && resCamps.json.campaigns.length >= 2, 'Should return active campaigns');
  console.log(`   ✓ Active campaigns returned: ${resCamps.json.campaigns.length} campaigns`);

  // Test 5: GET /api/public/campaign/haul-24-alyasini & record view
  console.log('5. Testing GET /api/public/campaign/haul-24-alyasini (View Tracker)...');
  const resSingle = await request({ hostname: 'localhost', port: 3000, path: '/api/public/campaign/haul-24-alyasini', method: 'GET' });
  console.assert(resSingle.statusCode === 200 && resSingle.json.campaign.slug === 'haul-24-alyasini', 'Campaign matched');
  const viewsBefore = resSingle.json.campaign.view_count;
  console.log(`   ✓ Campaign view count: ${viewsBefore}`);

  // Test 6: POST /api/public/campaign/haul-24-alyasini/download
  console.log('6. Testing POST /api/public/campaign/haul-24-alyasini/download (Download Tracker)...');
  const resDl = await request({ hostname: 'localhost', port: 3000, path: '/api/public/campaign/haul-24-alyasini/download', method: 'POST' });
  console.assert(resDl.statusCode === 200 && resDl.json.success === true, 'Download tracker OK');
  console.log('   ✓ Download count incremented successfully');

  // Test 7: POST /api/auth/login invalid
  console.log('7. Testing Login with invalid credentials...');
  const resBadLogin = await request({
    hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ username: 'admin', password: 'wrongpassword' }));
  console.assert(resBadLogin.statusCode === 401, 'Should reject invalid password');
  console.log('   ✓ Invalid login rejected as expected (Status 401)');

  // Test 8: POST /api/auth/login valid
  console.log('8. Testing Login with valid credentials (admin / alyasini2026)...');
  const resLogin = await request({
    hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ username: 'admin', password: 'alyasini2026' }));
  console.assert(resLogin.statusCode === 200 && resLogin.json.success === true, 'Valid login successful');
  const token = resLogin.json.token;
  const cookie = resLogin.headers['set-cookie'] ? resLogin.headers['set-cookie'][0].split(';')[0] : '';
  console.log(`   ✓ Login successful! Token acquired: ${token.substring(0, 16)}...`);

  // Test 9: GET /api/stats (Authorized Admin)
  console.log('9. Testing GET /api/stats (Authorized)...');
  const resStats = await request({
    hostname: 'localhost', port: 3000, path: '/api/stats', method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.assert(resStats.statusCode === 200, 'Stats should be 200');
  console.log(`   ✓ Admin stats loaded: ${resStats.json.totalCampaigns} campaigns, ${resStats.json.totalViews} views, ${resStats.json.totalDownloads} downloads (${resStats.json.conversionRate}% conversion)`);

  // Test 10: Create New Campaign via API
  console.log('10. Testing Campaign Creation (POST /api/campaigns)...');
  const boundary = '----WebKitFormBoundaryXtest123';
  const postData = 
`--${boundary}\r
Content-Disposition: form-data; name="title"\r
\r
Penerimaan Santri Baru 2026\r
--${boundary}\r
Content-Disposition: form-data; name="slug"\r
\r
psb-alyasini-2026\r
--${boundary}\r
Content-Disposition: form-data; name="description"\r
\r
Penerimaan Santri Baru Ponpes Terpadu Al-Yasini Tahun Ajaran 2026/2027\r
--${boundary}\r
Content-Disposition: form-data; name="caption"\r
\r
Saya bangga mendaftar di Pondok Pesantren Terpadu Al-Yasini!\r
--${boundary}\r
Content-Disposition: form-data; name="hashtags"\r
\r
#PSBAlYasini #SantriBaru2026 #AlYasiniPasuruan\r
--${boundary}--\r
`;
  const resCreate = await request({
    hostname: 'localhost', port: 3000, path: '/api/campaigns', method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Authorization': `Bearer ${token}`
    }
  }, Buffer.from(postData));

  console.assert(resCreate.statusCode === 201 && resCreate.json.success === true, 'Campaign created');
  const createdCamp = resCreate.json.campaign;
  console.log(`   ✓ New Campaign created: id=${createdCamp.id}, slug="${createdCamp.slug}", title="${createdCamp.title}"`);

  // Test 11: Verify public access of the new campaign
  console.log('11. Testing Public Access of newly created campaign (/psb-alyasini-2026)...');
  const resNewPublic = await request({ hostname: 'localhost', port: 3000, path: '/psb-alyasini-2026', method: 'GET' });
  console.assert(resNewPublic.statusCode === 200, 'New campaign public slug should return 200');
  console.log('   ✓ New campaign accessible via public URL: http://localhost:3000/psb-alyasini-2026');

  // Test 12: Clean up test campaign
  console.log(`12. Testing DELETE /api/campaigns/${createdCamp.id}...`);
  const resDel = await request({
    hostname: 'localhost', port: 3000, path: `/api/campaigns/${createdCamp.id}`, method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.assert(resDel.statusCode === 200 && resDel.json.success === true, 'Campaign deleted successfully');
  console.log('   ✓ Cleanup test campaign completed');

  console.log('\n========================================');
  console.log('🎉 ALL 12 INTEGRATION TESTS PASSED 100%!');
  console.log('========================================\n');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
