import { getCompletedLocal } from '/elearn/worlds/utils/progress.js';
// Reusable world map renderer
export async function initWorld({ rootSelector = '#worldRoot', configPath }) {
  const root = document.querySelector(rootSelector);
  if (!root) throw new Error('world root not found');

  const cfgRes = await fetch(configPath);
  const cfg = await cfgRes.json();

  // === Normalize config schema (supports new and legacy) ===
  const meta = cfg.meta || {
    id: cfg.id || 'unknown-world',
    name: cfg.title || 'World',
    background: (cfg.map && (cfg.map.background || cfg.map.image)) || cfg.background || ''
  };
  const nodes = Array.isArray(cfg.nodes) ? cfg.nodes : (Array.isArray(cfg.map?.nodes) ? cfg.map.nodes : []);
  const routes = cfg.routes || cfg.map?.routes || {};
  const unlockRules = cfg.unlockRules || cfg.map?.unlockRules || [];
  const rewards = cfg.rewards || cfg.map?.rewards || null;
  // Helper: format position (accept number as %) or string '12%'
  const fmtPos = v => (typeof v === 'number' ? `${v}%` : v);
  // === End normalize ===

  root.innerHTML = `
    <div class="world-topbar">
      <a href="/elearn/worlds/calistung/index.html">⟵ Kembali</a>
      <h2>${meta.name || 'World'}</h2>
      <div></div>
    </div>
    <div class="map-container">
      <img class="world-map" src="${meta.background || ''}" alt="${meta.name || 'World'}">
      <div class="arrow-flow" style="left:0;top:0"></div>
    </div>
  `;

  const map = root.querySelector('.map-container');

  // --- Layout helpers: prevent overlapping nodes ---
  function parsePercent(v){
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v.trim().endsWith('%')) return parseFloat(v);
    return parseFloat(v) || 0;
  }
  function resolveOverlaps(parent, nodeEls, minDistPx = 64, iterations = 120){
    const pr = parent.getBoundingClientRect();
    const pad = 22; // keep inside map edges
    const nodesPos = nodeEls.map(el => {
      const leftP = parsePercent(el.style.left);
      const topP  = parsePercent(el.style.top);
      return { el, x: pr.width * leftP / 100, y: pr.height * topP / 100 };
    });
    for (let it=0; it<iterations; it++){
      let moved = false;
      for (let i=0;i<nodesPos.length;i++){
        for (let j=i+1;j<nodesPos.length;j++){
          const a = nodesPos[i], b = nodesPos[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.0001;
          if (d < minDistPx){
            const overlap = (minDistPx - d) / 2;
            dx /= d; dy /= d;
            a.x -= dx*overlap; a.y -= dy*overlap;
            b.x += dx*overlap; b.y += dy*overlap;
            moved = true;
          }
        }
        // clamp to bounds
        const a = nodesPos[i];
        a.x = Math.min(pr.width - pad, Math.max(pad, a.x));
        a.y = Math.min(pr.height - pad, Math.max(pad, a.y));
      }
      if (!moved) break;
    }
    // write back to percent
    nodesPos.forEach(p => {
      p.el.style.left = (p.x / pr.width * 100) + '%';
      p.el.style.top  = (p.y / pr.height * 100) + '%';
    });
  }
  // --- end helpers ---

  // Render nodes (guard if none)
  if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
    console.warn('[world] nodes missing in config', cfg);
  }
  (nodes || []).forEach(n => {
    const el = document.createElement('div');
    el.className = 'map-node';
    el.style.left = fmtPos(n.x);
    el.style.top = fmtPos(n.y);
    el.dataset.label = n.label;
    el.innerHTML = `
      <img class="node-icon" src="/elearn/img/map/${n.type==='finish'?'icon-finish':n.type==='boss'?'icon-boss':'icon-lesson'}.png"/>
      <span>${n.label}</span>
    `;
    // lock check (simple; replace with Firestore logic)
    const rules = unlockRules?.filter(r => r.target === n.label) || [];
    const completed = getCompletedLocal(meta.id || 'unknown-world');
    const unlocked = rules.every(r => r.requires.every(req => completed.includes(req)));
    if (!unlocked && rules.length) {
      const lock = document.createElement('div');
      lock.className = 'lock-node';
      lock.style.left = fmtPos(n.x);
      lock.style.top = fmtPos(n.y);
      map.appendChild(lock);
      el.style.pointerEvents = 'none';
      el.style.filter = 'grayscale(0.8) opacity(0.8)';
    }

    el.addEventListener('click', async (event) => {
      event.preventDefault();
      const url = routes[n.label] || n.entry;
      if (!url) {
        alert('Level belum tersedia.');
        return;
      }
      try {
        const confirmed = await ensureWhatsappBeforeLevel({
          levelLabel: n.label,
          worldName: meta.name || 'World'
        });
        if (!confirmed) return;
      } catch (err) {
        console.warn('[world] gagal memastikan nomor WhatsApp:', err);
        const proceed = window.confirm('Tidak bisa memastikan nomor WhatsApp. Lanjutkan ke level?');
        if (!proceed) return;
      }
      if (window.CalistungMusic && typeof window.CalistungMusic.prepareNextTrack === 'function') {
        window.CalistungMusic.prepareNextTrack('level');
      }
      window.location = url;
    });

    map.appendChild(el);
  });

  // Optional badge nodes
  if (rewards) {
    Object.keys(rewards).forEach(lbl => {
      const nd = (nodes || []).find(n => n.label === lbl);
      if (!nd) return;
      const b = document.createElement('div');
      b.className = 'badge-node';
      b.style.left = fmtPos(nd.x);
      b.style.top = fmtPos(nd.y);
      map.appendChild(b);
    });
  }

  // Layout & arrow animation after background is fully measured
  const arrow = root.querySelector('.arrow-flow');
  const bgImg = root.querySelector('.world-map');
  const runLayout = () => {
    const nodeEls = Array.from(map.querySelectorAll('.map-node'));
    if (nodeEls.length){
      resolveOverlaps(map, nodeEls, 66, 150); // spread nodes ~66px apart
      if (nodeEls.length >= 2) animateArrow(arrow, nodeEls, map);
    }
  };
  if (bgImg && !bgImg.complete) bgImg.addEventListener('load', runLayout, { once:true });
  else runLayout();
}

function getCenter(el, parent) {
  const r = el.getBoundingClientRect();
  const p = parent.getBoundingClientRect();
  return { x: r.left + r.width/2 - p.left, y: r.top + r.height/2 - p.top };
}

function animateArrow(arrow, nodes, parent) {
  let idx = 0;
  function step() {
    const from = getCenter(nodes[idx], parent);
    const to = getCenter(nodes[(idx+1)%nodes.length], parent);
    let t = 0;
    function loop() {
      t += 0.015;
      if (t>1) t = 1;
      arrow.style.left = (from.x + (to.x - from.x)*t) + 'px';
      arrow.style.top  = (from.y + (to.y - from.y)*t) + 'px';
      if (t < 1) requestAnimationFrame(loop);
      else { idx=(idx+1)%nodes.length; setTimeout(step, 300); }
    }
    loop();
  }
  step();
}

async function ensureWhatsappBeforeLevel({ levelLabel = 'ini', worldName = 'World' } = {}) {
  const store = getWhatsappStore();
  if (!store) return true;

  let number = safeCall(() => store.get());
  if (!number) {
    number = await promptWhatsappNumber(store, {
      message: `Masukkan nomor WhatsApp aktif untuk menerima hasil dari level ${levelLabel}.`
    });
    if (!number) return false;
  }

  const display = safeCall(() => store.format(number)) || number;
  const action = await showWhatsappConfirmModal({
    levelLabel,
    worldName,
    numberDisplay: display
  });

  if (action === 'confirm') {
    return true;
  }
  if (action === 'edit') {
    const updated = await promptWhatsappNumber(store, {
      message: 'Nomor WhatsApp mana yang mau menerima hasil belajar?',
      initialNumber: number
    });
    return Boolean(updated);
  }
  return false;
}

function safeCall(fn) {
  try {
    return fn();
  } catch (_) {
    return '';
  }
}

function getWhatsappStore() {
  const api = window.CalistungWhatsApp;
  if (api && typeof api.getNumber === 'function') {
    return {
      get: () => api.getNumber() || '',
      set: (raw) => {
        if (typeof api.setNumber === 'function') return api.setNumber(raw) || '';
        return '';
      },
      format: (value) => {
        if (typeof api.formatDisplay === 'function') return api.formatDisplay(value) || '';
        return defaultFormatWhatsapp(value);
      }
    };
  }

  const STORAGE_KEYS = ['calistung_whatsapp', 'qa_whatsapp', 'whatsapp'];

  const read = () => {
    const values = [];
    STORAGE_KEYS.forEach((key) => {
      try {
        const val = localStorage.getItem(key);
        if (val) values.push(val);
      } catch (_) {}
      try {
        const val = sessionStorage.getItem(key);
        if (val) values.push(val);
      } catch (_) {}
    });
    for (const val of values) {
      const norm = normalizeWhatsapp(val);
      if (norm) return norm;
    }
    return '';
  };

  const write = (raw) => {
    const norm = normalizeWhatsapp(raw);
    if (!norm) return '';
    STORAGE_KEYS.forEach((key) => {
      try {
        localStorage.setItem(key, norm);
      } catch (_) {}
      try {
        sessionStorage.setItem(key, norm);
      } catch (_) {}
    });
    return norm;
  };

  return {
    get: read,
    set: write,
    format: defaultFormatWhatsapp
  };
}

function normalizeWhatsapp(raw) {
  try {
    let digits = String(raw || '').trim();
    if (!digits) return '';
    digits = digits.replace(/[^0-9+]/g, '');
    if (!digits) return '';
    if (digits.startsWith('+')) digits = digits.slice(1);
    if (digits.startsWith('62')) {
      digits = '62' + digits.slice(2);
    } else if (digits.startsWith('0')) {
      digits = '62' + digits.slice(1);
    } else if (digits.startsWith('8')) {
      digits = '62' + digits;
    }
    if (digits.length < 10 || digits.length > 15) return '';
    return digits;
  } catch (_) {
    return '';
  }
}

function defaultFormatWhatsapp(value) {
  const digits = normalizeWhatsapp(value);
  if (!digits) return '';
  if (digits.startsWith('62') && digits.length > 2) {
    return '0' + digits.slice(2);
  }
  return digits;
}

function ensureWhatsappModalStyles() {
  const STYLE_ID = 'wa-level-confirm-style';
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .wa-confirm-scroll-lock { overflow: hidden !important; touch-action: none; }
    .wa-confirm-overlay { position: fixed; inset: 0; z-index: 12000; background: rgba(15,23,42,0.72); display: flex; align-items: center; justify-content: center; padding: 20px; }
    .wa-confirm-modal { width: min(420px, 92vw); border-radius: 18px; background: #ffffff; box-shadow: 0 24px 60px rgba(15,23,42,0.35); font-family: 'Baloo 2', 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; padding: 26px 28px 24px; display: flex; flex-direction: column; gap: 18px; }
    .wa-confirm-modal header h3 { margin: 0 0 6px; font-size: 1.45rem; }
    .wa-confirm-modal header p { margin: 0; color: #475569; font-size: 0.98rem; }
    .wa-confirm-number { font-size: 1.6rem; font-weight: 700; letter-spacing: 0.04em; text-align: center; padding: 14px; border-radius: 16px; background: #f8fafc; border: 2px dashed #dbeafe; color: #1d4ed8; }
    .wa-confirm-actions { display: flex; flex-direction: column; gap: 10px; }
    .wa-btn-primary, .wa-btn-secondary { border-radius: 999px; border: none; font-weight: 700; padding: 12px 18px; cursor: pointer; transition: transform .08s ease, box-shadow .24s ease, filter .16s ease; font-size: 1rem; }
    .wa-btn-primary { background: linear-gradient(135deg,#6366f1,#8b5cf6); color: #fff; box-shadow: 0 12px 30px rgba(99,102,241,0.35); }
    .wa-btn-primary:active { transform: translateY(1px); box-shadow: 0 8px 22px rgba(99,102,241,0.32); }
    .wa-btn-secondary { background: #e2e8f0; color: #0f172a; box-shadow: 0 10px 24px rgba(148,163,184,0.28); }
    .wa-btn-secondary:active { transform: translateY(1px); box-shadow: 0 6px 18px rgba(148,163,184,0.24); }
    .wa-input-group { display: flex; flex-direction: column; gap: 8px; }
    .wa-input-group label { font-weight: 700; font-size: 0.98rem; color: #1e293b; }
    .wa-input { padding: 12px 14px; border-radius: 12px; border: 2px solid #cbd5f5; font-size: 1.05rem; font-weight: 600; background: #f8fafc; color: #0f172a; }
    .wa-input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.22); }
    .wa-error { color: #dc2626; font-size: 0.9rem; min-height: 1.1rem; }
    .wa-confirm-actions-row { display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
  `;
  document.head.appendChild(style);
}

function showWhatsappConfirmModal({ numberDisplay, levelLabel, worldName }) {
  ensureWhatsappModalStyles();
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'wa-confirm-overlay';
    overlay.innerHTML = `
      <div class="wa-confirm-modal" role="dialog" aria-modal="true" aria-label="Konfirmasi nomor WhatsApp">
        <header>
          <h3>Nomor WhatsApp sudah benar?</h3>
          <p>Hasil belajar untuk level ${levelLabel || 'ini'} di ${worldName || 'world'} akan dikirim ke nomor berikut.</p>
        </header>
        <div class="wa-confirm-number">${numberDisplay || 'Belum diisi'}</div>
        <div class="wa-confirm-actions">
          <button type="button" class="wa-btn-primary" data-action="confirm">Ya, Benar</button>
          <button type="button" class="wa-btn-secondary" data-action="edit">Nomor Tidak Sesuai</button>
        </div>
      </div>
    `;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.classList.add('wa-confirm-scroll-lock');
    body.appendChild(overlay);

    const cleanup = () => {
      body.classList.remove('wa-confirm-scroll-lock');
      if (!prevOverflow) body.style.removeProperty('overflow');
      overlay.remove();
      document.removeEventListener('keydown', onKeyDown);
    };

    const onKeyDown = (evt) => {
      if (evt.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    };

    overlay.addEventListener('click', (evt) => {
      if (evt.target === overlay) {
        cleanup();
        resolve(null);
      }
    });

    overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => {
      cleanup();
      resolve('confirm');
    });
    overlay.querySelector('[data-action="edit"]').addEventListener('click', () => {
      cleanup();
      resolve('edit');
    });

    document.addEventListener('keydown', onKeyDown);
  });
}

function promptWhatsappNumber(store, { message, initialNumber } = {}) {
  ensureWhatsappModalStyles();
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'wa-confirm-overlay';
    const initialDisplay = safeCall(() => store.format(initialNumber)) || '';
    overlay.innerHTML = `
      <div class="wa-confirm-modal" role="dialog" aria-modal="true" aria-label="Masukkan nomor WhatsApp">
        <header>
          <h3>Masukkan Nomor WhatsApp</h3>
          <p>${message || 'Nomor ini akan menerima laporan hasil belajar.'}</p>
        </header>
        <form class="wa-input-form">
          <div class="wa-input-group">
            <label for="waNumberInput">Nomor WhatsApp aktif</label>
            <input id="waNumberInput" class="wa-input" type="tel" inputmode="tel" autocomplete="tel" placeholder="Contoh: 081234567890" value="${initialDisplay || ''}" required />
          </div>
          <div class="wa-error" id="waInputError"></div>
          <div class="wa-confirm-actions-row">
            <button type="button" class="wa-btn-secondary" data-action="cancel">Batal</button>
            <button type="submit" class="wa-btn-primary">Simpan Nomor</button>
          </div>
        </form>
      </div>
    `;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.classList.add('wa-confirm-scroll-lock');
    body.appendChild(overlay);

    const form = overlay.querySelector('form');
    const input = overlay.querySelector('#waNumberInput');
    const errorEl = overlay.querySelector('#waInputError');

    const cleanup = () => {
      body.classList.remove('wa-confirm-scroll-lock');
      if (!prevOverflow) body.style.removeProperty('overflow');
      overlay.remove();
      document.removeEventListener('keydown', onKeyDown);
    };

    const onKeyDown = (evt) => {
      if (evt.key === 'Escape') {
        cleanup();
        resolve('');
      }
    };

    overlay.addEventListener('click', (evt) => {
      if (evt.target === overlay) {
        cleanup();
        resolve('');
      }
    });

    overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      cleanup();
      resolve('');
    });

    form.addEventListener('submit', (evt) => {
      evt.preventDefault();
      const raw = input.value;
      const saved = safeCall(() => store.set(raw)) || '';
      if (!saved) {
        if (errorEl) errorEl.textContent = 'Nomor WhatsApp tidak valid. Gunakan format 08xxxxxxxxxx.';
        input.focus();
        return;
      }
      cleanup();
      resolve(saved);
    });

    if (input) {
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }, 60);
    }

    document.addEventListener('keydown', onKeyDown);
  });
}
