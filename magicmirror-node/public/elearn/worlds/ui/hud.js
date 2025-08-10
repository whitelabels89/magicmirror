// HUD (Heads-Up Display) for Worlds — Calistung and others
// Feature set (MVP):
// - Read/write localStorage for progress, coins, badges, equip (inventory)
// - Toggle a top panel to show Inventory / Skills / Badges / Progress (placeholder UIs)
// - Safe to import even if markup is not present (no-op guards)

const DEFAULT_STATE = {
  completed: [], // ["Level 1", ...]
  percent: 0,
  coins: 0,
  badges: [], // ["reader-bronze", ...]
  equip: { head: null, body: null, hand: null, pet: null } // simple example
};

const STORAGE_KEY = (worldId) => `progress:${worldId}`;

function safeParse(json, fallback) {
  try { return JSON.parse(json); } catch { return fallback; }
}

function getState(worldId) {
  const raw = localStorage.getItem(STORAGE_KEY(worldId));
  const base = raw ? safeParse(raw, {}) : {};
  // merge with defaults without losing existing keys
  const merged = {
    ...DEFAULT_STATE,
    ...base,
    badges: Array.isArray(base.badges) ? base.badges : [],
    completed: Array.isArray(base.completed) ? base.completed : [],
    equip: { ...DEFAULT_STATE.equip, ...(base.equip || {}) }
  };
  // ensure percent is consistent if possible
  if (merged.completed && typeof merged.percent !== 'number') merged.percent = 0;
  return merged;
}

function setState(worldId, data) {
  localStorage.setItem(STORAGE_KEY(worldId), JSON.stringify(data));
}

export function getCoins(worldId) {
  return getState(worldId).coins || 0;
}

export function addCoins(worldId, amount) {
  const st = getState(worldId);
  st.coins = Math.max(0, (st.coins || 0) + (Number(amount) || 0));
  setState(worldId, st);
  updateHudSummary(worldId);
  return st.coins;
}

export function awardBadge(worldId, badgeId) {
  const st = getState(worldId);
  if (!st.badges.includes(badgeId)) st.badges.push(badgeId);
  setState(worldId, st);
  if (currentPanel === 'badges') renderBadges(worldId);
}

export function setEquip(worldId, slot, itemId) {
  const st = getState(worldId);
  if (!st.equip) st.equip = { ...DEFAULT_STATE.equip };
  st.equip[slot] = itemId;
  setState(worldId, st);
  if (currentPanel === 'inventory') renderInventory(worldId);
}

// Optional helpers if you want to sync percent to completed
export function setPercent(worldId, percent) {
  const st = getState(worldId);
  st.percent = Math.max(0, Math.min(100, Number(percent) || 0));
  setState(worldId, st);
  if (currentPanel === 'progress') renderProgress(worldId);
}

let currentPanel = null; // 'inventory' | 'skills' | 'badges' | 'progress' | null
function log(...args){ try{ console.debug('[HUD]', ...args);}catch{} }

export function initHud({ worldId, selectors = {} } = {}) {
  // Fallback worldId if not provided
  if (!worldId) {
    worldId = document.body?.dataset?.worldId || 'calistung';
  }
  const bar = document.querySelector(selectors.bar || '.hud-bar');
  const panel = document.querySelector(selectors.panel || '#hudPanel');
  log('bind UI', { bar: !!bar, panel: !!panel, worldId });
  // If markup is missing, do nothing but keep API functional
  if (!bar || !panel) {
    console.warn('[HUD] Markup not found (.hud-bar / #hudPanel). Skipping UI binding.');
    return;
  }

  // Wire buttons
  bar.querySelectorAll('.hud-btn[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.panel;
      togglePanel(worldId, type);
    });
  });

  // Update summary numbers/images
  updateHudSummary(worldId);

  // Auto-open default panel once to verify visibility
  setTimeout(() => {
    try { togglePanel(worldId, 'inventory'); } catch(e) { console.warn('[HUD] auto-open failed', e); }
  }, 0);

  // Robust event delegation (works even if buttons are re-rendered)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.hud-btn[data-panel]');
    if (!btn) return;
    const type = btn.dataset.panel;
    togglePanel(worldId, type);
  });

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (!panel.classList.contains('open')) return;
    const isInside = panel.contains(e.target) || bar.contains(e.target);
    if (!isInside) closePanel();
  });
}

function updateHudSummary(worldId) {
  const coinsEl = document.getElementById('hudCoins');
  if (coinsEl) coinsEl.textContent = String(getCoins(worldId));
  const avatar = document.getElementById('hudAvatar');
  if (avatar && !avatar.getAttribute('src')) {
    avatar.src = '/elearn/worlds/assets/default-avatar.png'; // safe default path
  }
}

function togglePanel(worldId, type) {
  const panel = document.getElementById('hudPanel');
  if (!panel) return;
  if (currentPanel === type) {
    closePanel();
    return;
  }
  currentPanel = type;
  panel.classList.add('open');
  panel.classList.add('centered');
  // Force-set clay background at runtime (override any conflicting CSS)
  // Removed: panel.classList.add('skin-clay');
  panel.style.setProperty('background', 'none', 'important');
  // Keep only non-frame/transparent backgrounds (remove wooden/metal frame assets)
  //panel.style.setProperty('background-image', "url('/elearn/worlds/assets/hud-panel-bg.png')", 'important');
  //panel.style.setProperty('background-repeat', 'no-repeat', 'important');
  //panel.style.setProperty('background-position', 'center', 'important');
  //panel.style.setProperty('background-size', '100% 100%', 'important');
  //panel.style.setProperty('min-height', panel.style.minHeight || '260px', 'important');
  //panel.style.setProperty('opacity', '1', 'important');
  //panel.style.setProperty('pointer-events', 'auto', 'important');
  //panel.style.setProperty('z-index', '9999', 'important');
  console.debug('[HUD] clay bg forced with !important');
  if (type === 'inventory') renderInventory(worldId);
  else if (type === 'skills') renderSkills(worldId);
  else if (type === 'badges') renderBadges(worldId);
  else if (type === 'progress') renderProgress(worldId);
}

function closePanel() {
  const panel = document.getElementById('hudPanel');
  if (!panel) return;
  panel.classList.remove('open');
  panel.innerHTML = '';
  currentPanel = null;
}

// ===== Renderers =====
function renderInventory(worldId) {
  const panel = document.getElementById('hudPanel');
  if (!panel) return;
  const st = getState(worldId);
  const items = getCatalog();
  const equip = st.equip || DEFAULT_STATE.equip;

  panel.innerHTML = `
    <div class="hud-panel__wrap">
      <h3>🎒 Inventory</h3>
      <div class="equip-grid">
        ${['head','body','hand','pet'].map(slot => `
          <div class="slot">
            <div class="slot-title">${slot.toUpperCase()}</div>
            <div class="slot-current">${equip[slot] ? icon(items[equip[slot]]?.icon) + label(items[equip[slot]]?.name) : '<em>empty</em>'}</div>
            <div class="slot-items">
              ${Object.entries(items).filter(([id,i])=>i.slot===slot).map(([id,i])=>`
                <button class="item" data-equip-slot="${slot}" data-item-id="${id}">
                  ${icon(i.icon)}
                  <span>${i.name}</span>
                </button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;

  // Equip handlers
  panel.querySelectorAll('[data-equip-slot]').forEach(btn => {
    btn.addEventListener('click', () => {
      const slot = btn.getAttribute('data-equip-slot');
      const id = btn.getAttribute('data-item-id');
      setEquip(worldId, slot, id);
    });
  });
}

function renderSkills(worldId) {
  const panel = document.getElementById('hudPanel');
  if (!panel) return;
  const st = getState(worldId);
  // Placeholder skill tree
  panel.innerHTML = `
    <div class="hud-panel__wrap">
      <h3>🧠 Skills (placeholder)</h3>
      <ul>
        <li>Literacy I ${check(st.completed.length >= 3)}</li>
        <li>Math Basics ${check(st.completed.length >= 6)}</li>
        <li>Shape Master ${check(st.completed.length >= 9)}</li>
      </ul>
    </div>`;
}

function renderBadges(worldId) {
  const panel = document.getElementById('hudPanel');
  if (!panel) return;
  const st = getState(worldId);
  panel.innerHTML = `
    <div class="hud-panel__wrap">
      <h3>🏅 Badges</h3>
      <div class="badge-grid">
        ${(st.badges && st.badges.length) ? st.badges.map(b=>`<div class="badge">${b}</div>`).join('') : '<em>belum ada badge</em>'}
      </div>
      <div style="margin-top:12px"><button id="btnFakeBadge">+ Test Badge</button></div>
    </div>`;
  const btn = panel.querySelector('#btnFakeBadge');
  if (btn) btn.addEventListener('click', ()=>{
    awardBadge(worldId, 'demo-badge');
  });
}

function renderProgress(worldId) {
  const panel = document.getElementById('hudPanel');
  if (!panel) return;
  const st = getState(worldId);
  panel.innerHTML = `
    <div class="hud-panel__wrap">
      <h3>📈 Progress</h3>
      <p>Completed: ${st.completed?.length || 0} levels</p>
      <p>Percent: ${st.percent || 0}%</p>
      <p>Coins: ${st.coins || 0}</p>
      <div style="margin-top:12px"><button id="btnAdd10">+10 Coins</button></div>
    </div>`;
  const btn = panel.querySelector('#btnAdd10');
  if (btn) btn.addEventListener('click', ()=> addCoins(worldId, 10));
}

// ===== Catalog & tiny helpers =====
function getCatalog(){
  // Simple static catalog; later you can fetch from /assets/catalog.json
  return {
    cap_blue:  { slot:'head', name:'Blue Cap',  icon:'🧢' },
    crown:     { slot:'head', name:'Crown',     icon:'👑' },
    cape_red:  { slot:'body', name:'Red Cape',  icon:'🦸' },
    tshirt:    { slot:'body', name:'T-Shirt',   icon:'👕' },
    wand:      { slot:'hand', name:'Magic Wand',icon:'🪄' },
    pencil:    { slot:'hand', name:'Pencil',    icon:'✏️' },
    kitty:     { slot:'pet',  name:'Kitty',     icon:'🐱' },
    robo:      { slot:'pet',  name:'Mini Bot',  icon:'🤖' }
  };
}

function icon(s){ return `<span class="ico">${s || ''}</span>`; }
function label(s){ return `<span class="lbl">${s || ''}</span>`; }
function check(ok){ return ok ? '✅' : '🔒'; }

// Minimal inline styles injection (only if needed)
(function ensureHudStyles(){
  if (document.getElementById('hud-inline-style')) return;
  const css = `
  .hud-panel{position:fixed;left:0;right:0;max-height:52vh;overflow:auto;color:#fff;border-top:1px solid #1f2937;border-bottom:1px solid #1f2937;transform:translateY(-10px);opacity:0;pointer-events:none;transition:.2s;z-index:70}
  .hud-panel:not(.skin-clay){background:#0f172a}
  .hud-panel.open{transform:translateY(0);opacity:1;pointer-events:auto}
  .hud-panel__wrap{padding:16px}
  .equip-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
  .slot{background:#111827;border:1px solid #1f2937;border-radius:12px;padding:12px}
  .slot-title{font-weight:800;margin-bottom:6px}
  .slot-current{margin-bottom:8px;display:flex;gap:6px;align-items:center}
  .slot-items{display:flex;flex-wrap:wrap;gap:8px}
  .item{display:flex;gap:6px;align-items:center;padding:8px 10px;background:#0b1220;border:1px solid #243249;border-radius:10px;color:#fff;cursor:pointer}
  .item:hover{background:#0e1628}
  .ico{font-size:18px}
  .badge-grid{display:flex;gap:8px;flex-wrap:wrap}
  .badge{background:#111827;border:1px solid #1f2937;border-radius:10px;padding:6px 10px}
  .hud-avatar{width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #0b1220}
  `;
  const style = document.createElement('style');
  style.id = 'hud-inline-style';
  style.textContent = css;
  document.head.appendChild(style);
})();

// Safe auto-init if developer forgets to call initHud()
if (!window.__HUD_INITED__) {
  window.__HUD_INITED__ = true;
  window.addEventListener('DOMContentLoaded', () => {
    try {
      const worldId = document.body?.dataset?.worldId || 'calistung';
      initHud({ worldId });
    } catch (e) {
      console.warn('[HUD] auto-init failed', e);
    }
  });
}