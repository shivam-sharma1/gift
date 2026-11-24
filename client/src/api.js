const ORGANIZER_KEY = 'giftwise.organizer';
const WRAP_KEY = 'giftwise.organizer.wrap';
const guestKey = (code) => `giftwise.guest.${code.toUpperCase()}`;
const eventKeyName = (code) => `giftwise.eventkey.${code.toUpperCase()}`;

export const tokens = {
  getOrganizer: () => localStorage.getItem(ORGANIZER_KEY),
  getWrapKey: () => localStorage.getItem(WRAP_KEY),
  setOrganizer: (token, wrapKey) => {
    localStorage.setItem(ORGANIZER_KEY, token);
    localStorage.setItem(WRAP_KEY, wrapKey);
  },
  clearOrganizer: () => {
    localStorage.removeItem(ORGANIZER_KEY);
    localStorage.removeItem(WRAP_KEY);
  },
  getGuest: (code) => localStorage.getItem(guestKey(code)),
  setGuest: (code, token) => localStorage.setItem(guestKey(code), token),
  clearGuest: (code) => localStorage.removeItem(guestKey(code)),
  getEventKey: (code) => localStorage.getItem(eventKeyName(code)),
  setEventKey: (code, key) => localStorage.setItem(eventKeyName(code), key),
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Empty in local dev (the Vite proxy handles /api); the Render URL in production builds.
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const assetUrl = (path) => (path?.startsWith('/api/') ? `${API_URL}${path}` : path);

async function request(method, path, body, token) {
  const isForm = body instanceof FormData;
  const headers = {};
  if (body && !isForm) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    // credentials: the guest cookie must travel to the API on its own origin.
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers,
      credentials: 'include',
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error || 'Something went wrong. Please try again.', res.status);
  return data;
}

const client = (getToken) => ({
  get: (path) => request('GET', path, null, getToken()),
  post: (path, body) => request('POST', path, body ?? {}, getToken()),
  put: (path, body) => request('PUT', path, body, getToken()),
  del: (path) => request('DELETE', path, null, getToken()),
});

export const publicApi = client(() => null);
export const organizerApi = client(tokens.getOrganizer);
export const guestApi = (code) => client(() => tokens.getGuest(code));
