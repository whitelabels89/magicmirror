async function _authFetch(url, options = {}) {
  // 1) Kalau halaman sudah punya authFetch, pakai itu
  if (typeof window !== 'undefined' && typeof window.authFetch === 'function') {
    return window.authFetch(url, options);
  }
  // 2) Fallback: inject token dari Firebase compat (jika ada)
  try {
    const fb = (typeof window !== 'undefined' && window.firebase && window.firebase.auth) ? window.firebase : null;
    if (fb && fb.auth().currentUser) {
      const token = await fb.auth().currentUser.getIdToken(true);
      const headers = Object.assign({}, options.headers || {}, { Authorization: 'Bearer ' + token });
      return fetch(url, Object.assign({}, options, { headers }));
    }
  } catch (e) {
    // biarin jatuh ke fetch biasa
  }
  // 3) Terakhir: fetch biasa (bisa 401 kalau server butuh token)
  return fetch(url, options);
}

export async function getMyPoints() {
  const res = await _authFetch('/api/points/me');
  if (!res.ok) throw new Error('failed to fetch points');
  return res.json();
}

export async function getMyPointLogs({ limit = 10 } = {}) {
  const res = await _authFetch(`/api/points/logs?limit=${limit}`);
  if (!res.ok) throw new Error('failed to fetch point logs');
  return res.json();
}

export function renderPointsWidget({ mountEl, stats }) {
  const el = typeof mountEl === 'string' ? document.querySelector(mountEl) : mountEl;
  if (!el) return;
  const courses = stats.courses || {};
  let breakdown = '';
  for (const cid in courses) {
    breakdown += `<li>${cid}: ${courses[cid]}</li>`;
  }
  el.innerHTML = `
    <div class="points-summary">
      <span class="coin-icon">🪙</span>
      <span class="points-total">${stats.total_points || 0}</span>
    </div>
    <ul class="points-breakdown">${breakdown || '<li>-</li>'}</ul>
    <h4>Riwayat Poin Terbaru</h4>
    <ul class="points-history"></ul>
    <a class="points-more" href="profile-points.html">Lihat semua riwayat</a>
  `;

  window.addEventListener('points:updated', (e) => {
    const detail = e.detail || {};
    if (typeof detail.total_points !== 'undefined') {
      const totalEl = el.querySelector('.points-total');
      if (totalEl) totalEl.textContent = detail.total_points;
    }
    if (detail.added > 0) {
      showToast(detail.added);
    }
  });
}

function showToast(added) {
  const toast = document.createElement('div');
  toast.textContent = `+${added} poin!`;
  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: '#ffd166',
    color: '#000',
    padding: '8px 12px',
    borderRadius: '4px',
    zIndex: 10000,
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
  });
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.5s';
    toast.style.opacity = '0';
  }, 1500);
  setTimeout(() => toast.remove(), 2000);
}
