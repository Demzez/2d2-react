/** API boundary. No fabricated demo data: every business entity comes from the backend. */
const API_BASE = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');
const SESSION_KEY = '2d2.session.v1';
let refreshInFlight = null;

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function getSession() {
  try {
    const data = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    return data?.refresh_token ? data : null;
  } catch { return null; }
}
export function saveSession(tokens) {
  const previous = getSession() || {};
  const next = { ...previous, ...tokens };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('2d2-session-updated'));
}
export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event('2d2-session-updated'));
}

async function decodeResponse(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; }
  catch { throw new ApiError('Сервер вернул некорректный JSON', response.status, 'INVALID_JSON'); }
  if (!response.ok) {
    throw new ApiError(body?.error?.message || `Ошибка сервера: ${response.status}`, response.status, body?.error?.code);
  }
  return body;
}

async function send(path, { method = 'GET', body, headers = {}, auth = true, signal } = {}) {
  const session = getSession();
  const requestHeaders = { Accept: 'application/json', ...headers };
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';
  if (auth && session?.access_token) requestHeaders.Authorization = `Bearer ${session.access_token}`;
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Нет соединения с сервером. Проверьте запуск backend и адрес API.', 0, 'NETWORK_ERROR');
  }
  return response;
}

async function refreshTokens() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refresh_token = getSession()?.refresh_token;
      if (!refresh_token) throw new ApiError('Требуется авторизация', 401, 'UNAUTHORIZED');
      const response = await send('/auth/refresh', { method: 'POST', body: { refresh_token }, auth: false });
      const result = await decodeResponse(response);
      saveSession(result);
      return result;
    })().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

export async function request(path, options = {}) {
  const { auth = true } = options;
  let response = await send(path, options);
  if (response.status === 401 && auth) {
    try {
      await refreshTokens();
      response = await send(path, options);
    } catch (err) {
      // A temporary network outage must not erase valid refresh credentials.
      if (err.status === 400 || err.status === 401 || err.status === 403) clearSession();
      throw err;
    }
    if (response.status === 401) clearSession();
  }
  return decodeResponse(response);
}

export function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value != null) search.set(key, String(value));
  });
  const str = search.toString();
  return str ? `?${str}` : '';
}
export const api = {
  get: (path, params, options = {}) => request(path + queryString(params), options),
  post: (path, body, options = {}) => request(path, { method: 'POST', body, ...options }),
  put: (path, body, options = {}) => request(path, { method: 'PUT', body, ...options }),
  patch: (path, body, options = {}) => request(path, { method: 'PATCH', body, ...options }),
  delete: (path, options = {}) => request(path, { method: 'DELETE', ...options }),
};

// Central endpoint map makes auditing coverage against API_endpoints.md straightforward.
export const endpoints = {
  auth: {
    requestOtp: (phone, purpose) => api.post('/auth/otp/request', { phone, purpose }, { auth: false }),
    register: (body) => api.post('/auth/register', body, { auth: false }),
    login: (login, password) => api.post('/auth/login', { login, password }, { auth: false }),
    verifyOtp: (phone, code) => api.post('/auth/otp/verify', { phone, code }, { auth: false }),
    logout: (refresh_token) => api.post('/auth/logout', { refresh_token }, { auth: false }),
  },
  me: () => api.get('/me'),
  updateMe: (body) => api.patch('/me', body),
  updateNumber: (body) => api.patch('/number', body),
  dashboard: () => api.get('/dashboard'),
  tariffs: () => api.get('/tariffs'),
  changeTariff: (tariff_id) => api.put('/number/tariff', { tariff_id }),
  services: (params) => api.get('/services', params),
  setService: (id, enabled) => api.put(`/services/${id}/connection`, { enabled }),
  financeSummary: () => api.get('/finance/summary'),
  charges: (month) => api.get('/finance/charges', { month }),
  invoices: (months = 12) => api.get('/finance/invoices', { months }),
  invoice: (id) => api.get(`/finance/invoices/${id}`),
  payments: (months = 8) => api.get('/finance/payments', { months }),
  usageDetails: (params) => api.get('/finance/usage-details', params),
  topup: (amount_byn, idempotencyKey) => api.post('/finance/topups', { amount_byn }, { headers: { 'Idempotency-Key': idempotencyKey } }),
  analytics: (month, months = 6) => api.get('/analytics', { month, months }),
  favorites: () => api.get('/favorites'),
  addFavorite: (body) => api.post('/favorites', body),
  updateFavorite: (id, body) => api.patch(`/favorites/${id}`, body),
  deleteFavorite: (id) => api.delete(`/favorites/${id}`),
  notifications: (params) => api.get('/notifications', params),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
};
// POST /integrations/payment-webhook is intentionally NOT called from a browser.
