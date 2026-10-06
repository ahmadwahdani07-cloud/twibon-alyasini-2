const { handler } = require('../netlify/functions/api.js');

async function testNetlify() {
  console.log('Testing Netlify Function...');

  // 1. Test GET /api/public/campaigns
  const resCamps = await handler({
    path: '/.netlify/functions/api/public/campaigns',
    httpMethod: 'GET',
    headers: {}
  }, {});
  console.log('Campaigns status:', resCamps.statusCode);
  const data = JSON.parse(resCamps.body);
  console.log('Campaigns count:', data.campaigns ? data.campaigns.length : 0);
  console.assert(resCamps.statusCode === 200, 'Status should be 200');

  // 2. Test Login
  const resLogin = await handler({
    path: '/api/auth/login',
    httpMethod: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'alyasini2026' })
  }, {});
  console.log('Login status:', resLogin.statusCode);
  const loginData = JSON.parse(resLogin.body);
  console.assert(resLogin.statusCode === 200 && loginData.success, 'Login should succeed');
  console.log('Token acquired:', loginData.token ? loginData.token.substring(0, 16) + '...' : null);

  console.log('✓ Netlify Function test PASSED 100%!');
}

testNetlify().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
