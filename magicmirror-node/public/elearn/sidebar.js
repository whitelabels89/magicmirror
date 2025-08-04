function loadSidebar() {
  fetch('/elearn/sidebar.html')
    .then(res => res.text())
    .then(html => {
      const container = document.getElementById('sidebar-container');
      if (container) {
        container.innerHTML = html;
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.add('collapsed');
        adjustSidebarByRole();
      }
    });
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.toggle('collapsed');
}

function toggleSubmenu(id) {
  const submenu = document.getElementById(id);
  if (submenu) {
    submenu.style.display = submenu.style.display === 'flex' ? 'none' : 'flex';
  }
}

function handleLogout() {
  firebase.auth().signOut().then(() => {
    sessionStorage.clear();
    window.location.href = '/elearn/login.html';
  }).catch(() => {
    alert('❌ Gagal logout. Coba lagi.');
  });
}

function adjustSidebarByRole() {
  if (typeof getUserInfo !== 'function') return;
  const user = getUserInfo();
  // Currently no role-based adjustments needed
}

document.addEventListener('DOMContentLoaded', loadSidebar);
