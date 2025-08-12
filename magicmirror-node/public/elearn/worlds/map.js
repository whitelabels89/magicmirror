import { getCompletedLocal } from '/elearn/worlds/utils/progress.js';
// Reusable world map renderer
export async function initWorld({ rootSelector = '#worldRoot', configPath }) {
  const root = document.querySelector(rootSelector);
  if (!root) throw new Error('world root not found');

  const cfgRes = await fetch(configPath);
  const cfg = await cfgRes.json();

  root.innerHTML = `
    <div class="world-topbar">
      <a href="/elearn/worlds/portal.html">⟵ Portal</a>
      <h2>${cfg.meta?.name || 'World'}</h2>
      <div></div>
    </div>
    <div class="map-container">
      <img class="world-map" src="${cfg.meta?.background}" alt="${cfg.meta?.name||'World'}">
      <div class="arrow-flow" style="left:0;top:0"></div>
    </div>
  `;

  const map = root.querySelector('.map-container');

  // Render nodes
  cfg.nodes.forEach(n => {
    const el = document.createElement('div');
    el.className = 'map-node';
    el.style.left = n.x;
    el.style.top = n.y;
    el.dataset.label = n.label;
    el.innerHTML = `
      <img class="node-icon" src="/elearn/img/map/${n.type==='finish'?'icon-finish':n.type==='boss'?'icon-boss':'icon-lesson'}.png"/>
      <span>${n.label}</span>
    `;
    // lock check (simple; replace with Firestore logic)
    const rules = cfg.unlockRules?.filter(r => r.target === n.label) || [];
    const completed = getCompletedLocal(cfg.meta.id); // from progress.js
    const unlocked = rules.every(r => r.requires.every(req => completed.includes(req)));
    if (!unlocked && rules.length) {
      const lock = document.createElement('div');
      lock.className = 'lock-node';
      lock.style.left = n.x;
      lock.style.top = n.y;
      map.appendChild(lock);
      el.style.pointerEvents = 'none';
      el.style.filter = 'grayscale(0.8) opacity(0.8)';
    }

    el.addEventListener('click', () => {
      const url = cfg.routes[n.label];
      if (url) window.location = url;
      else alert('Level belum tersedia.');
    });

    map.appendChild(el);
  });

  // Optional badge nodes
  if (cfg.rewards) {
    Object.keys(cfg.rewards).forEach(lbl => {
      const nd = cfg.nodes.find(n => n.label === lbl);
      if (!nd) return;
      const b = document.createElement('div');
      b.className = 'badge-node';
      b.style.left = nd.x;
      b.style.top = nd.y;
      map.appendChild(b);
    });
  }

  // Arrow animation
  const arrow = root.querySelector('.arrow-flow');
  const nodes = Array.from(map.querySelectorAll('.map-node'));
  if (nodes.length >= 2) animateArrow(arrow, nodes, map);
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
