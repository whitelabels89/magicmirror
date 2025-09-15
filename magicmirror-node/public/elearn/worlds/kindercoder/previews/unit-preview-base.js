// Generic Aseprite JSON + PNG previewer
// Usage:
//   initUnitPreview({
//     png: '/path/to/Archer_Blue.png',
//     json: '/path/to/Archer_Blue.json',
//     title: 'Archer (Blue)',
//     anchor: { x:0.5, y:1.0 }, // 0..1, relative to sprite rect
//     defaultTag: 'Idle'
//   });

export async function initUnitPreview(opts){
  const cfg = Object.assign({ anchor:{x:0.5,y:1.0}, defaultTag:null }, opts||{});
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="wrap">
      <header>
        <h1>${escapeHtml(cfg.title||'Preview')}</h1>
        <div class="ctrls">
          <label>Anim
            <select id="tag"></select>
          </label>
          <label>Scale <input type="range" id="scale" min="0.25" max="3" step="0.05" value="1"></label>
          <label>Speed <input type="range" id="speed" min="0.25" max="2" step="0.05" value="1"></label>
          <button id="btnPlay">Pause</button>
          <span id="info"></span>
        </div>
      </header>
      <main>
        <canvas id="stage" width="720" height="480"></canvas>
      </main>
    </div>
    <style>
      :root{ --bg:#0b1220; --panel:#0e1525; --ink:#eaf1fb; --muted:#9aa4b2; --acc:#22c55e }
      html,body{margin:0;height:100%;background:var(--bg);color:var(--ink);font:500 14px system-ui}
      .wrap{display:grid;grid-template-rows:auto 1fr;height:100%}
      header{display:flex;align-items:center;gap:12px;padding:10px 12px;background:#0e1525;border-bottom:1px solid #1f2937}
      h1{margin:0;font-size:16px}
      .ctrls{display:flex;align-items:center;gap:12px;margin-left:auto}
      label{display:flex;align-items:center;gap:6px;color:var(--muted)}
      select,input[type=range]{accent-color:var(--acc)}
      button{background:var(--acc);color:#042014;border:0;border-radius:8px;padding:6px 10px;font-weight:800;cursor:pointer}
      main{display:grid;place-items:center;padding:10px}
      canvas{image-rendering: pixelated; background:linear-gradient(180deg,#071018,#0b1220)}
    </style>
  `;

  function el(id){ return root.querySelector('#'+id); }
  const cvs = el('stage'); const ctx = cvs.getContext('2d'); ctx.imageSmoothingEnabled=false;
  const ui = { tag: el('tag'), scale: el('scale'), speed: el('speed'), btn: el('btnPlay'), info: el('info') };

  const img = await loadImage(cfg.png);
  const doc = await fetchJson(cfg.json);
  // Build a stable, sorted frames array using the numeric suffix in the key
  const framesObj = doc.frames || {};
  const frameEntries = Object.entries(framesObj).map(([k,v])=>{
    const m = /(\d+)\.aseprite$/i.exec(k) || /(\d+)(?=\D*$)/.exec(k) || [];
    const idx = m[1] ? parseInt(m[1],10) : 0;
    return { key:k, idx, data:v };
  });
  frameEntries.sort((a,b)=> a.idx - b.idx);
  const frames = frameEntries.map(e=> e.data);
  const tags = (doc.meta?.frameTags||[]).map(t=>({ name: t.name, from:t.from|0, to:t.to|0 }));
  // Build per-tag frame arrays
  const map = new Map();
  const mapLower = new Map();
  for(const t of tags){
    const list = [];
    for(let i=t.from;i<=t.to;i++){
      const f = frames[i]; if(!f) continue;
      const fr = f.frame||{}; list.push({ sx: fr.x, sy: fr.y, w: fr.w, h: fr.h, dur: f.duration||100 });
    }
    map.set(t.name, list);
    mapLower.set(String(t.name).trim().toLowerCase(), list);
  }
  // Populate UI (show all tag names as-is)
  ui.tag.innerHTML = '';
  for(const t of tags){ const o=document.createElement('option'); o.value=t.name; o.textContent=t.name; ui.tag.appendChild(o); }
  const def = cfg.defaultTag && map.has(cfg.defaultTag) ? cfg.defaultTag : (tags[0]?.name || '');
  if(def) ui.tag.value = def;

  const actor = { x:cvs.width/2, y:cvs.height-20, fi:0, acc:0, running:true };
  ui.btn.onclick = ()=>{ actor.running = !actor.running; ui.btn.textContent = actor.running ? 'Pause' : 'Play'; };
  ui.tag.onchange = ()=>{ actor.fi = 0; actor.acc = 0; };

  function currentFrames(){
    const name = ui.tag.value;
    // Some tag names in JSON may contain trailing spaces; try exact first then trimmed
    let arr = map.get(name);
    if(!arr && typeof name === 'string') arr = map.get(name.trim());
    if(!arr && typeof name === 'string') arr = mapLower.get(name.trim().toLowerCase());
    return arr || [];
  }
  function draw(ts){
    const scale = parseFloat(ui.scale.value)||1; const speed = parseFloat(ui.speed.value)||1;
    const arr = currentFrames(); if(arr.length===0){ requestAnimationFrame(draw); return; }
    const now = ts|0; if(!draw._last) draw._last = now; const dt = now - draw._last; draw._last = now;
    if(actor.running){
      actor.acc += dt * speed;
      if(actor.fi >= arr.length) actor.fi = 0;
      let cur = arr[actor.fi]; const dur = cur?.dur||100;
      while(actor.acc >= dur){ actor.acc -= dur; actor.fi = (actor.fi+1)%arr.length; cur = arr[actor.fi]; }
    }
    ctx.clearRect(0,0,cvs.width,cvs.height);
    if(actor.fi >= arr.length) actor.fi = 0;
    const f = arr[actor.fi];
    if(!f){ requestAnimationFrame(draw); return; }
    const dw=f.w*scale, dh=f.h*scale; const dx=Math.round(actor.x - cfg.anchor.x*dw); const dy=Math.round(actor.y - cfg.anchor.y*dh);
    // optional shadow
    ctx.save(); ctx.globalAlpha=.2; ctx.fillStyle='#000'; ctx.beginPath(); ctx.ellipse(actor.x, actor.y-6, Math.max(10, dw*0.25), Math.max(6, dh*0.10), 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
    ctx.drawImage(img, f.sx, f.sy, f.w, f.h, dx, dy, dw, dh);
    ui.info.textContent = `${ui.tag.value} · ${arr.length}f · ~${Math.round(1000/Math.max(1,f.dur))}fps per-frame`;
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

function loadImage(src){ return new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=()=>rej(new Error('img:'+src)); im.src=src; }); }
async function fetchJson(url){ const r = await fetch(url, {cache:'no-cache'}); if(!r.ok) throw new Error('json:'+url); return r.json(); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }
