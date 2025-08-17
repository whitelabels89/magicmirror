


export async function loadSidebar() {
  const ph = document.getElementById('sidebar-placeholder');

  // 1) Inject cached HTML instantly (anti flicker)
  try {
    const cached = localStorage.getItem('sidebar_mod_html_v1');
    if (cached && ph && !document.getElementById('sidebar-container')) {
      ph.outerHTML = cached; // langsung ganti placeholder dengan sidebar utuh
      safeInitSidebar();     // init cepat dari cache
    }
  } catch (_) {}

  // 2) Refresh dari network (update cache, inject jika belum ada)
  try {
    const res = await fetch('/elearn/sidebar-mod.html', { cache: 'no-store' });
    const html = await res.text();
    try { localStorage.setItem('sidebar_mod_html_v1', html); } catch (_) {}

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

  // Bind toggle dengan guard + retry (kalau tombol telat muncul)
  bindToggleOnce();
  setTimeout(bindToggleOnce, 500);

  // Event delegation: cegah double binding pada .menu-group > a
  document.querySelector('#sidebar-container')?.addEventListener('click', (e) => {
    const a = e.target.closest('.menu-group > a');
    if (!a) return;
    e.preventDefault();
    if (sidebarContainer?.classList.contains('collapsed')) {
      sidebarContainer.classList.remove('collapsed');
    }
    a.parentElement.classList.toggle('open');
    updateMeteorPath();
  });

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