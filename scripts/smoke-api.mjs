// Run without npm packages or a backend. Tests serialization and method/path coverage.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = (await fs.readFile(resolve(root, 'src/lib/api.js'), 'utf8'))
  .replace('import.meta.env.VITE_API_URL', "''");
const memory = new Map();
globalThis.sessionStorage = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
};
globalThis.window = { dispatchEvent: () => {} };
const { endpoints: ep, saveSession, api } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const calls = [];
let force401Once = false;
globalThis.fetch = async (url, options) => {
  const path = String(url).replace('/api/v1', '');
  calls.push({ path, ...options });
  if (path === '/me' && force401Once) {
    force401Once = false;
    return new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Expired' } }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const response = path === '/auth/refresh' || path === '/auth/login' || path === '/auth/otp/verify' || path === '/auth/register'
    ? { access_token: 'renewed-access', refresh_token: 'renewed-refresh', expires_in: 900 } : {};
  const isEmpty = path === '/auth/logout' || options.method === 'DELETE';
  return new Response(isEmpty ? null : JSON.stringify(response), { status: isEmpty ? 204 : 200, headers: { 'Content-Type': 'application/json' } });
};
const check = async (method, path, callback) => {
  const prev = calls.length;
  await callback();
  const called = calls.slice(prev).filter((c) => c.path.split('?')[0] === path && c.method === method);
  assert.ok(called.length, `${method} ${path} was not called`);
  return called[0];
};
await check('POST', '/auth/otp/request', () => ep.auth.requestOtp('+375291111111', 'login'));
await check('POST', '/auth/register', () => ep.auth.register({ login: 'x', phone: '+375291111111' }));
await check('POST', '/auth/login', () => ep.auth.login('x', 'y'));
await check('POST', '/auth/otp/verify', () => ep.auth.verifyOtp('+375291111111', '123456'));
await check('POST', '/auth/logout', () => ep.auth.logout('test-refresh'));
saveSession({ access_token: 'old-access', refresh_token: 'old-refresh' });
force401Once = true;
const meCall = await check('GET', '/me', ep.me);
assert.equal(meCall.headers.Authorization, 'Bearer old-access');
assert.ok(calls.some((c) => c.path === '/auth/refresh' && c.method === 'POST'));
assert.equal(calls.at(-1).headers.Authorization, 'Bearer renewed-access');
await check('PATCH', '/me', () => ep.updateMe({ full_name: 'Имя' }));
await check('PATCH', '/number', () => ep.updateNumber({ nickname: 'Рабочий' }));
await check('GET', '/dashboard', ep.dashboard);
await check('GET', '/tariffs', ep.tariffs);
await check('PUT', '/number/tariff', () => ep.changeTariff(2));
await check('GET', '/services', () => ep.services({ status: 'connected', search: 'тест' }));
await check('PUT', '/services/2/connection', () => ep.setService(2, true));
await check('GET', '/finance/summary', ep.financeSummary);
await check('GET', '/finance/charges', () => ep.charges('2026-10'));
await check('GET', '/finance/invoices', () => ep.invoices(12));
await check('GET', '/finance/invoices/42', () => ep.invoice(42));
await check('GET', '/finance/payments', () => ep.payments(8));
await check('GET', '/finance/usage-details', () => ep.usageDetails({ from: '2026-10-01', to: '2026-10-29', page: 2, limit: 20 }));
const topup = await check('POST', '/finance/topups', () => ep.topup('20.00', '12345678-1234-4234-9234-123456789abc'));
assert.equal(topup.headers['Idempotency-Key'], '12345678-1234-4234-9234-123456789abc');
assert.equal(JSON.parse(topup.body).amount_byn, '20.00');
await check('GET', '/analytics', () => ep.analytics('2026-10', 6));
await check('GET', '/favorites', ep.favorites);
await check('POST', '/favorites', () => ep.addFavorite({ name: 'Папа', phone: '+375293091909' }));
await check('PATCH', '/favorites/1', () => ep.updateFavorite(1, { name: 'Мама' }));
await check('DELETE', '/favorites/1', () => ep.deleteFavorite(1));
await check('GET', '/notifications', () => ep.notifications({ kind: 'alert', unread_only: true }));
await check('PATCH', '/notifications/55/read', () => ep.markRead(55));
assert.equal(calls.filter((c) => c.path === '/auth/refresh').length, 1);
console.log('OK: all 28 browser-facing API operations invoked with expected HTTP methods and paths.');
console.log('OK: automatic refresh, Bearer authorization and Idempotency-Key.');
