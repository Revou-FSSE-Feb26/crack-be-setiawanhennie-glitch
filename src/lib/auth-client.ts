const API_URL_BASE = 'http://localhost:3001';

export async function fetchUsers() {
  const token = getToken();
  const res = await fetch(`${API_URL_BASE}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Gagal memuat pengguna');
  return res.json();
}

export async function updateUserRole(userId: string, role: 'STUDENT' | 'TEACHER' | 'ADMIN') {
  const token = getToken();
  const res = await fetch(`${API_URL_BASE}/users/${userId}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error('Gagal mengubah role');
  return res.json();
}

export async function toggleUserSuspend(userId: string, suspend: boolean) {
  const token = getToken();
  const res = await fetch(`${API_URL_BASE}/users/${userId}/suspend`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ suspend }),
  });
  if (!res.ok) throw new Error('Gagal mengubah status');
  return res.json();
}

function getToken(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem('token');
  if (stored) return stored;
  return (
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1] ?? ''
  );
}