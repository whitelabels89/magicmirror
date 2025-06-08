let currentUser = null;

function init() {
  const user = getUserInfo();
  if (!user || user.role !== 'guru') {
    alert('Akses tidak sah.');
    window.location.href = '/elearn/login-elearning.html';
    return;
  }
  currentUser = user;
  document.getElementById('namaGuru').textContent = user.nama || '';
  document.getElementById('teacherName').textContent = user.nama || 'Guru';

  setupNavigation();
  loadJadwal();
  loadProgress();
  loadMuridList();
  loadModulList();
}

function setupNavigation() {
  const items = document.querySelectorAll('#sidebar-nav li');
  items.forEach(li => {
    li.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('active'));
      li.classList.add('active');
      showSection(li.dataset.section);
    });
  });
}

function showSection(id) {
  document.querySelectorAll('.page-section').forEach(sec => {
    sec.classList.remove('active');
  });
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

async function loadJadwal() {
  const hariIniEl = document.getElementById('jadwal-hari-ini');
  const mingguEl = document.getElementById('jadwal-minggu-ini');
  hariIniEl.innerHTML = 'Memuat...';
  mingguEl.innerHTML = '';
  try {
    const res = await fetch(`/api/get-jadwal-by-uid?uid=${currentUser.uid}`);
    const data = await res.json();
    renderJadwal(data, hariIniEl, mingguEl);
  } catch (e) {
    const dummy = [
      {id:'CLS1', kelas:'Kelas 1', hari:'Senin', jam:'08:00', modul:'Modul 1'},
      {id:'CLS2', kelas:'Kelas 2', hari:'Selasa', jam:'10:00', modul:'Modul 2'}
    ];
    renderJadwal(dummy, hariIniEl, mingguEl);
  }
}

function renderJadwal(data, hariIniEl, mingguEl) {
  hariIniEl.innerHTML = '';
  mingguEl.innerHTML = '';
  const today = new Date().getDay();
  data.forEach(j => {
    const item = document.createElement('div');
    item.className = 'jadwal-item';
    item.innerHTML = `<div><strong>${j.kelas}</strong><br>${j.hari}, ${j.jam}<br>${j.modul}</div>` +
      `<button class="btn" onclick="masukKelas('${j.id}')">Masuk Kelas</button>`;
    if (isToday(j.hari)) hariIniEl.appendChild(item); else mingguEl.appendChild(item);
  });
}

function isToday(hari) {
  const map = {'Minggu':0,'Senin':1,'Selasa':2,'Rabu':3,'Kamis':4,'Jumat':5,'Sabtu':6};
  return map[hari] === new Date().getDay();
}

function masukKelas(id) {
  alert('Masuk ke kelas ' + id);
}

async function loadProgress() {
  const container = document.getElementById('progress-container');
  container.innerHTML = 'Memuat...';
  try {
    const res = await fetch('/api/get-progress-murid?kelas_id=dummy');
    const data = await res.json();
    renderProgress(data, container);
  } catch (e) {
    const dummy = [
      {nama:'Ani', cid:'1', progress:70, badge:'⭐'},
      {nama:'Budi', cid:'2', progress:40, badge:'🏅'}
    ];
    renderProgress(dummy, container);
  }
}

function renderProgress(data, container) {
  container.innerHTML = '';
  data.forEach(m => {
    const div = document.createElement('div');
    div.className = 'student-item';
    div.innerHTML = `
      <span class="student-name">${m.nama}</span>
      <div class="progress-bar"><div class="progress-fill" style="width:${m.progress}%"></div></div>
      <span class="badge">${m.badge}</span>

      <a href="/elearn/murid.html?cid=${m.cid}" class="btn">Modul</a>
      <a href="/elearn/dashboard-murid-style2.html?cid=${m.cid}" class="btn">Dashboard</a>`;
    container.appendChild(div);
  });
}

async function loadModulList() {
  const select = document.getElementById('modul-select');
  select.innerHTML = '<option>Modul 1</option><option>Modul 2</option>';
}

async function loadMuridList() {
  const list = document.getElementById('murid-list');
  list.innerHTML = '';
  const siswa = [
    {nama:'Ani', cid:'1'},
    {nama:'Budi', cid:'2'}
  ];
  siswa.forEach(s => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${s.nama}</span>
      <a href="/elearn/murid.html?cid=${s.cid}" class="btn">Modul</a>
      <a href="/elearn/dashboard-murid-style2.html?cid=${s.cid}" class="btn">Dashboard</a>`;
    list.appendChild(li);
  });
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  firebase.auth().signOut().then(() => {
    localStorage.clear();
    window.location.href = '/elearn/login-elearning.html';
  });
});

document.getElementById('simpan-catatan').addEventListener('click', async () => {
  const modul = document.getElementById('modul-select').value;
  const text = document.getElementById('catatan-text').value;
  await fetch('/api/save-catatan-modul', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({modul, text, uid:currentUser.uid})
  });
  alert('Catatan tersimpan');
});

window.addEventListener('load', init);
