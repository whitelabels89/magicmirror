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

    el.addEventListener('click', () => {
      const url = routes[n.label] || n.entry;
      if (window.CalistungMusic && typeof window.CalistungMusic.prepareNextTrack === 'function') {
        window.CalistungMusic.prepareNextTrack('level');
      }
      if (url) window.location = url;
      else alert('Level belum tersedia.');
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
