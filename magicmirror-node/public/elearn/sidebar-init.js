


export async function loadSidebar() {
  const res = await fetch('/elearn/sidebar-mod.html');
  const html = await res.text();
  const container = document.getElementById('sidebar-placeholder');
  container.innerHTML = html;

  // Re-execute any script tags inside the loaded HTML
  const scripts = container.querySelectorAll("script");
  scripts.forEach(oldScript => {
    const newScript = document.createElement("script");
    if (oldScript.src) {
      newScript.src = oldScript.src;
    } else {
      newScript.textContent = oldScript.textContent;
    }
    document.body.appendChild(newScript);
    oldScript.remove();
  });

  initSidebar();
}

function initSidebar() {
  highlightActiveSidebarMenu();
  updateMeteorPath();

  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebarContainer = document.getElementById('sidebar-container');

  if (toggleBtn && sidebarContainer) {
    toggleBtn.addEventListener('click', () => {
      sidebarContainer.classList.toggle('collapsed');
      updateMeteorPath();
    });
  }

  document.querySelectorAll('.menu-group > a').forEach(group => {
    group.addEventListener('click', () => {
      if (sidebarContainer.classList.contains('collapsed')) {
        sidebarContainer.classList.remove('collapsed');
      }
      group.parentElement.classList.toggle('open');
      updateMeteorPath();
    });
  });

  document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/elearn/login.html';
  });
}

function highlightActiveSidebarMenu() {
  const path = window.location.pathname.split('/').pop();
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href === path) {
      link.classList.add('active');
      const group = link.closest('.menu-group');
      if (group) {
        group.classList.add('open');
      }
    } else {
      link.classList.remove('active');
    }
  });
}

function updateMeteorPath() {
  const sidebar = document.querySelector('.sidebar');
  const meteor = document.querySelector('.meteor');
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

  meteor.style.offsetPath = `path('${path}')`;
  meteor.style.offsetDistance = '0%';

  if (!meteor.animateActive) {
    meteor.animateActive = true;
    meteor.animate([
      { offsetDistance: '0%' },
      { offsetDistance: '100%' }
    ], {
      duration: 3000,
      iterations: Infinity
    });
  }
}