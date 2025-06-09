let currentUser = null;
let jadwalData = [];

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

  document.getElementById('editorBtn').addEventListener('click', () => {
    window.location.href = '/editor-kelas.html';
  });

  setupNavigation();
  loadJadwal();
  loadProgress();
  loadMuridList();
  loadModulList();
  prepareTemplates();
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
    jadwalData = data;
    renderJadwal(data, hariIniEl, mingguEl);
  } catch (e) {
    const dummy = [
      {id:'CLS1', kelas:'Kelas 1', hari:'Senin', jam:'08:00', modul:'Modul 1'},
      {id:'CLS2', kelas:'Kelas 2', hari:'Selasa', jam:'10:00', modul:'Modul 2'}
    ];
    jadwalData = dummy;
    renderJadwal(dummy, hariIniEl, mingguEl);
  }
  updateNotif();
}

function renderJadwal(data, hariIniEl, mingguEl) {
  hariIniEl.innerHTML = '';
  mingguEl.innerHTML = '';
  const today = new Date().getDay();
  data.forEach(j => {
    const item = document.createElement('div');
    item.className = 'jadwal-item';
    item.title = `Kelas ini dimulai pukul ${j.jam}`;
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

function updateNotif() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  list.innerHTML = '';
  const now = new Date();
  jadwalData.forEach(j => {
    const target = parseTime(j.hari, j.jam);
    if (target && target - now <= 3600000 && target - now > 0) {
      const li = document.createElement('li');
      li.textContent = `Kelas ${j.kelas} mulai jam ${j.jam}`;
      list.appendChild(li);
    }
  });
  if (!list.children.length) list.innerHTML = '<li>Tidak ada pengingat</li>';
}

function parseTime(hari, jam) {
  const map = {'Minggu':0,'Senin':1,'Selasa':2,'Rabu':3,'Kamis':4,'Jumat':5,'Sabtu':6};
  const d = new Date();
  const day = map[hari];
  if (day === undefined) return null;
  d.setDate(d.getDate() + ((day - d.getDay() + 7) % 7));
  const [h,m] = jam.split(':');
  d.setHours(parseInt(h,10), parseInt(m,10),0,0);
  return d;
}

async function loadProgress() {
  const container = document.getElementById('progress-container');
  container.innerHTML = 'Memuat...';
  const filter = document.getElementById('progress-filter');
  try {
    const res = await fetch('/api/get-progress-murid?kelas_id=dummy');
    const data = await res.json();
    renderProgress(data, container);
    if (filter) populateFilter(data, filter);
  } catch (e) {
    const dummy = [
      {nama:'Ani', cid:'1', progress:70, badge:'⭐'},
      {nama:'Budi', cid:'2', progress:40, badge:'🏅'}
    ];
    renderProgress(dummy, container);
    if (filter) populateFilter(dummy, filter);
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

function populateFilter(data, select) {
  select.innerHTML = '<option value="">Semua Kelas</option>';
  const kelas = [...new Set(data.map(d=>d.kelas).filter(Boolean))];
  kelas.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k; opt.textContent = k;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => {
    const val = select.value;
    const filtered = val ? data.filter(d=>d.kelas===val) : data;
    renderProgress(filtered, document.getElementById('progress-container'));
  });
}

async function loadModulList() {
  const select = document.getElementById('modul-select');
  const modul = ['Modul 1','Modul 2','Modul 3'];
  select.innerHTML = modul.map(m=>`<option value="${m}">${m}</option>`).join('');
  const catatan = localStorage.getItem('catatan-'+currentUser.uid);
  if (catatan) {
    try {
      const obj = JSON.parse(catatan);
      if (obj.modul) select.value = obj.modul;
      if (obj.text) document.getElementById('catatan-text').value = obj.text;
    } catch(e){}
  }
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
  localStorage.setItem('catatan-'+currentUser.uid, JSON.stringify({modul, text}));
  try {
    await fetch('/api/save-catatan-modul', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({modul, text, uid:currentUser.uid})
    });
  } catch(e){}
  alert('Catatan tersimpan');
});

window.addEventListener('load', init);

const exportBtn = document.getElementById('export-progress');
if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    const rows = Array.from(document.querySelectorAll('#progress-container .student-item')).map(div => {
      const name = div.querySelector('.student-name').textContent;
      const percent = div.querySelector('.progress-fill').style.width;
      return `${name},${percent}`;
    });
    const csv = 'Nama,Progress\n' + rows.join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'progress.csv';
    a.click();
  });
}

async function initPyodide() {
  if (window.loadPyodide) {
    window.pyodide = await loadPyodide();
  }
}

function prepareLab() {
  const runBtn = document.getElementById('run-code');
  if (!runBtn) return;
  runBtn.addEventListener('click', async () => {
    await initPyodide();
    const code = document.getElementById('lab-code').value;
    const outEl = document.getElementById('lab-output');
    outEl.textContent = 'Menjalankan...';
    try {
      const script = `import sys, io\n_buffer = io.StringIO()\nsys.stdout = _buffer\nsys.stderr = _buffer\n${code}\nsys.stdout = sys.__stdout__\nsys.stderr = sys.__stderr__\n_buffer.getvalue()`;
      const result = await window.pyodide.runPythonAsync(script);
      outEl.textContent = result ?? '';
    } catch(e) {
      outEl.textContent = e;
    }
  });
  document.getElementById('lab-template').addEventListener('change', e => {
    document.getElementById('lab-code').value = e.target.value;
  });
}

function prepareTemplates() {
  const list = document.getElementById('template-list');
  if (!list) return;
  const templates = ['Belajar Python Dasar','Robotik Pemula','Coding Game Level 1'];
  templates.forEach(t => {
    const div = document.createElement('div');
    div.className = 'template-card';
    div.textContent = t;
    div.addEventListener('click', () => alert('Template \''+t+'\' ditambahkan')); 
    list.appendChild(div);
  });
}

function prepareAI() {
  const btn = document.getElementById('ai-run');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const key = document.getElementById('ai-input').value;
    const out = document.getElementById('ai-result');
    out.innerHTML = '<li>Memuat...</li>';
    try {
      const res = await fetch('/api/ai-suggest?keyword='+encodeURIComponent(key));
      const data = await res.json();
      out.innerHTML = data.map(d=>`<li>${d}</li>`).join('');
    } catch(e) {
      out.innerHTML = '<li>Contoh ide: buat quiz singkat, proyek kecil, diskusi kelompok.</li>';
    }
  });
}

function prepareSearch() {
  const btn = document.getElementById('search-run');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const q = document.getElementById('search-input').value;
    const out = document.getElementById('search-result');
    out.innerHTML = `<li><a href="https://www.google.com/search?q=${encodeURIComponent(q)}" target="_blank">Cari di Google</a></li>`;
  });
}

window.addEventListener('load', () => {
  prepareLab();
  prepareAI();
  prepareSearch();
});
