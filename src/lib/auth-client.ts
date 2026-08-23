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

export async function fetchModerationStats() {
  const token = getToken();
  const res = await fetch(`${API_URL_BASE}/moderation/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Gagal memuat statistik moderasi');
  return res.json();
}

export async function fetchOpenReports() {
  const token = getToken();
  const res = await fetch(`${API_URL_BASE}/moderation/reports`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Gagal memuat laporan');
  return res.json();
}

export async function fetchModerationHistory() {
  const token = getToken();
  const res = await fetch(`${API_URL_BASE}/moderation/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Gagal memuat riwayat');
  return res.json();
}

export async function resolveReport(
  reportId: string,
  action: 'IGNORED' | 'CONTENT_HIDDEN' | 'USER_SUSPENDED'
) {
  const token = getToken();
  const res = await fetch(`${API_URL_BASE}/moderation/reports/${reportId}/resolve`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error('Gagal menyelesaikan laporan');
  return res.json();
}
function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

