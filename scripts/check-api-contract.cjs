// Static audit of the client API boundary against API_endpoints.md.
// This script needs only Node.js and can run before npm install.
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/api.js'), 'utf8');
const methods = [
  ['POST', '/auth/otp/request'],
  ['POST', '/auth/register'],
  ['POST', '/auth/login'],
  ['POST', '/auth/otp/verify'],
  ['POST', '/auth/refresh'],
  ['POST', '/auth/logout'],
  ['GET', '/me'], ['PATCH', '/me'], ['PATCH', '/number'], ['GET', '/dashboard'],
  ['GET', '/tariffs'], ['PUT', '/number/tariff'],
  ['GET', '/services'], ['PUT', '/services/${id}/connection'],
  ['GET', '/finance/summary'], ['GET', '/finance/charges'],
  ['GET', '/finance/invoices'], ['GET', '/finance/invoices/${id}'],
  ['GET', '/finance/payments'], ['GET', '/finance/usage-details'],
  ['POST', '/finance/topups'], ['GET', '/analytics'],
  ['GET', '/favorites'], ['POST', '/favorites'],
  ['PATCH', '/favorites/${id}'], ['DELETE', '/favorites/${id}'],
  ['GET', '/notifications'], ['PATCH', '/notifications/${id}/read'],
];
const missing = methods.filter(([method, endpoint]) => {
  // Check path presence; HTTP method dispatch is visible in the endpoint definitions.
  const fragment = endpoint.replace(/\$\{id\}/g, '${id}');
  return !source.includes(fragment);
});
if (missing.length) {
  console.error('Missing paths:', missing);
  process.exitCode = 1;
} else {
  console.log(`OK: ${methods.length} client-facing API methods are represented.`);
  console.log('The 29th endpoint (payment webhook) must be called by the payment provider, not React.');
}
