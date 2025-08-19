// Backend-driven student profile hydration (keeps existing toggle logic unchanged)
async function authFetchCompat(url, options = {}){
  // 1) Use global authFetch if present
  if (typeof window !== 'undefined' && typeof window.authFetch === 'function') {
    return window.authFetch(url, options);
  }
  // 2) Fallback: Firebase token injection if available
  try {
    const fb = (typeof window !== 'undefined' && window.firebase && window.firebase.auth) ? window.firebase : null;
    if (fb && fb.auth().currentUser) {
      const token = await fb.auth().currentUser.getIdToken(true);
      const headers = Object.assign({}, options.headers || {}, { Authorization: 'Bearer ' + token });
      return fetch(url, Object.assign({}, options, { headers }));
    }
  } catch(_){}
  // 3) Plain fetch
  return fetch(url, options);
}

function setTextSafe(sel, text){
  const el = document.querySelector(sel);
  if (el) el.textContent = text;
}
function setSrcSafe(sel, url){
  const el = document.querySelector(sel);
  if (el && url) el.src = url;
}
function animateProgressTo(percent){
  const bar = document.querySelector('.progress-bar-fill, #pp-barfill');
  const pctEl = document.querySelector('#profile-progress, #pp-pct');
  const T = Math.max(0, Math.min(100, Number(percent)||0));
  let v = 0;
  const step = () => {
    v = Math.min(T, v + 2);
    if (bar) bar.style.width = v + '%';
    if (pctEl) pctEl.textContent = v + '%';
    if (v < T) requestAnimationFrame(step);
  };
  step();
}

async function loadCoins(){
  try{
    const r = await authFetchCompat('/api/points/me');
    const d = await r.json();
    if (d && (d.ok || typeof d.total_points === 'number')){
      const coins = Number(d.total_points || 0);
      setTextSafe('#profile-coin', `🪙 Coin: ${coins}`);
      setTextSafe('#pp-coins', `🪙 Coin: ${coins}`);
      // Estimate progress if backend doesn't provide it
      if (!document.querySelector('#profile-progress') || document.querySelector('#profile-progress')?.textContent === '0%'){
        const sum = Object.values(d.courses || {}).reduce((a,b)=>a+Number(b||0),0);
        const estMax = 500; // heuristic cap
        const pct = Math.round(Math.min(100, (sum/estMax)*100));
        animateProgressTo(pct);
      }
    }
  }catch(e){ /* silent */ }
}

async function loadProfileFromBackend(){
  // Try common profile endpoints; fall back gracefully
  const candidates = ['/api/profile/me','/api/user/me','/api/akun/me'];
  for (const url of candidates){
    try{
      const r = await authFetchCompat(url);
      if (!r.ok) continue;
      const d = await r.json();
      // Support various shapes: {ok:true, data:{...}} or flat object
      const u = d?.data || d || {};
      const name = u.nama || u.name || u.displayName || u.full_name || '';
      const kelas = u.kelas || u.class || u.grade || '';
      const usia  = u.usia  || u.age   || '';
      const avatar = u.avatar || u.photoURL || u.photo_url || '';
      if (name) setTextSafe('#profile-name', name);
      if (kelas) setTextSafe('#profile-class', 'Kelas: ' + kelas);
      if (usia) setTextSafe('#profile-age', 'Usia: ' + usia);
      if (avatar) setSrcSafe('#profile-avatar', avatar);
      // progress if provided
      const p = Number(u.progress || u.progress_pct || 0);
      if (p) animateProgressTo(p);
      return true;
    }catch(_){}
  }
  // Fallback: USER_INFO / Firebase
  try{
    const ui = (window.USER_INFO || JSON.parse(localStorage.getItem('USER_INFO')||'{}')) || {};
    const name = ui.nama || ui.name || ui.displayName;
    const kelas = ui.kelas || ui.class;
    const usia  = ui.usia || ui.age;
    const avatar = ui.avatar || ui.photoURL;
    if (name) setTextSafe('#profile-name', name);
    if (kelas) setTextSafe('#profile-class', 'Kelas: ' + kelas);
    if (usia) setTextSafe('#profile-age', 'Usia: ' + usia);
    if (avatar) setSrcSafe('#profile-avatar', avatar);
    if (typeof ui.progress !== 'undefined') animateProgressTo(ui.progress);
  }catch(_){}
  try{
    const u = window.firebase?.auth?.().currentUser;
    if (u){
      if (u.displayName) setTextSafe('#profile-name', u.displayName);
      if (u.photoURL) setSrcSafe('#profile-avatar', u.photoURL);
    }
  }catch(_){}
}

function initPanelProfile() {
  const panel = document.querySelector('.panel-ungu');
  const btn = document.getElementById('toggle-panel-btn');
  function updateBtnDirection() {
    if (panel.classList.contains('hidden')) {
      btn.innerHTML = '⮞';
    } else {
      btn.innerHTML = '⮜';
    }
  }
  btn.addEventListener('click', () => {
    panel.classList.toggle('hidden');
    updateBtnDirection();
  });
  updateBtnDirection();

  // --- Backend profile hydration (keeps toggle intact) ---
  loadProfileFromBackend();
  loadCoins();
  // Live update coins after claims
  window.addEventListener('points:updated', (e) => {
    const t = e?.detail?.total_points;
    if (typeof t === 'number') {
      setTextSafe('#profile-coin', `🪙 Coin: ${t}`);
      setTextSafe('#pp-coins', `🪙 Coin: ${t}`);
    }
  });
}