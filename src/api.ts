export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function migrateLegacyAuthStorage(): void {
  const legacyToken = localStorage.getItem('token');
  const legacyUsername = localStorage.getItem('username');

  if (legacyToken && !sessionStorage.getItem('token')) {
    sessionStorage.setItem('token', legacyToken);
  }
  if (legacyUsername && !sessionStorage.getItem('username')) {
    sessionStorage.setItem('username', legacyUsername);
  }

  if (legacyToken) {
    localStorage.removeItem('token');
  }
  if (legacyUsername) {
    localStorage.removeItem('username');
  }
}

export function getToken(): string | null {
  migrateLegacyAuthStorage();
  return sessionStorage.getItem('token');
}

export function getUsername(): string | null {
  migrateLegacyAuthStorage();
  return sessionStorage.getItem('username');
}

export function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
