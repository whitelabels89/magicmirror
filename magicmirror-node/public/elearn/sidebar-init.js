


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