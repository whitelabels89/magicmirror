export async function loadSidebar() {
  const ph = document.getElementById('sidebar-placeholder');

  // 1) Inject cached HTML instantly (anti flicker)
  try {
    const cached = localStorage.getItem('sidebar_mod_html_v2');
    if (cached && ph && !document.getElementById('sidebar-container')) {
      ph.outerHTML = cached; // langsung ganti placeholder dengan sidebar utuh
      safeInitSidebar();     // init cepat dari cache
    }
  } catch (_) {}

  // 2) Refresh dari network (update cache, inject jika belum ada)
  try {
    const res = await fetch('/elearn/sidebar-mod.html', { cache: 'no-store' });
    const html = await res.text();
    try { localStorage.setItem('sidebar_mod_html_v2', html); } catch (_) {}

    const hasSidebar = !!document.getElementById('sidebar-container');
    const hasToggle  = !!document.getElementById('sidebar-toggle');
    if (!hasSidebar && ph) {
      // Belum ada sidebar sama sekali → inject fresh
      ph.outerHTML = html;
      safeInitSidebar();
    } else if (hasSidebar && !hasToggle) {
      // Sidebar sudah ada tapi versi cache lama (tidak ada tombol toggle) → replace dengan versi baru
      const target = document.getElementById('sidebar-container');
      if (target) {
        target.outerHTML = html;
      } else if (ph) {
        ph.outerHTML = html;
      }
      safeInitSidebar();
    } else {
      // Sidebar sudah ada & lengkap → cukup re-init ringan
      safeInitSidebar();
    }
  } catch (err) {
    console.error('loadSidebar error:', err);
  }
}

function safeInitSidebar() {
  try { initSidebar(); } catch (e) { console.warn('initSidebar failed:', e); }
}

function initSidebar() {
  highlightActiveSidebarMenu();
  updateMeteorPath();

  const sidebarContainer = document.getElementById('sidebar-container');

  // Moderator link visibility
  ensureModeratorLinkVisibility();
  try { if (window.firebase && firebase.auth) {
    firebase.auth().onAuthStateChanged(function(){ ensureModeratorLinkVisibility(); });
  }} catch(_){}
  try { if (window.parent && window.parent.firebase && window.parent.firebase.auth) {
    window.parent.firebase.auth().onAuthStateChanged(function(){ ensureModeratorLinkVisibility(); });
  }} catch(_){}

  // Short-lived recheck loop (up to ~10s) to catch late backend/session updates
  let __modRechecks = 0;
  const __modTimer = setInterval(() => {
    ensureModeratorLinkVisibility();
    __modRechecks++;
    if (__modRechecks > 20) clearInterval(__modTimer);
  }, 500);

  // Bind toggle dengan guard + retry (kalau tombol telat muncul)
  bindToggleOnce();
  setTimeout(bindToggleOnce, 500);

  // Event delegation: robust trigger detection + guard (bind once)
  const container = document.getElementById('sidebar-container');
  if (container && !container.dataset.submenuBound) {
    container.addEventListener('click', (e) => {
      const target = e.target;
      if (!target) return;

      // Cari calon trigger: elemen dengan data-submenu-toggle ATAU anchor pertama dalam .menu-group
      const trigger = target.closest('[data-submenu-toggle], .menu-group > a, .menu-group .submenu-toggle');
      if (!trigger) return;

      const group = trigger.closest('.menu-group');
      if (!group) return;

      const submenu = group.querySelector('.submenu');
      if (!submenu) return; // kalau tidak ada submenu, biarkan default nav berjalan

      // Jika trigger memang dimaksudkan untuk toggle submenu (bukan link submenu)
      // Kriteria: (1) punya attr data-submenu-toggle, atau (2) href="#" / kosong, atau (3) adalah anchor pertama di group
      const isExplicitToggle = trigger.hasAttribute('data-submenu-toggle');
      const href = trigger.getAttribute('href') || '';
      const isDummyLink = href === '' || href === '#' || href === 'javascript:void(0)';
      const isFirstAnchor = group.querySelector('a') === trigger;

      if (isExplicitToggle || isDummyLink || isFirstAnchor) {
        e.preventDefault();
        if (sidebarContainer?.classList.contains('collapsed')) {
          sidebarContainer.classList.remove('collapsed');
        }

        // Optional: hanya satu submenu terbuka dalam satu waktu
        container.querySelectorAll('.menu-group .submenu.open').forEach(el => {
          if (el !== submenu) el.classList.remove('open');
        });

        submenu.classList.toggle('open');
        group.classList.toggle('open');
        updateMeteorPath();
      }
    }, true);
    container.dataset.submenuBound = '1';
  }

  // Logout (aman, opsional)
  document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/elearn/login.html';
  });
}

function bindToggleOnce() {
  const btn = document.getElementById('sidebar-toggle');
  const sc  = document.getElementById('sidebar-container');
  if (!btn || !sc) return;
  if (btn._bound) return; // jangan dobel
  btn.addEventListener('click', () => {
    sc.classList.toggle('collapsed');
    updateMeteorPath();
  });
  btn._bound = true;
}

function highlightActiveSidebarMenu() {
  // Normalisasi: bandingkan last segment saja
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sidebar-nav a[href]').forEach(link => {
    const href = link.getAttribute('href') || '';
    const last = href.split('/').pop(); // tahan absolute/relative paths
    if (last === current) {
      link.classList.add('active');
      link.closest('.menu-group')?.classList.add('open');
    } else {
      link.classList.remove('active');
    }
  });
}

function updateMeteorPath() {
  const sidebar = document.querySelector('.sidebar');
  const meteor  = document.querySelector('.meteor');
  if (!sidebar || !meteor) return;

  const rect = sidebar.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const radius = 20;

  const path = `
    M-${radius},0 
    h${width + radius * 2} 
    a${radius},${radius} 0 0 1 ${radius},${radius} 
    v${height - radius * 2} 
    a${radius},${radius} 0 0 1 -${radius},${radius} 
    h-${width + radius * 2} 
    a${radius},${radius} 0 0 1 -${radius},-${radius} 
    v-${height - radius * 2} 
    a${radius},${radius} 0 0 1 ${radius},-${radius} 
    z
  `;

  // Kebanyakan browser modern support offsetPath; kalau tidak, langsung skip (no error)
  meteor.style.offsetPath = `path('${path}')`;
  meteor.style.offsetDistance = '0%';

  if (!meteor.animateActive) {
    meteor.animateActive = true;
    meteor.animate([
      { offsetDistance: '0%' },
      { offsetDistance: '100%' }
    ], { duration: 3000, iterations: Infinity });
  }
}

// === Moderator link visibility helpers ===
function _hasModRole_(role){
  if (!role) return false;
  const r = String(role).toLowerCase();
  return r === 'moderator' || r === 'admin';
}
function _readLocalRole_(source){
  try {
    const raw = source.localStorage && source.localStorage.getItem('user');
    if (raw) {
      const u = JSON.parse(raw);
      if (_hasModRole_(u.role)) return true;
      if (_hasModRole_(u?.claims?.role)) return true;
    }
  } catch(_){}
  try {
    const raw2 = source.localStorage && source.localStorage.getItem('USER_INFO');
    if (raw2) {
      const u2 = JSON.parse(raw2);
      if (_hasModRole_(u2.role)) return true;
    }
  } catch(_){}
  try {
    const u3 = source.USER_INFO;
    if (u3 && _hasModRole_(u3.role)) return true;
  } catch(_){}
  return false;
}
function _b64urlToJson_(str){
  try {
    const pad = str.length % 4 === 2 ? '==' : (str.length % 4 === 3 ? '=' : '');
    const s = str.replace(/-/g,'+').replace(/_/g,'/') + pad;
    return JSON.parse(atob(s));
  } catch(_) { return {}; }
}
async function _roleFromFirebase_(source){
  try{
    const fb = source.firebase;
    if (!fb || !fb.auth) return null;
    const u = fb.auth().currentUser;
    if (!u) return null;
    try {
      const tok = await u.getIdTokenResult(true);
      const role = tok?.claims?.role || tok?.claims?.roles || tok?.claims?.Role;
      if (role) return role;
    } catch(_){}
    try {
      const raw = await u.getIdToken(false);
      const payload = raw.split('.')[1];
      const claims = _b64urlToJson_(payload) || {};
      const role2 = claims.role || claims.roles || claims.Role;
      if (role2) return role2;
    } catch(_){}
  }catch(_){}
  return null;
}
async function _roleFromBackend_(source){
  const endpoints = ['/api/auth/me','/api/user/me','/api/profile/me'];
  for (const ep of endpoints){
    try {
      const res = await fetch(ep, { credentials: 'include' });
      if (!res.ok) continue;
      const d = await res.json();
      // Possible shapes: { ok:true, role:'moderator' }, {data:{role:'moderator'}}, {user:{role:'...'}}, flat {role:'...'}
      const role = d?.role || d?.data?.role || d?.user?.role || d?.claims?.role;
      if (role) return role;
    } catch(_){}
  }
  return null;
}
async function ensureModeratorLinkVisibility(){
  const el = document.getElementById('moderator-link');
  if (!el) return; // nothing to toggle
  // 1) Local window sources
  if (_readLocalRole_(window)) { el.style.display = 'flex'; return; }
  // 2) Parent window sources (if sidebar is in iframe)
  if (window.parent && window.parent !== window) {
    try { if (_readLocalRole_(window.parent)) { el.style.display = 'flex'; return; } } catch(_){}
  }
  // 3) Firebase claims
  const r1 = await _roleFromFirebase_(window);
  if (_hasModRole_(r1)) { el.style.display = 'flex'; return; }
  if (window.parent && window.parent !== window) {
    const r2 = await _roleFromFirebase_(window.parent);
    if (_hasModRole_(r2)) { el.style.display = 'flex'; return; }
  }
  // 4) Backend endpoints (final fallback)
  const rb = await _roleFromBackend_(window);
  if (_hasModRole_(rb)) { el.style.display = 'flex'; return; }
}