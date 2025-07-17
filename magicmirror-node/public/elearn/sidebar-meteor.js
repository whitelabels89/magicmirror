function updateMeteorPath() {
  requestAnimationFrame(() => {
    const sidebar = document.querySelector('.sidebar');
    const meteor = document.querySelector('.meteor');

    if (sidebar && meteor) {
      const rect = sidebar.getBoundingClientRect();
      const height = rect.height - 40;
      const path = `M20,20 H220 A20,20 0 0 1 240,40 V${height} A20,20 0 0 1 220,${height+20} H20 A20,20 0 0 1 0,${height} V40 A20,20 0 0 1 20,20 Z`;
      meteor.style.offsetPath = `path("${path}")`;
      meteor.style.offsetDistance = '0%';
    }
  });
}

function restartMeteorAnimation() {
  const meteor = document.querySelector('.meteor');
  if (meteor) {
    meteor.style.animation = 'none';
    void meteor.offsetWidth; // Force reflow
    meteor.style.animation = 'moveMeteor 4s linear infinite';
  }
}

const sidebarEl = document.querySelector('.sidebar');
if (sidebarEl) {
  const observer = new ResizeObserver(() => {
    updateMeteorPath();
    restartMeteorAnimation();
  });
  observer.observe(sidebarEl);
}

// Highlight active sidebar menu
function highlightActiveSidebarMenu() {
  const currentPath = window.location.pathname.split('/').pop();
  const links = document.querySelectorAll('.sidebar-nav a[href]');
  links.forEach(link => {
    const linkPath = link.getAttribute('href');
    if (currentPath === linkPath) {
      link.classList.add('active');
      const menuGroup = link.closest('.menu-group');
      if (menuGroup) {
        menuGroup.classList.add('open');
      }
    } else {
      link.classList.remove('active');
    }
  });
}

// Sidebar toggle & dropdown setup
function setupSidebarToggle() {
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebarContainer = document.getElementById('sidebar-container');

  if (toggleBtn && sidebarContainer) {
    toggleBtn.addEventListener('click', () => {
      sidebarContainer.classList.toggle('collapsed');
    });
  }

  document.querySelectorAll('.menu-group > a').forEach(group => {
    group.addEventListener('click', () => {
      if (sidebarContainer && sidebarContainer.classList.contains('collapsed')) {
        sidebarContainer.classList.remove('collapsed');
      }
      group.parentElement.classList.toggle('open');
    });
  });
}

function waitForSidebarAndInit() {
  const sidebarReady = () => document.querySelector('.sidebar');

  const interval = setInterval(() => {
    if (sidebarReady()) {
      clearInterval(interval);
      updateMeteorPath();
      restartMeteorAnimation();
      highlightActiveSidebarMenu();
      setupSidebarToggle();
    }
  }, 100);
}

waitForSidebarAndInit();
