// Minimal no-code map editor for GameVP4
// Layers supported: water, ground, cliff_water, cliff_land, cliff_land2, slopes

const ATLAS_JSON  = '/elearn/models/ts-fp/Terrain/atlas/terrain-atlas.json';
const LAYERS_JSON = '/elearn/models/ts-fp/Terrain/atlas/terrain-layers.json';

const cvs = document.getElementById('cvs');
const ctx = cvs.getContext('2d');
ctx.imageSmoothingEnabled = false;

const ui = {
  cols: document.getElementById('cols'),
  rows: document.getElementById('rows'),
  variant: document.getElementById('variant'),
  btnResize: document.getElementById('btnResize'),
  btnClear: document.getElementById('btnClear'),
  btnExport: document.getElementById('btnExport'),
  btnOpenGame: document.getElementById('btnOpenGame'),
  fileImport: document.getElementById('fileImport'),
  layers: document.getElementById('layers'),
  status: document.getElementById('status'),
  decorType: document.getElementById('decorType'),
  treeVariant: document.getElementById('treeVariant'),
  treeScale: document.getElementById('treeScale'),
  btnAddTree: document.getElementById('btnAddTree'),
  btnClearTrees: document.getElementById('btnClearTrees'),
  sheepAnim: document.getElementById('sheepAnim'),
  sheepScale: document.getElementById('sheepScale'),
  btnAddSheep: document.getElementById('btnAddSheep'),
  btnClearSheep: document.getElementById('btnClearSheep')
};

const LAYER_KEYS = ['ground','cliff_land','cliff_land2','cliff_water','slopes'];
const DECOR_LAYER = 'decor';
let activeLayer = 'ground';

let tileSize = 64;
let COLS = 12, ROWS = 12;
const EDGE_BLEED = 0; // keep canvas exactly covering board in tiles

// 2D arrays of 0/1 per layer
const grids = {};
for(const k of ['water',...LAYER_KEYS]) grids[k] = null;

// History for Undo/Redo
const history = []; // [{ layer, changes:[{x,y,prev,next}] }]
let histIdx = -1;

function pushHistory(patch){
  if(!patch || !patch.changes || patch.changes.length===0) return;
  if(histIdx < history.length-1) history.splice(histIdx+1);
  history.push(patch); histIdx = history.length-1;
  setStatus(`Undo stack: ${history.length}`);
}

function applyPatch(patch, dir){
  if(!patch) return;
  const grid = grids[patch.layer]; if(!grid) return;
  const usePrev = (dir==='undo');
  for(const ch of patch.changes){
    if(ch.y>=0 && ch.y<ROWS && ch.x>=0 && ch.x<COLS){
      grid[ch.y][ch.x] = usePrev ? ch.prev : ch.next;
    }
  }
}

function undo(){ if(histIdx < 0) return; const p = history[histIdx--]; applyPatch(p,'undo'); render(); }
function redo(){ if(histIdx >= history.length-1) return; const p = history[++histIdx]; applyPatch(p,'redo'); render(); }

function createGrid(cols, rows, fill=0){
  const g = new Array(rows);
  for(let r=0;r<rows;r++){ g[r] = new Array(cols).fill(fill); }
  return g;
}

async function init(){
  const atlasJson = await TerrainAtlas.load(ATLAS_JSON);
  await TerrainAtlas.setVariant('color1');
  tileSize = TerrainAtlas.getConfig().tileSize || 64;

  // Initialize grid size to fit the visible board (best-effort)
  fitToBoard(true);

  // default: fill water
  grids.water = createGrid(COLS, ROWS, 1);
  for(const k of LAYER_KEYS) grids[k] = createGrid(COLS, ROWS, 0);

  buildLayerPalette();
  bindUI();
  render();
}

function buildLayerPalette(){
  const frag = document.createDocumentFragment();
  const options = [
    {k:'ground', label:'Ground'},
    {k:'cliff_land', label:'Cliff Land (Level+1)'},
    {k:'cliff_land2', label:'Cliff Land 2 (Level+2)'},
    {k:'cliff_water', label:'Cliff Water (island)'},
    {k:'slopes', label:'Slopes (Tangga)'},
    {k:DECOR_LAYER, label:'Decor'}
  ];
  for(const o of options){
    const div = document.createElement('label');
    div.className = 'sw';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'layer';
    radio.value = o.k;
    if(o.k===activeLayer) radio.checked = true;
    const span = document.createElement('span');
    span.textContent = o.label;
    div.appendChild(radio); div.appendChild(span);
    div.addEventListener('change', ()=>{ activeLayer = o.k; });
    frag.appendChild(div);
  }
  ui.layers.innerHTML='';
  ui.layers.appendChild(frag);
}

function resizeCanvas(){
  cvs.width = COLS * tileSize;
  cvs.height = ROWS * tileSize;
  ctx.setTransform(1,0,0,1,0,0);
  fitCanvasToBoard();
  render();
}

function setStatus(t){ ui.status.textContent = t; }

// Scale canvas CSS size to fit the board container while keeping crisp pixels
function fitCanvasToBoard(){
  const board = document.getElementById('board');
  // Match CSS size to board so visual area = paintable area (hit-test scales).
  cvs.style.width = board.clientWidth + 'px';
  cvs.style.height = board.clientHeight + 'px';
  // Sync decor overlay
  const decor = document.getElementById('decor');
  if(decor){
    decor.width = cvs.width; decor.height = cvs.height;
    decor.style.width = cvs.style.width; decor.style.height = cvs.style.height;
  }
}

function render(){
  // Simple paint using TerrainAtlas directly (same coord logic as engine is heavy to clone). Use engine if already loaded.
  // Here, reuse TerrainEngine when available for accurate skirts and specials.
  (async () => {
    try{
      await TerrainEngine.init({ atlasUrl: ATLAS_JSON, layersUrl: LAYERS_JSON, variant: ui.variant.value, canvas: cvs });
      // apply grids
      const w = createGrid(COLS, ROWS, 0); for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) w[r][c] = grids.water[r][c];
      TerrainEngine.setGrid('water', w);
      for(const k of ['ground','cliff_land','cliff_land2','cliff_water','slopes']){
        const g = createGrid(COLS, ROWS, 0); const src = grids[k];
        for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) g[r][c] = src[r][c];
        TerrainEngine.setGrid(k, g);
      }
      await TerrainEngine.setVariant(ui.variant.value);
      await TerrainEngine.setWaterTexture('/elearn/models/ts-fp/Terrain/Water%20Background%20color.png');
      TerrainEngine.render();
    }catch(e){
      console.warn('Render error', e);
    }
  })();
}

let painting = false; let paintValue = 1; let lastCell = null; let eraser = false;
let currentPatch = null; // accumulate per stroke
// decor overlay for trees
const decor = document.getElementById('decor');
const dctx = decor.getContext('2d'); dctx.imageSmoothingEnabled=false;
let decorLast = performance.now();
const TREE_BASE = "/elearn/models/ts-fp/Decorations/Trees/";
const TREE_SHEETS = {1: TREE_BASE+"Tree1.png", 2: TREE_BASE+"Tree2.png", 3: TREE_BASE+"Tree3.png", 4: TREE_BASE+"Tree4.png"};
const TREE_JSON = TREE_BASE + "Trees.json";
const SHEEP_BASE = "/elearn/models/ts-fp/Decorations/Sheep/";
const SHEEP_SHEETS = { idle: SHEEP_BASE+"Sheep_Idle.png", grass: SHEEP_BASE+"Sheep_Grass.png", move: SHEEP_BASE+"Sheep_Move.png" };
const SHEEP_JSON = SHEEP_BASE + "Sheep.json";
const treeImgCache = new Map();
const treeFramesCache = new Map(); // key: idx -> frames
const trees = []; // {idx,x,y,scale,fps,fi,acc}
const sheepImgCache = new Map();
const sheepFramesCache = new Map(); // key: anim -> frames
const sheeps = []; // {anim,x,y,scale,fps,fi,acc}

function getCanvasXY(e){
  const rect = cvs.getBoundingClientRect();
  const sx = cvs.width / rect.width, sy = cvs.height / rect.height;
  return { x: (e.clientX-rect.left)*sx, y: (e.clientY-rect.top)*sy };
}

function loadImage(src){ return new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=()=>rej(new Error('img:'+src)); im.src=src; }); }
async function loadTreeImg(idx){ if(!treeImgCache.has(idx)) treeImgCache.set(idx, await loadImage(TREE_SHEETS[idx])); return treeImgCache.get(idx); }
async function loadTreeFrames(idx){
  if(treeFramesCache.has(idx)) return treeFramesCache.get(idx);
  let doc=null; try{ const r=await fetch(TREE_JSON); if(r.ok) doc=await r.json(); }catch(_){ doc=null; }
  let frames=[]; if(doc){
    const framesArray = Object.values(doc.frames||{});
    const tag = (doc.meta?.frameTags||[]).find(t=> (t.name||'').toLowerCase()===('tree '+idx));
    if(tag){ const baseX = framesArray[tag.from].frame.x; for(let i=tag.from;i<=tag.to;i++){ const f=framesArray[i]; frames.push({sx:f.frame.x-baseX, sy:f.frame.y, w:f.frame.w, h:f.frame.h, dur:f.duration}); } }
  }
  if(frames.length===0){ const w=192,h=256; for(let i=0;i<8;i++) frames.push({sx:i*w, sy:0, w, h, dur:100}); }
  treeFramesCache.set(idx, frames); return frames;
}

async function ensureTreeResources(idx){ await loadTreeImg(idx); await loadTreeFrames(idx); }
async function ensureSheepResources(anim){ await loadSheepImg(anim); await loadSheepFrames(anim); }

// --- Sheep loading helpers ---
async function loadSheepImg(anim){
  const key = (anim||'idle').toLowerCase();
  if(!sheepImgCache.has(key)) sheepImgCache.set(key, await loadImage(SHEEP_SHEETS[key]));
  return sheepImgCache.get(key);
}

async function loadSheepFrames(anim){
  const key = (anim||'idle').toLowerCase();
  if(sheepFramesCache.has(key)) return sheepFramesCache.get(key);
  let doc=null; try{ const r=await fetch(SHEEP_JSON, {cache:'no-cache'}); if(r.ok) doc=await r.json(); }catch(_){ doc=null; }
  let frames = [];
  if(doc && doc.frames && doc.meta && Array.isArray(doc.meta.frameTags)){
    const framesArray = Object.values(doc.frames);
    const tag = doc.meta.frameTags.find(t => (t.name||'').toLowerCase()===key);
    if(tag){
      const baseX = framesArray[tag.from].frame.x;
      for(let i=tag.from;i<=tag.to;i++){
        const f = framesArray[i];
        frames.push({ sx:f.frame.x - baseX, sy:f.frame.y, w:f.frame.w, h:f.frame.h, dur:f.duration });
      }
    }
  }
  // Fallback: assume 8 frames 128x128 in a horizontal strip
  if(frames.length===0){ for(let i=0;i<8;i++) frames.push({ sx:i*128, sy:0, w:128, h:128, dur:100 }); }
  sheepFramesCache.set(key, frames); return frames;
}

function drawDecor(ts){
  const dt = ts - decorLast; decorLast = ts;
  dctx.clearRect(0,0,decor.width, decor.height);
  const list = [];
  for(const t of trees){ list.push({ y:t.y, draw:()=>{ t.acc += dt; const frames=treeFramesCache.get(t.idx); if(!frames) return; const img=treeImgCache.get(t.idx); let ms=frames[t.fi]?.dur || (1000/Math.max(1,t.fps||10)); while(t.acc>=ms){ t.acc-=ms; t.fi=(t.fi+1)%frames.length; ms=frames[t.fi]?.dur || (1000/Math.max(1,t.fps||10)); } const f=frames[t.fi]; const dw=f.w*t.scale, dh=f.h*t.scale; const dx=Math.round(t.x-0.5*dw), dy=Math.round(t.y-dh+20); dctx.drawImage(img,f.sx,f.sy,f.w,f.h,dx,dy,dw,dh); }}); }
  for(const s of sheeps){ list.push({ y:s.y, draw:()=>{ s.acc += dt; const frames=sheepFramesCache.get(s.anim); if(!frames) return; const img=sheepImgCache.get(s.anim); let ms=frames[s.fi]?.dur || (1000/Math.max(1,s.fps||10)); while(s.acc>=ms){ s.acc-=ms; s.fi=(s.fi+1)%frames.length; ms=frames[s.fi]?.dur || (1000/Math.max(1,s.fps||10)); } const f=frames[s.fi]; const dw=f.w*s.scale, dh=f.h*s.scale; const dx=Math.round(s.x-0.5*dw), dy=Math.round(s.y-dh+50); dctx.drawImage(img,f.sx,f.sy,f.w,f.h,dx,dy,dw,dh); }}); }
  list.sort((a,b)=>a.y-b.y); for(const it of list) it.draw();
  requestAnimationFrame(drawDecor);
}
requestAnimationFrame(drawDecor);
function cellFromEvent(e){
  const rect = cvs.getBoundingClientRect();
  const sx = cvs.width / rect.width;
  const sy = cvs.height / rect.height;
  const xPix = (e.clientX - rect.left) * sx;
  const yPix = (e.clientY - rect.top) * sy;
  // subtract a tiny epsilon so exact-right/bottom edges still land in last cell
  const xRaw = Math.floor((xPix - 0.001) / tileSize);
  const yRaw = Math.floor((yPix - 0.001) / tileSize);
  const x = Math.max(0, Math.min(COLS - 1, xRaw));
  const y = Math.max(0, Math.min(ROWS - 1, yRaw));
  return { x, y };
}
function drawCell(x,y,val){
  if(!grids[activeLayer]) return;
  const prev = grids[activeLayer][y][x];
  if(prev === val) return;
  grids[activeLayer][y][x] = val;
  if(currentPatch){
    if(!currentPatch._seen) currentPatch._seen = new Set();
    const key = `${x},${y}`;
    if(!currentPatch._seen.has(key)){
      currentPatch._seen.add(key);
      currentPatch.changes.push({x,y,prev,next:val});
    }
  }
}
function paintLine(a,b,val){
  const dx = Math.sign(b.x - a.x); const dy = Math.sign(b.y - a.y);
  let x=a.x,y=a.y; drawCell(x,y,val);
  while(x!==b.x || y!==b.y){ if(x!==b.x) x+=dx; if(y!==b.y) y+=dy; drawCell(x,y,val);} 
}

function bindUI(){
  cvs.addEventListener('mousedown', async (e)=>{
    e.preventDefault();
    if(activeLayer===DECOR_LAYER){
      const p = getCanvasXY(e);
      if((ui.decorType?.value||'tree')==='tree'){
        const idx = parseInt(ui.treeVariant.value,10)||1;
        const sc = parseFloat(ui.treeScale.value)||1;
        await ensureTreeResources(idx);
        trees.push({ idx, x:p.x, y:p.y, scale:sc, fps:10, fi:0, acc:0 });
      }else{
        const anim = (ui.sheepAnim?.value)||'idle';
        const sc = parseFloat(ui.sheepScale?.value)||1;
        await ensureSheepResources(anim);
        sheeps.push({ anim, x:p.x, y:p.y, scale:sc, fps:10, fi:0, acc:0 });
      }
      return;
    }
    const cell = cellFromEvent(e); if(!cell) return;
    painting = true; paintValue = (e.button===2 || eraser) ? 0 : 1; lastCell = cell;
    currentPatch = { layer: activeLayer, changes: [] };
    if(e.shiftKey && lastCell){ paintLine(lastCell, cell, paintValue);} else { drawCell(cell.x, cell.y, paintValue); }
    render();
  }, { passive:false });
  cvs.addEventListener('mousemove', (e)=>{
    e.preventDefault();
    if(!painting) return; const cell = cellFromEvent(e); if(!cell) return;
    if(e.shiftKey && lastCell){ paintLine(lastCell, cell, paintValue); lastCell=cell; }
    else { drawCell(cell.x, cell.y, paintValue); lastCell = cell; }
    render();
  }, { passive:false });
  cvs.addEventListener('mouseup', ()=>{ painting=false; lastCell=null; pushHistory(currentPatch); currentPatch=null; });
  cvs.addEventListener('mouseleave', ()=>{ if(painting){ pushHistory(currentPatch); } painting=false; lastCell=null; currentPatch=null; });
  cvs.addEventListener('contextmenu', (e)=> e.preventDefault());

  ui.btnResize.onclick = ()=>{
    COLS = Math.max(4, Math.min(64, Number(ui.cols.value)||8));
    ROWS = Math.max(4, Math.min(64, Number(ui.rows.value)||8));
    resizeCanvas();
    for(const k of Object.keys(grids)) grids[k] = createGrid(COLS, ROWS, k==='water'?1:0);
    history.length=0; histIdx=-1;
    render();
  };
  document.getElementById('btnFit').onclick = ()=> fitToBoard(true);
  ui.btnClear.onclick = ()=>{ for(const k of LAYER_KEYS) grids[k] = createGrid(COLS, ROWS, 0); history.length=0; histIdx=-1; render(); };
  ui.btnAddTree.onclick = async ()=>{ const idx=parseInt(ui.treeVariant.value,10)||1; const sc=parseFloat(ui.treeScale.value)||1; await ensureTreeResources(idx); trees.push({ idx, x:cvs.width/2, y:cvs.height-40, scale:sc, fps:10, fi:0, acc:0 }); };
  ui.btnClearTrees.onclick = ()=>{ trees.length=0; };
  ui.btnAddSheep.onclick = async ()=>{ const anim=(ui.sheepAnim?.value)||'idle'; const sc=parseFloat(ui.sheepScale?.value)||1; await ensureSheepResources(anim); sheeps.push({ anim, x:cvs.width/2, y:cvs.height-32, scale:sc, fps:10, fi:0, acc:0 }); };
  ui.btnClearSheep.onclick = ()=>{ sheeps.length=0; };
  document.getElementById('btnUndo').onclick = ()=> undo();
  document.getElementById('btnRedo').onclick = ()=> redo();
  document.getElementById('btnEraser').onclick = (e)=>{ eraser = !eraser; e.currentTarget.textContent = `Eraser: ${eraser? 'ON':'OFF'}`; };

  ui.variant.onchange = async ()=>{ await TerrainEngine.setVariant(ui.variant.value); render(); };

  ui.btnExport.onclick = ()=>{
    const doc = toJson();
    const ts = new Date().toISOString().replace(/[:.]/g,'');
    const base = `island_${COLS}x${ROWS}_${ts}`;
    // Snapshot PNG of current canvas
    const pngUrl = cvs.toDataURL('image/png');
    const imgA = document.createElement('a'); imgA.href = pngUrl; imgA.download = `${base}.png`; imgA.click();
    // Embed snapshot into JSON as data URL
    doc.snapshot = pngUrl;
    const blob = new Blob([JSON.stringify(doc, null, 2)], {type:'application/json'});
    const jsonA = document.createElement('a'); jsonA.href = URL.createObjectURL(blob); jsonA.download = `${base}.json`; jsonA.click();
    setTimeout(()=> URL.revokeObjectURL(jsonA.href), 0);
    setStatus('JSON & PNG di-download. Pindahkan JSON ke folder maps/ untuk publish.');
  };

  ui.fileImport.onchange = async (e)=>{
    const file = e.target.files?.[0]; if(!file) return;
    const text = await file.text();
    try{
      const doc = JSON.parse(text);
      fromJson(doc);
      setStatus(`Loaded ${file.name}`);
    }catch(err){ setStatus('Gagal parse JSON'); }
    e.target.value = '';
  };

  ui.btnOpenGame.onclick = ()=>{
    const doc = toJson();
    const blob = new Blob([JSON.stringify(doc)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    // Open a new tab with gamevp4 and blob URL not directly usable; instruct to download first
    alert('Export dulu JSON lalu pindahkan ke folder /elearn/worlds/kindercoder/maps/, kemudian buka gamevp4.html?map=namafile.json');
  };

  // Keyboard shortcuts
  window.addEventListener('keydown', (e)=>{
    const z = e.key.toLowerCase()==='z';
    const y = e.key.toLowerCase()==='y';
    if((e.ctrlKey||e.metaKey) && z && !e.shiftKey){ e.preventDefault(); undo(); }
    if(((e.ctrlKey||e.metaKey) && (y || (z && e.shiftKey)))){ e.preventDefault(); redo(); }
  });

  // Auto expand grid so canvas can be painted up to the visible edges
  const ro = new ResizeObserver(()=> ensureCoverBoard());
  ro.observe(document.getElementById('board'));
}

function toJson(){
  const toMask = (g)=> g.map(row=> row.map(v=>v?1:0).join(''));
  return {
    variant: ui.variant.value,
    cols: COLS,
    rows: ROWS,
    layers: {
      water: toMask(grids.water),
      ground: toMask(grids.ground),
      cliff_land: toMask(grids.cliff_land),
      cliff_land2: toMask(grids.cliff_land2),
      cliff_water: toMask(grids.cliff_water),
      slopes: toMask(grids.slopes)
    },
    decorTrees: trees.map(t=>({type:t.idx, x:Math.round(t.x), y:Math.round(t.y), scale:t.scale})),
    decorSheep: sheeps.map(s=>({anim:s.anim, x:Math.round(s.x), y:Math.round(s.y), scale:s.scale}))
  };
}

function fromJson(doc){
  ui.variant.value = doc.variant || 'color1';
  COLS = Number(doc.cols)||8; ROWS = Number(doc.rows)||8;
  ui.cols.value = COLS; ui.rows.value = ROWS;
  resizeCanvas();
  history.length=0; histIdx=-1;
  const readMask = (arr)=>{
    const g = createGrid(COLS, ROWS, 0);
    for(let r=0;r<ROWS;r++){
      const s = arr?.[r] || ''.padEnd(COLS,'0');
      for(let c=0;c<COLS;c++) g[r][c] = (s.charAt(c)==='1')?1:0;
    }
    return g;
  };
  grids.water       = readMask(doc.layers?.water);
  grids.ground      = readMask(doc.layers?.ground);
  grids.cliff_land  = readMask(doc.layers?.cliff_land);
  grids.cliff_land2 = readMask(doc.layers?.cliff_land2);
  grids.cliff_water = readMask(doc.layers?.cliff_water);
  grids.slopes      = readMask(doc.layers?.slopes);
  (doc.decorTrees||[]).forEach(async it=>{ const idx=it.type||1; await ensureTreeResources(idx); trees.push({ idx, x:it.x||0, y:it.y||0, scale:it.scale||1, fps:10, fi:0, acc:0 }); });
  (doc.decorSheep||[]).forEach(async it=>{ const anim=(it.anim||'idle'); await ensureSheepResources(anim); sheeps.push({ anim, x:it.x||0, y:it.y||0, scale:it.scale||1, fps:10, fi:0, acc:0 }); });
  render();
}

init();

// Compute cols/rows so canvas reaches near edges without stretching tiles.
function fitToBoard(reset=true){
  const board = document.getElementById('board');
  const bw = board.clientWidth || 640;
  const bh = board.clientHeight || 480;
  const newCols = Math.max(4, Math.min(64, Math.ceil(bw / tileSize) + EDGE_BLEED));
  const newRows = Math.max(4, Math.min(64, Math.ceil(bh / tileSize) + EDGE_BLEED));
  COLS = newCols; ROWS = newRows;
  ui.cols.value = COLS; ui.rows.value = ROWS;
  resizeCanvas();
  if(reset){
    grids.water = createGrid(COLS, ROWS, 1);
    for(const k of LAYER_KEYS){ grids[k] = createGrid(COLS, ROWS, 0); }
    history.length = 0; histIdx = -1;
  }
  render();
}

// Ensure the current grid is at least as large as the board in tile units (grow only; keep content)
function ensureCoverBoard(){
  const board = document.getElementById('board');
  const bw = board.clientWidth || 640;
  const bh = board.clientHeight || 480;
  const wantCols = Math.max(4, Math.min(64, Math.ceil(bw / tileSize) + EDGE_BLEED));
  const wantRows = Math.max(4, Math.min(64, Math.ceil(bh / tileSize) + EDGE_BLEED));
  if(wantCols <= COLS && wantRows <= ROWS){ fitCanvasToBoard(); return; }
  const newCols = Math.max(COLS, wantCols);
  const newRows = Math.max(ROWS, wantRows);
  // expand each grid preserving content
  const expand = (g, fill=0)=>{
    const ng = createGrid(newCols, newRows, fill);
    const rows = Math.min(ROWS, g.length);
    const cols = Math.min(COLS, g[0].length);
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) ng[r][c]=g[r][c];
    return ng;
  };
  grids.water = expand(grids.water, 1);
  for(const k of LAYER_KEYS){ grids[k] = expand(grids[k], 0); }
  COLS = newCols; ROWS = newRows; ui.cols.value = COLS; ui.rows.value = ROWS;
  resizeCanvas();
  render();
}
