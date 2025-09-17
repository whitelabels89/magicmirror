// Simple Pause Menu overlay with Back to Menu
// Auto-initializes on DOMContentLoaded
(function(){
  if (window.__PAUSE_MENU_INIT__) return; // guard
  window.__PAUSE_MENU_INIT__ = true;

  const BACK_URL = 'https://queensacademy.id/elearn/worlds/calistung/index.html';

  function ensureStyles(){
    if (document.getElementById('pause-menu-style')) return;
    const css = `
    .pm-toggle{position:fixed;left:12px;top:12px;z-index:10050;background:#111827;color:#fff;border:1px solid #243249;border-radius:12px;padding:8px 12px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.25);font-weight:800}
    .pm-toggle:active{transform:translateY(1px)}
    .pm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:saturate(120%) blur(2px);display:none;align-items:center;justify-content:center;z-index:10040}
    .pm-overlay.open{display:flex}
    .pm-panel{min-width:260px;max-width:min(92vw,520px);background:#0f172a;border:1px solid #1f2937;border-radius:16px;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.35)}
    .pm-head{padding:14px 16px;border-bottom:1px solid #1f2937;font-weight:900;letter-spacing:.3px}
    .pm-body{padding:16px;display:flex;flex-direction:column;gap:10px}
    .pm-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;margin-top:6px}
    .pm-btn{appearance:none;border:none;border-radius:12px;padding:10px 14px;font-weight:800;cursor:pointer}
    .pm-btn.primary{background:#22c55e;color:#0b1220}
    .pm-btn.secondary{background:#e2e8f0;color:#0b2942}
    .pm-link{display:inline-flex;align-items:center;gap:8px;text-decoration:none}
    `;
    const st = document.createElement('style');
    st.id = 'pause-menu-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function buildUI(){
    const body = document.body || {};
    const dataset = body.dataset || {};
    const disableToggle = dataset.pauseToggle === 'disabled' || dataset.navBackBehavior === 'pause-menu';

    let tgl = document.getElementById('pmToggle');
    if (disableToggle) {
      if (tgl && tgl.parentNode) {
        tgl.parentNode.removeChild(tgl);
      }
      tgl = null;
    } else if (!tgl) {
      tgl = document.createElement('button');
      tgl.id = 'pmToggle';
      tgl.className = 'pm-toggle';
      tgl.type = 'button';
      tgl.textContent = '⏸ Pause';
      document.body.appendChild(tgl);
    }

    let ov = document.getElementById('pmOverlay');
    if (!ov){
      ov = document.createElement('div');
      ov.id = 'pmOverlay';
      ov.className = 'pm-overlay';
      ov.innerHTML = `
        <div class="pm-panel" role="dialog" aria-modal="true" aria-labelledby="pmTitle">
          <div class="pm-head" id="pmTitle">Paused</div>
          <div class="pm-body">
            <div>Permainan dijeda. Pilih aksi berikut:</div>
            <div class="pm-actions">
              <button class="pm-btn secondary" id="pmResume">Lanjut</button>
              <a class="pm-btn primary pm-link" id="pmBack" href="${BACK_URL}">⬅ Kembali ke Menu</a>
            </div>
          </div>
        </div>`;
      document.body.appendChild(ov);
    }

    const resumeBtn = document.getElementById('pmResume');
    const backBtn = document.getElementById('pmBack');

    const api = window.PauseMenu || {};

    function open(){
      if (ov) {
        ov.classList.add('open');
      }
    }

    function close(){
      if (ov) {
        ov.classList.remove('open');
      }
    }

    function toggle(){
      if (!ov) {
        return;
      }
      if (ov.classList.contains('open')) {
        close();
      } else {
        open();
      }
    }

    api.open = open;
    api.close = close;
    api.toggle = toggle;
    api.isOpen = function () {
      return !!(ov && ov.classList.contains('open'));
    };
    window.PauseMenu = api;

    if (tgl) {
      tgl.onclick = open;
    }
    if (resumeBtn) {
      resumeBtn.onclick = close;
    }
    if (backBtn) {
      backBtn.addEventListener('click', close);
    }
    if (ov) {
      ov.addEventListener('click', (e)=>{ if (e.target === ov) close(); });
    }
    document.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape') {
        close();
      } else if (e.key && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        toggle();
      }
    });
  }

  window.addEventListener('DOMContentLoaded', function(){
    try{
      ensureStyles();
      buildUI();
    }catch(e){ console.warn('[pause-menu] init failed', e); }
  });
})();
