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
  const cfg = Object.assign({ anchor:{x:0.5,y:1.0}, defaultTag:null, quickTags:null }, opts||{});
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="wrap">
      <header>
        <div class="top">
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
        </div>
        <div class="quickbar" id="quick"></div>
      </header>
      <main>
        <canvas id="stage" width="720" height="480"></canvas>
      </main>
    </div>
    <style>
      :root{ --bg:#0b1220; --panel:#0e1525; --ink:#eaf1fb; --muted:#9aa4b2; --acc:#22c55e }
      html,body{margin:0;height:100%;background:var(--bg);color:var(--ink);font:500 14px system-ui}
      .wrap{display:grid;grid-template-rows:auto 1fr;height:100%}
      header{display:flex;flex-direction:column;gap:10px;padding:10px 12px;background:#0e1525;border-bottom:1px solid #1f2937}
      .top{display:flex;align-items:center;gap:12px}
      h1{margin:0;font-size:16px}
      .ctrls{display:flex;align-items:center;gap:12px;margin-left:auto;flex-wrap:wrap;justify-content:flex-end}
      label{display:flex;align-items:center;gap:6px;color:var(--muted)}
      select,input[type=range]{accent-color:var(--acc)}
      button{background:var(--acc);color:#042014;border:0;border-radius:8px;padding:6px 10px;font-weight:800;cursor:pointer}
      .quickbar{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-start}
      .quickbar:empty{display:none}
      .quickbar button{background:#0b1220;border:1px solid #243249;border-radius:8px;color:#fff;cursor:pointer;padding:4px 8px;font-weight:600}
      .quickbar button.active{background:var(--acc);color:#042014;border-color:var(--acc)}
      .quickbar button:disabled{opacity:0.45;cursor:not-allowed}
      main{display:grid;place-items:center;padding:10px}
      canvas{image-rendering: pixelated; background:linear-gradient(180deg,#071018,#0b1220)}
    </style>
  `;

  function el(id){ return root.querySelector('#'+id); }
  const cvs = el('stage'); const ctx = cvs.getContext('2d'); ctx.imageSmoothingEnabled=false;
  const quickBar = el('quick');
  const ui = { tag: el('tag'), scale: el('scale'), speed: el('speed'), btn: el('btnPlay'), info: el('info') };
  const normalizeTagName = (name)=> String(name||'')
    .replace(/[\s_-]+/g,' ')
    .trim()
    .toLowerCase();

  const img = await loadImage(cfg.png);
  const doc = await fetchJson(cfg.json);
  const inspector = document.createElement('canvas');
  inspector.width = inspector.height = 0;
  const inspectCtx = inspector.getContext('2d');
  if(inspectCtx && typeof inspectCtx.imageSmoothingEnabled === 'boolean'){ inspectCtx.imageSmoothingEnabled = false; }
  const blankFrameCache = new Map();
  function frameIsEmpty(frameData){
    if(!inspectCtx) return false;
    const rect = frameData?.frame || {};
    const w = rect.w|0; const h = rect.h|0;
    if(!(w>0 && h>0)){
      const key = `${rect.x|0},${rect.y|0},${w},${h}`;
      blankFrameCache.set(key, true);
      return true;
    }
    const key = `${rect.x|0},${rect.y|0},${w},${h}`;
    if(blankFrameCache.has(key)) return blankFrameCache.get(key);
    inspector.width = w;
    inspector.height = h;
    if(typeof inspectCtx.imageSmoothingEnabled === 'boolean'){ inspectCtx.imageSmoothingEnabled = false; }
    try{
      inspectCtx.clearRect(0,0,w,h);
      inspectCtx.drawImage(img, rect.x||0, rect.y||0, w, h, 0, 0, w, h);
      const data = inspectCtx.getImageData(0,0,w,h).data;
      let blank = true;
      for(let i=3;i<data.length;i+=4){ if(data[i] !== 0){ blank=false; break; } }
      blankFrameCache.set(key, blank);
      return blank;
    }catch(err){
      blankFrameCache.set(key, false);
      return false;
    }
  }
  function createTileResolver(tileW, tileH){
    if(!(tileW>0 && tileH>0)) return null;
    const cols = Math.max(1, Math.ceil(img.width / tileW));
    const rows = Math.max(1, Math.ceil(img.height / tileH));
    const tiles = [];
    const byKey = new Map();
    for(let row=0; row<rows; row++){
      for(let col=0; col<cols; col++){
        const tx = Math.min(Math.max(0, img.width - tileW), col * tileW);
        const ty = Math.min(Math.max(0, img.height - tileH), row * tileH);
        const key = `${tx},${ty}`;
        if(byKey.has(key)) continue;
        const isBlank = frameIsEmpty({ frame: { x:tx, y:ty, w:tileW, h:tileH } });
        if(!isBlank){
          const tile = { sx:tx, sy:ty, used:false };
          tiles.push(tile);
          byKey.set(key, tile);
        }
      }
    }
    tiles.sort((a,b)=> (a.sy - b.sy) || (a.sx - b.sx));
    let cursor = 0;
    function claim(x,y){
      const tile = byKey.get(`${x},${y}`);
      if(tile && !tile.used){ tile.used = true; }
    }
    function next(){
      while(cursor < tiles.length){
        const tile = tiles[cursor++];
        if(!tile.used){ tile.used = true; return tile; }
      }
      return null;
    }
    return { claim, next };
  }
  // Build a stable, sorted frames array using the numeric suffix in the key
  const framesObj = doc.frames || {};
  const frameEntries = Object.entries(framesObj).map(([k,v])=>{
    const m = /(\d+)\.aseprite$/i.exec(k) || /(\d+)(?=\D*$)/.exec(k) || [];
    const idx = m[1] ? parseInt(m[1],10) : 0;
    return { key:k, idx, data:v };
  });
  frameEntries.sort((a,b)=> a.idx - b.idx);
  const frames = frameEntries.map(e=> e.data);
  const sampleFrame = frameEntries.find(e=> (e?.data?.frame?.w|0) > 0 && (e?.data?.frame?.h|0) > 0);
  const tileResolver = sampleFrame ? createTileResolver(sampleFrame.data.frame.w|0, sampleFrame.data.frame.h|0) : null;
  const resolvedFrames = frameEntries.map(()=> null);
  if(tileResolver){
    for(let i=0;i<frameEntries.length;i++){
      const entryMeta = frameEntries[i];
      const f = entryMeta?.data; if(!f) continue;
      const fr = f.frame||{};
      const w = fr.w|0; const h = fr.h|0; const dur = f.duration||0;
      if(!(w>0 && h>0 && dur>0)) continue;
      let sx = fr.x|0; let sy = fr.y|0;
      if(sx < 0 || sy < 0 || sx + w > img.width || sy + h > img.height){
        const cols = w > 0 ? Math.max(1, Math.floor(img.width / w)) : 0;
        const rows = h > 0 ? Math.max(1, Math.floor(img.height / h)) : 0;
        if(cols && rows){
          const total = cols * rows;
          const fallbackIndex = Number.isFinite(entryMeta?.idx) ? entryMeta.idx : i;
          const normalized = total > 0 ? ((fallbackIndex % total) + total) % total : 0;
          const col = normalized % cols;
          const row = Math.floor(normalized / cols);
          const maxX = Math.max(0, img.width - w);
          const maxY = Math.max(0, img.height - h);
          sx = Math.min(maxX, col * w);
          sy = Math.min(maxY, row * h);
        }else{
          const maxX = Math.max(0, img.width - w);
          const maxY = Math.max(0, img.height - h);
          sx = Math.min(maxX, Math.max(0, sx));
          sy = Math.min(maxY, Math.max(0, sy));
        }
      }
      let resolvedX = sx;
      let resolvedY = sy;
      let blank = frameIsEmpty({ frame: { x:resolvedX, y:resolvedY, w, h } });
      if(blank && tileResolver){
        const tile = tileResolver.next();
        if(tile){
          resolvedX = tile.sx;
          resolvedY = tile.sy;
          blank = frameIsEmpty({ frame: { x:resolvedX, y:resolvedY, w, h } });
        }
      }else if(tileResolver){
        tileResolver.claim(resolvedX, resolvedY);
      }
      resolvedFrames[i] = { sx:resolvedX, sy:resolvedY, w, h, dur, blank };
    }
  }else{
    for(let i=0;i<frameEntries.length;i++){
      const entryMeta = frameEntries[i];
      const f = entryMeta?.data; if(!f) continue;
      const fr = f.frame||{};
      const w = fr.w|0; const h = fr.h|0; const dur = f.duration||0;
      if(!(w>0 && h>0 && dur>0)) continue;
      let sx = fr.x|0; let sy = fr.y|0;
      if(sx < 0 || sy < 0 || sx + w > img.width || sy + h > img.height){
        const cols = w > 0 ? Math.max(1, Math.floor(img.width / w)) : 0;
        const rows = h > 0 ? Math.max(1, Math.floor(img.height / h)) : 0;
        if(cols && rows){
          const total = cols * rows;
          const fallbackIndex = Number.isFinite(entryMeta?.idx) ? entryMeta.idx : i;
          const normalized = total > 0 ? ((fallbackIndex % total) + total) % total : 0;
          const col = normalized % cols;
          const row = Math.floor(normalized / cols);
          const maxX = Math.max(0, img.width - w);
          const maxY = Math.max(0, img.height - h);
          sx = Math.min(maxX, col * w);
          sy = Math.min(maxY, row * h);
        }else{
          const maxX = Math.max(0, img.width - w);
          const maxY = Math.max(0, img.height - h);
          sx = Math.min(maxX, Math.max(0, sx));
          sy = Math.min(maxY, Math.max(0, sy));
        }
      }
      const blank = frameIsEmpty({ frame: { x:sx, y:sy, w, h } });
      resolvedFrames[i] = { sx, sy, w, h, dur, blank };
    }
  }
  const rawTags = Array.isArray(doc.meta?.frameTags) ? doc.meta.frameTags : [];
  const tags = [];
  const seen = new Set();
  const map = new Map();
  const mapLower = new Map();
  const nameIndex = new Map(); // normalized -> original casing
  for(const raw of rawTags){
    const name = String(raw?.name ?? '').trim();
    if(!name) continue;
    const norm = normalizeTagName(name);
    const from = raw.from|0; const to = raw.to|0;
    const rawList = [];
    const filtered = [];
    for(let i=from;i<=to;i++){
      const resolved = resolvedFrames[i];
      if(!resolved) continue;
      const { sx, sy, w, h, dur, blank } = resolved;
      const entry = { sx, sy, w, h, dur };
      rawList.push(entry);
      if(!blank) filtered.push(entry);
    }
    const list = filtered.length ? filtered : rawList;
    if(list.length === 0) continue;
    if(!map.has(name)) map.set(name, list);
    if(!mapLower.has(norm)) mapLower.set(norm, list);
    if(!nameIndex.has(norm)) nameIndex.set(norm, name);
    if(!seen.has(norm)){ tags.push({ name }); seen.add(norm); }
  }
  // Populate UI (show all tag names as-is)
  ui.tag.innerHTML = '';
  for(const t of tags){ const o=document.createElement('option'); o.value=t.name; o.textContent=t.name; ui.tag.appendChild(o); }
  const def = cfg.defaultTag && map.has(cfg.defaultTag) ? cfg.defaultTag : (tags[0]?.name || '');
  if(def) ui.tag.value = def;

  const actor = { x:cvs.width/2, y:cvs.height-20, fi:0, acc:0, running:true };
  function updateQuickSelection(){
    if(!quickBar) return;
    const current = normalizeTagName(ui.tag.value);
    quickBar.querySelectorAll('button[data-tag]').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.tag === current);
    });
  }
  ui.btn.onclick = ()=>{ actor.running = !actor.running; ui.btn.textContent = actor.running ? 'Pause' : 'Play'; };
  ui.tag.onchange = ()=>{ actor.fi = 0; actor.acc = 0; updateQuickSelection(); };

  function currentFrames(){
    const name = ui.tag.value;
    // Normalize lookup
    let arr = map.get(name);
    if(!arr && typeof name === 'string') arr = map.get(name.trim());
    if(!arr && typeof name === 'string') arr = mapLower.get(normalizeTagName(name));
    return arr || [];
  }
  // Quick tag buttons for commonly used anims
  const quickNames = Array.isArray(cfg.quickTags) && cfg.quickTags.length ? cfg.quickTags : [
    'Original','Idle','Run','Build','Chop','Carry','Carry Idle','Carry Run',
    'Shoot Up','Shoot Front','Shoot Down','Shoot Diagonal Up','Shoot Diagonal Down',
    'Arrow_1','Arrow_2'
  ];
  if(quickBar){
    quickBar.innerHTML = '';
    for(const q of quickNames){
      const norm = normalizeTagName(q);
      const orig = nameIndex.get(norm);
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = q;
      if(orig){
        const tagNorm = normalizeTagName(orig);
        b.dataset.tag = tagNorm;
        b.onclick = ()=>{ ui.tag.value = orig; ui.tag.onchange(); };
      }else{
        b.disabled = true;
      }
      quickBar.appendChild(b);
    }
  }
  updateQuickSelection();
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
