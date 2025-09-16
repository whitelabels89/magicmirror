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
  goblinType: document.getElementById('goblinType'),
  treeVariant: document.getElementById('treeVariant'),
  treeScale: document.getElementById('treeScale'),
  btnAddTree: document.getElementById('btnAddTree'),
  btnClearTrees: document.getElementById('btnClearTrees'),
  sheepAnim: document.getElementById('sheepAnim'),
  sheepScale: document.getElementById('sheepScale'),
  btnAddSheep: document.getElementById('btnAddSheep'),
  btnClearSheep: document.getElementById('btnClearSheep'),
  decoScale: document.getElementById('decoScale'),
  btnAddDeco: document.getElementById('btnAddDeco'),
  btnClearDeco: document.getElementById('btnClearDeco'),
  torchAnim: document.getElementById('torchAnim'),
  torchScale: document.getElementById('torchScale'),
  btnAddTorch: document.getElementById('btnAddTorch'),
  btnClearTorch: document.getElementById('btnClearTorch'),
  // Marker tools
  markerTools: document.getElementById('markerTools'),
  // Building UI
  buildingFaction: document.getElementById('buildingFaction'),
  buildingType: document.getElementById('buildingType'),
  buildingColor: document.getElementById('buildingColor'),
  buildingState: document.getElementById('buildingState'),
  buildingScale: document.getElementById('buildingScale'),
  btnAddBuilding: document.getElementById('btnAddBuilding'),
  btnClearBuilding: document.getElementById('btnClearBuilding')
};

const LAYER_KEYS = ['ground','cliff_land','cliff_land2','cliff_water','slopes'];
const DECOR_LAYER = 'decor';
const GOBLIN_LAYER = 'goblin';
const BUILDING_LAYER = 'building';
let activeLayer = 'ground';

let tileSize = 64;
let COLS = 8, ROWS = 8; // fixed by inputs; no auto-fit
const EDGE_BLEED = 0; // disabled in fixed mode
let engineBooted = false;
// Marker states
let markerTool = 'none'; // none|start|goal|checkpoint|item|obstacle
let startRC = null; // {r,c}
let goalRC  = null; // {r,c}
const checkpoints = [];
const items = [];
const obstacles = [];

// 2D arrays of 0/1 per layer
const grids = {};
for(const k of ['water',...LAYER_KEYS]) grids[k] = null;

// History for Undo/Redo
// Supports two kinds of patches:
// - kind: 'grid'    → { layer, changes:[{x,y,prev,next}] }
// - kind: 'object'  → { target: 'tree'|'sheep'|'torch'|'building', ops:[{type:'add'|'remove'|'move', index, item, prev, next}] }
const history = [];
let histIdx = -1;

function pushHistory(patch){
  if(!patch) return;
  // validate grid patches: must have non-empty changes
  if(patch.kind === 'grid' || (!patch.kind && patch.layer)){
    if(!patch.changes || patch.changes.length===0) return;
  }
  // validate object patches: must have non-empty ops
  if(patch.kind === 'object'){
    if(!patch.ops || patch.ops.length===0) return;
  }
  if(histIdx < history.length-1) history.splice(histIdx+1);
  history.push(patch); histIdx = history.length-1;
  setStatus(`Undo stack: ${history.length}`);
}

function getObjectArray(target){
  if(target==='tree') return trees;
  if(target==='sheep') return sheeps;
  if(target==='deco') return decoItems;
  if(target==='torch') return torches;
  if(target==='building') return buildings;
  return null;
}

function applyPatch(patch, dir){
  if(!patch) return;
  const usePrev = (dir==='undo');
  // Backward compat: if no kind but has layer/changes, treat as grid
  if(patch.kind==='grid' || (!patch.kind && patch.layer)){
    const grid = grids[patch.layer]; if(!grid) return;
    for(const ch of patch.changes){
      if(ch.y>=0 && ch.y<ROWS && ch.x>=0 && ch.x<COLS){ grid[ch.y][ch.x] = usePrev ? ch.prev : ch.next; }
    }
    return;
  }
  if(patch.kind==='object'){
    const arr = getObjectArray(patch.target);
    if(!arr) return;
    // Apply ops in forward order for redo, reverse for undo to keep indices correct
    const ops = usePrev ? [...patch.ops].slice().reverse() : patch.ops;
    for(const op of ops){
      if(op.type==='add'){
        if(usePrev){ // undo add → remove
          if(Number.isInteger(op.index)) arr.splice(op.index, 1);
        }else{ // redo add → insert back
          if(Number.isInteger(op.index)) arr.splice(op.index, 0, { ...op.item });
          else arr.push({ ...op.item });
        }
      }else if(op.type==='remove'){
        if(usePrev){ // undo remove → reinsert
          if(Number.isInteger(op.index)) arr.splice(op.index, 0, { ...op.item });
          else arr.push({ ...op.item });
        }else{ // redo remove → remove again
          if(Number.isInteger(op.index)) arr.splice(op.index, 1);
          else {
            const idx = arr.findIndex(it => it===op.item);
            if(idx>=0) arr.splice(idx,1);
          }
        }
      }else if(op.type==='move'){
        const idx = Number.isInteger(op.index) ? op.index : -1;
        if(idx<0 || idx>=arr.length) continue;
        const obj = arr[idx];
        const state = usePrev ? op.prev : op.next;
        if(state && Number.isFinite(state.x) && Number.isFinite(state.y)){
          obj.x = state.x; obj.y = state.y;
        }
      }
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

  // Fixed grid (match GameVP4)
  // Default 15x11 on first load
  if(!ui.cols.value) ui.cols.value = 15;
  if(!ui.rows.value) ui.rows.value = 11;
  COLS = Math.max(4, Math.min(64, Number(ui.cols.value)||15));
  ROWS = Math.max(4, Math.min(64, Number(ui.rows.value)||11));
  resizeCanvas();

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
    {k:DECOR_LAYER, label:'Decor'},
    {k:GOBLIN_LAYER, label:'Goblin'},
    {k:BUILDING_LAYER, label:'Building'}
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
  // Match GameVP4 viewport width (520px) and map aspect ratio
  const board = document.getElementById('board');
  board.style.width = '900px';
  board.style.aspectRatio = `${COLS} / ${ROWS}`;
  // Scale canvases to fill board box
  const bw = board.clientWidth  || (COLS*tileSize);
  const bh = board.clientHeight || (ROWS*tileSize);
  cvs.style.width = bw + 'px';
  cvs.style.height = bh + 'px';
  const decor = document.getElementById('decor');
  if(decor){
    decor.width = cvs.width; decor.height = cvs.height;
    decor.style.width = cvs.style.width; decor.style.height = cvs.style.height;
  }
  render();
}

function setStatus(t){ ui.status.textContent = t; }

// Scale canvas CSS size to fit the board container while keeping crisp pixels
function fitCanvasToBoard(){ /* noop in fixed mode */ }

function render(){
  // Simple paint using TerrainAtlas directly (same coord logic as engine is heavy to clone). Use engine if already loaded.
  // Here, reuse TerrainEngine when available for accurate skirts and specials.
  (async () => {
    try{
      if(!engineBooted){
        await TerrainEngine.init({ atlasUrl: ATLAS_JSON, layersUrl: LAYERS_JSON, variant: ui.variant.value, canvas: cvs });
        await TerrainEngine.setWaterTexture('/elearn/models/ts-fp/Terrain/Water%20Background%20color.png');
        try{ await TerrainEngine.enableWaterWaves({ fps: 12, opacity: 0.7 }); }catch(_){ /* optional */ }
        engineBooted = true;
      }
      // apply grids
      const w = createGrid(COLS, ROWS, 0); for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) w[r][c] = grids.water[r][c];
      TerrainEngine.setGrid('water', w);
      for(const k of ['ground','cliff_land','cliff_land2','cliff_water','slopes']){
        const g = createGrid(COLS, ROWS, 0); const src = grids[k];
        for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) g[r][c] = src[r][c];
        TerrainEngine.setGrid(k, g);
      }
      await TerrainEngine.setVariant(ui.variant.value);
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
const TORCH_BASE = "/elearn/models/ts-up/Factions/Goblins/Troops/Torch/Purple/";
const TORCH_SHEET = TORCH_BASE + "Torch_Purple.png";
const TORCH_JSON = TORCH_BASE + "Torch_Purple.json";
const DECO_BASE = "/elearn/models/ts-up/Deco/";
const DECO_VARIANTS = Array.from({length:18}, (_,i)=> String(i+1).padStart(2,'0'));
const treeImgCache = new Map();
const treeFramesCache = new Map(); // key: idx -> frames
const trees = []; // {idx,x,y,scale,fps,fi,acc}
const sheepImgCache = new Map();
const sheepFramesCache = new Map(); // key: anim -> frames
const sheeps = []; // {anim,x,y,scale,fps,fi,acc}
let torchImg = null;
const torchFramesCache = new Map(); // key: anim -> frames
const torches = []; // {anim,x,y,scale,fps,fi,acc}
const decoImgCache = new Map(); // key: variant -> Image
const decoItems = []; // {variant,x,y,scale}

// --- Selection helpers for Goblin torches ---
function clearTorchSelection(){ for(const t of torches) t.selected = false; }
function anyTorchSelected(){ return torches.some(t=>!!t.selected); }
function hitTestTorch(px, py){
  // iterate from topmost (last drawn)
  for(let i=torches.length-1; i>=0; i--){
    const t = torches[i];
    const frames = torchFramesCache.get(t.anim);
    const f = (frames && (frames[t.fi] || frames[0])) || null;
    if(!f) continue;
    const dw = f.w * t.scale, dh = f.h * t.scale;
    const dx = t.x - 0.5 * dw, dy = t.y - dh;
    if(px >= dx && px <= dx + dw && py >= dy && py <= dy + dh){
      return { torch: t, index: i, bounds: {x:dx,y:dy,w:dw,h:dh} };
    }
  }
  return null;
}

// --- Buildings overlay ---
const buildingImgCache = new Map(); // key JSON -> Image
const buildings = []; // { faction, type, color, state, x, y, scale }
function buildingKey(b){ return JSON.stringify({faction:b.faction,type:b.type,color:b.color,state:b.state}); }
function hitTestBuilding(px, py){
  for(let i=buildings.length-1;i>=0;i--){
    const b = buildings[i];
    const img = buildingImgCache.get(buildingKey(b));
    if(!img) continue;
    const dw = img.width * (b.scale||1);
    const dh = img.height * (b.scale||1);
    const dx = b.x - 0.5*dw, dy = b.y - dh;
    if(px>=dx && px<=dx+dw && py>=dy && py<=dy+dh){ return { b, index:i, bounds:{x:dx,y:dy,w:dw,h:dh} }; }
  }
  return null;
}
function knightBuildingPath(type, color, state){
  const base = '/elearn/models/ts-up/Factions/Knights/Buildings/';
  if(type==='castle'){
    if(state==='construction') return base+'Castle/Castle_Construction.png';
    if(state==='destroyed')    return base+'Castle/Castle_Destroyed.png';
    const col=(color||'blue'); return base+`Castle/Castle_${col[0].toUpperCase()+col.slice(1)}.png`;
  }
  if(type==='tower'){
    if(state==='construction') return base+'Tower/Tower_Construction.png';
    if(state==='destroyed')    return base+'Tower/Tower_Destroyed.png';
    const col=(color||'blue'); return base+`Tower/Tower_${col[0].toUpperCase()+col.slice(1)}.png`;
  }
  const colMap = {house1:'blue', house2:'red', house3:'yellow'};
  const houseCol = colMap[type] || 'blue';
  if(state==='construction') return base+'House/House_Construction.png';
  if(state==='destroyed')    return base+'House/House_Destroyed.png';
  return base+`House/House_${houseCol[0].toUpperCase()+houseCol.slice(1)}.png`;
}
function goblinBuildingPath(type, color, state){
  const base = '/elearn/models/ts-up/Factions/Goblins/Buildings/';
  if(type==='wood_tower'){
    if(state==='construction') return base+'Wood_Tower/Wood_Tower_InConstruction.png';
    if(state==='destroyed')    return base+'Wood_Tower/Wood_Tower_Destroyed.png';
    const col=(color||'purple'); const cap=col[0].toUpperCase()+col.slice(1);
    return base+`Wood_Tower/Wood_Tower_${cap}.png`;
  }
  if(type==='wood_house'){
    if(state==='destroyed') return base+'Wood_House/Goblin_House_Destroyed.png';
    return base+'Wood_House/Goblin_House.png';
  }
  return null;
}
async function loadBuildingImage(spec){
  const key = JSON.stringify(spec);
  if(buildingImgCache.has(key)) return buildingImgCache.get(key);
  const src = spec.faction==='knight' ? knightBuildingPath(spec.type, spec.color, spec.state)
             : goblinBuildingPath(spec.type, spec.color, spec.state);
  if(!src) return null;
  const im = await loadImage(src).catch(()=>null);
  if(im) buildingImgCache.set(key, im);
  return im;
}

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
async function ensureTorchResources(anim){ await loadTorchImg(); await loadTorchFrames(anim); }
function normalizeDecoVariant(v){
  const str = String(v ?? '').trim();
  if(!str) return null;
  const num = parseInt(str, 10);
  if(!Number.isFinite(num)) return null;
  if(num < 1 || num > DECO_VARIANTS.length) return null;
  return String(num).padStart(2,'0');
}
async function ensureDecoImage(variant){
  const key = normalizeDecoVariant(variant);
  if(!key) return null;
  if(!decoImgCache.has(key)){
    const src = `${DECO_BASE}${key}.png`;
    const img = await loadImage(src).catch(()=>null);
    if(img) decoImgCache.set(key, img);
  }
  return decoImgCache.get(key) || null;
}

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

async function loadTorchImg(){ if(!torchImg) torchImg = await loadImage(TORCH_SHEET); return torchImg; }
async function loadTorchFrames(anim){
  const key = (anim||'idle').toLowerCase();
  if(torchFramesCache.has(key)) return torchFramesCache.get(key);

  // Parse Aseprite JSON
  let doc=null; try{ const r=await fetch(TORCH_JSON, {cache:'no-cache'}); if(r.ok) doc=await r.json(); }catch(_){ doc=null; }
  let rawFrames=[];
  if(doc && doc.frames && doc.meta && Array.isArray(doc.meta.frameTags)){
    const framesArray = Object.values(doc.frames);
    const tag = doc.meta.frameTags.find(t => (t.name||'').toLowerCase()===key);
    if(tag){
      for(let i=tag.from;i<=tag.to;i++){
        const f=framesArray[i];
        if(f?.frame?.w>0 && f?.frame?.h>0){
          rawFrames.push({ sx:f.frame.x, sy:f.frame.y, w:f.frame.w, h:f.frame.h, dur:f.duration||100 });
        }
      }
    }
  }

  // If nothing parsed, fallback to a simple 3-frame strip guess
  if(rawFrames.length===0){
    const w=192,h=192; const guess=[]; for(let i=0;i<3;i++) guess.push({sx:i*w, sy:0, w, h, dur:100});
    torchFramesCache.set(key, guess); return guess;
  }

  // Filter out blank/transparent frames to avoid flicker
  await loadTorchImg();
  const off = document.createElement('canvas');
  off.width = Math.max(...rawFrames.map(f=>f.w)) || 1;
  off.height = Math.max(...rawFrames.map(f=>f.h)) || 1;
  const octx = off.getContext('2d', { willReadFrequently:true });
  const filtered = [];
  for(const f of rawFrames){
    octx.clearRect(0,0,off.width,off.height);
    // draw current frame at 0,0
    octx.drawImage(torchImg, f.sx, f.sy, f.w, f.h, 0, 0, f.w, f.h);
    const imgd = octx.getImageData(0,0,f.w,f.h);
    // quick alpha sum check
    let alphaSum = 0; const data = imgd.data;
    for(let i=3;i<data.length;i+=4) alphaSum += data[i];
    if(alphaSum > 0){ filtered.push(f); }
  }

  const frames = filtered.length>0 ? filtered : rawFrames; // never return empty
  torchFramesCache.set(key, frames); return frames;
}

function drawDecor(ts){
  const dt = ts - decorLast; decorLast = ts;
  dctx.clearRect(0,0,decor.width, decor.height);
  const list = [];
  for(const t of trees){ list.push({ y:t.y, draw:()=>{ t.acc += dt; const frames=treeFramesCache.get(t.idx); if(!frames) return; const img=treeImgCache.get(t.idx); let ms=frames[t.fi]?.dur || (1000/Math.max(1,t.fps||10)); while(t.acc>=ms){ t.acc-=ms; t.fi=(t.fi+1)%frames.length; ms=frames[t.fi]?.dur || (1000/Math.max(1,t.fps||10)); } const f=frames[t.fi]; const dw=f.w*t.scale, dh=f.h*t.scale; const dx=Math.round(t.x-0.5*dw), dy=Math.round(t.y-dh+20); dctx.drawImage(img,f.sx,f.sy,f.w,f.h,dx,dy,dw,dh); }}); }
  for(const s of sheeps){ list.push({ y:s.y, draw:()=>{ s.acc += dt; const frames=sheepFramesCache.get(s.anim); if(!frames) return; const img=sheepImgCache.get(s.anim); let ms=frames[s.fi]?.dur || (1000/Math.max(1,s.fps||10)); while(s.acc>=ms){ s.acc-=ms; s.fi=(s.fi+1)%frames.length; ms=frames[s.fi]?.dur || (1000/Math.max(1,s.fps||10)); } const f=frames[s.fi]; const dw=f.w*s.scale, dh=f.h*s.scale; const dx=Math.round(s.x-0.5*dw), dy=Math.round(s.y-dh+50); dctx.drawImage(img,f.sx,f.sy,f.w,f.h,dx,dy,dw,dh); }}); }
  for(const d of decoItems){ list.push({ y:d.y, draw:()=>{ const img=decoImgCache.get(d.variant); if(!img) return; const sc=d.scale||1; const dw=img.width*sc, dh=img.height*sc; const dx=Math.round(d.x-0.5*dw), dy=Math.round(d.y-dh); dctx.drawImage(img, dx, dy, dw, dh); }}); }
  for(const t of torches){ list.push({ y:t.y, draw:()=>{ t.acc += dt; const frames=torchFramesCache.get(t.anim); if(!frames || !torchImg) return; let ms=frames[t.fi]?.dur || (1000/Math.max(1,t.fps||10)); while(t.acc>=ms){ t.acc-=ms; t.fi=(t.fi+1)%frames.length; ms=frames[t.fi]?.dur || (1000/Math.max(1,t.fps||10)); } const f=frames[t.fi]; const dw=f.w*t.scale, dh=f.h*t.scale; const dx=Math.round(t.x-0.5*dw), dy=Math.round(t.y-dh); dctx.drawImage(torchImg,f.sx,f.sy,f.w,f.h,dx,dy,dw,dh); if(t.selected){ dctx.save(); dctx.strokeStyle = '#facc15'; dctx.lineWidth = 2; dctx.setLineDash([4,3]); dctx.strokeRect(dx, dy, dw, dh); dctx.restore(); } }}); }
  for(const b of buildings){ list.push({ y:b.y, draw:()=>{ const spec={ faction:b.faction, type:b.type, color:b.color, state:b.state }; const key=JSON.stringify(spec); const img = buildingImgCache.get(key); if(!img) return; const dw = img.width*(b.scale||1), dh = img.height*(b.scale||1); const dx=Math.round(b.x-0.5*dw), dy=Math.round(b.y-dh); dctx.drawImage(img, dx, dy, dw, dh); }}); }
  list.sort((a,b)=>a.y-b.y); for(const it of list) it.draw();
  // Draw markers (start/goal/checkpoints/items/obstacles)
  const t = tileSize;
  const drawCellRect = (r,c,color)=>{
    const x = c*t, y = r*t; dctx.save(); dctx.globalAlpha=0.9; dctx.fillStyle=color; dctx.strokeStyle='rgba(0,0,0,0.5)'; dctx.lineWidth=2; if(dctx.roundRect){ dctx.beginPath(); dctx.roundRect(x+6,y+6,t-12,t-12,6); dctx.fill(); dctx.stroke(); } else { dctx.fillRect(x+6,y+6,t-12,t-12); dctx.strokeRect(x+6,y+6,t-12,t-12);} dctx.restore();
  };
  const drawFlag = (r,c,text,bg)=>{ drawCellRect(r,c,bg); dctx.fillStyle='#0b1220'; dctx.font=`${Math.floor(t*0.45)}px system-ui`; dctx.textAlign='center'; dctx.textBaseline='middle'; dctx.fillText(text, c*t + t/2, r*t + t/2); };
  if(startRC) drawFlag(startRC.r,startRC.c,'S','#22c55e');
  if(goalRC)  drawFlag(goalRC.r, goalRC.c, 'G', '#fbbf24');
  for(const p of checkpoints) drawFlag(p.r,p.c,'C','#60a5fa');
  for(const p of items)       drawFlag(p.r,p.c,'I','#a78bfa');
  for(const p of obstacles)   drawFlag(p.r,p.c,'X','#ef4444');
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
  // When painting on terrain layers, encode palette variant per cell (1..3) based on UI variant
  let nextVal = val;
  if(val){
    const vname = (ui.variant?.value)||'color1';
    const m = /color(\d+)/.exec(vname);
    const code = m ? Math.max(1, Math.min(9, parseInt(m[1],10)||1)) : 1;
    nextVal = code;
  } else {
    nextVal = 0;
  }
  if(prev === nextVal) return;
  grids[activeLayer][y][x] = nextVal;
  if(currentPatch){
    if(!currentPatch._seen) currentPatch._seen = new Set();
    const key = `${x},${y}`;
    if(!currentPatch._seen.has(key)){
      currentPatch._seen.add(key);
      currentPatch.changes.push({x,y,prev,next:nextVal});
    }
  }
}
function paintLine(a,b,val){
  const dx = Math.sign(b.x - a.x); const dy = Math.sign(b.y - a.y);
  let x=a.x,y=a.y; drawCell(x,y,val);
  while(x!==b.x || y!==b.y){ if(x!==b.x) x+=dx; if(y!==b.y) y+=dy; drawCell(x,y,val);} 
}

function bindUI(){
  let draggingB = null; let dragOffX=0, dragOffY=0; let dragStartB = null;
  let draggingTorch = null; let dragStartTorch = null; let dragOffTX=0, dragOffTY=0; let dragTorchIndex=-1;
  let draggingTree = null; let dragStartTree = null; let dragOffTrX=0, dragOffTrY=0; let dragTreeIndex=-1;
  let draggingSheep = null; let dragStartSheep = null; let dragOffShX=0, dragOffShY=0; let dragSheepIndex=-1;
  let draggingDeco = null; let dragStartDeco = null; let dragOffDeX=0, dragOffDeY=0; let dragDecoIndex=-1;
  cvs.addEventListener('mousedown', async (e)=>{
    e.preventDefault();
    // Marker placement/removal
    if(markerTool && markerTool!=='none'){
      const cell = cellFromEvent(e); if(!cell) return;
      const r = cell.y, c = cell.x; const isErase = (e.button===2 || eraser);
      const findIdx = (arr)=> arr.findIndex(p=>p.r===r && p.c===c);
      if(markerTool==='start'){
        if(isErase){ if(startRC && startRC.r===r && startRC.c===c) startRC=null; }
        else startRC = {r,c};
      }else if(markerTool==='goal'){
        if(isErase){ if(goalRC && goalRC.r===r && goalRC.c===c) goalRC=null; }
        else goalRC = {r,c};
      }else if(markerTool==='checkpoint'){
        const i = findIdx(checkpoints); if(isErase){ if(i>=0) checkpoints.splice(i,1); } else if(i<0){ checkpoints.push({r,c}); }
      }else if(markerTool==='item'){
        const i = findIdx(items); if(isErase){ if(i>=0) items.splice(i,1); } else if(i<0){ items.push({r,c}); }
      }else if(markerTool==='obstacle'){
        const i = findIdx(obstacles); if(isErase){ if(i>=0) obstacles.splice(i,1); } else if(i<0){ obstacles.push({r,c}); }
      }
      render();
      return;
    }
    if(activeLayer===DECOR_LAYER){
      const p = getCanvasXY(e);
      // Hit-test decor (trees and sheep), topmost wins
      const hitDecor = (px, py)=>{
        // check sheep then trees for perceived top-to-bottom draw order (both are y-sorted later)
        // iterate from last to first to get topmost
        for(let i=sheeps.length-1;i>=0;i--){
          const s = sheeps[i]; const frames = sheepFramesCache.get((s.anim||'idle').toLowerCase()); const f = (frames && (frames[s.fi]||frames[0]))||null; if(!f) continue;
          const dw = f.w * s.scale, dh = f.h * s.scale; const dx = s.x - 0.5*dw, dy = s.y - dh;
          if(px>=dx && px<=dx+dw && py>=dy && py<=dy+dh) return { kind:'sheep', obj:s, index:i };
        }
        for(let i=decoItems.length-1;i>=0;i--){
          const d = decoItems[i]; const img = decoImgCache.get(d.variant); if(!img) continue;
          const sc = d.scale||1; const dw = img.width * sc, dh = img.height * sc;
          const dx = d.x - 0.5*dw, dy = d.y - dh;
          if(px>=dx && px<=dx+dw && py>=dy && py<=dy+dh) return { kind:'deco', obj:d, index:i };
        }
        for(let i=trees.length-1;i>=0;i--){
          const t = trees[i]; const frames = treeFramesCache.get(t.idx); const f = (frames && (frames[t.fi]||frames[0]))||null; if(!f) continue;
          const dw = f.w * t.scale, dh = f.h * t.scale; const dx = t.x - 0.5*dw, dy = t.y - dh;
          if(px>=dx && px<=dx+dw && py>=dy && py<=dy+dh) return { kind:'tree', obj:t, index:i };
        }
        return null;
      };
      const hit = hitDecor(p.x, p.y);
      // Erase if eraser ON or right-click
      if(hit && (eraser || e.button===2)){
        let arr = null; let target = hit.kind;
        if(hit.kind==='tree'){ arr = trees; target='tree'; }
        else if(hit.kind==='sheep'){ arr = sheeps; target='sheep'; }
        else if(hit.kind==='deco'){ arr = decoItems; target='deco'; }
        if(arr){
          const removed = arr.splice(hit.index,1)[0];
          if(removed){
            pushHistory({ kind:'object', target, ops:[{ type:'remove', index: hit.index, item: { ...removed } }] });
          }
        }
        return;
      }
      // Start dragging if clicked existing decor
      if(hit){
        if(hit.kind==='tree'){ draggingTree = hit.obj; dragTreeIndex = hit.index; dragStartTree = { x:hit.obj.x, y:hit.obj.y }; dragOffTrX = p.x - hit.obj.x; dragOffTrY = p.y - hit.obj.y; }
        else if(hit.kind==='sheep'){ draggingSheep = hit.obj; dragSheepIndex = hit.index; dragStartSheep = { x:hit.obj.x, y:hit.obj.y }; dragOffShX = p.x - hit.obj.x; dragOffShY = p.y - hit.obj.y; }
        else if(hit.kind==='deco'){ draggingDeco = hit.obj; dragDecoIndex = hit.index; dragStartDeco = { x:hit.obj.x, y:hit.obj.y }; dragOffDeX = p.x - hit.obj.x; dragOffDeY = p.y - hit.obj.y; }
        return;
      }
      // Place new decor
      const type = (ui.decorType?.value||'tree');
      if(type==='tree'){
        const idx = parseInt(ui.treeVariant.value,10)||1; const sc = parseFloat(ui.treeScale.value)||1; await ensureTreeResources(idx);
        const item = { idx, x:p.x, y:p.y, scale:sc, fps:10, fi:0, acc:0 };
        trees.push(item);
        pushHistory({ kind:'object', target:'tree', ops:[{ type:'add', index: trees.length-1, item: { ...item } }] });
      }else if(type==='sheep'){
        const anim = (ui.sheepAnim?.value)||'idle'; const sc = parseFloat(ui.sheepScale?.value)||1; await ensureSheepResources(anim);
        const item = { anim, x:p.x, y:p.y, scale:sc, fps:10, fi:0, acc:0 };
        sheeps.push(item);
        pushHistory({ kind:'object', target:'sheep', ops:[{ type:'add', index: sheeps.length-1, item: { ...item } }] });
      }else if(type && type.startsWith('deco-')){
        const variant = normalizeDecoVariant(type.slice(5));
        const img = await ensureDecoImage(variant);
        if(img && variant){
          const sc = parseFloat(ui.decoScale?.value)||1;
          const item = { variant, x:p.x, y:p.y, scale:sc };
          decoItems.push(item);
          pushHistory({ kind:'object', target:'deco', ops:[{ type:'add', index: decoItems.length-1, item: { ...item } }] });
        }
      }
      return;
    }else if(activeLayer===GOBLIN_LAYER){
      const p = getCanvasXY(e);
      const type = (ui.goblinType?.value||'torch');
      // Selection first: click on existing torch selects it
      const hit = hitTestTorch(p.x, p.y);
      // Erase if eraser or right click on hit
      if(hit && (eraser || e.button===2)){
        const removed = torches.splice(hit.index,1)[0];
        pushHistory({ kind:'object', target:'torch', ops:[{ type:'remove', index: hit.index, item: { ...removed } }] });
        return;
      }
      if(hit){
        if(e.ctrlKey || e.metaKey){ hit.torch.selected = !hit.torch.selected; }
        else { clearTorchSelection(); hit.torch.selected = true; }
        // Start dragging the single hit torch
        draggingTorch = hit.torch; dragTorchIndex = hit.index; dragStartTorch = { x:hit.torch.x, y:hit.torch.y };
        dragOffTX = p.x - hit.torch.x; dragOffTY = p.y - hit.torch.y;
        return; // don't place a new one when selecting
      }
      // Click empty space: clear selection (unless multi-select modifier) and optionally place new torch
      if(!(e.ctrlKey || e.metaKey)) clearTorchSelection();
      if(type==='torch'){
        const anim = (ui.torchAnim?.value)||'idle';
        const sc = parseFloat(ui.torchScale?.value)||1;
        await ensureTorchResources(anim);
        const item = { anim:anim.toLowerCase(), x:p.x, y:p.y, scale:sc, fps:10, fi:0, acc:0, selected:false };
        torches.push(item);
        pushHistory({ kind:'object', target:'torch', ops:[{ type:'add', index: torches.length-1, item: { ...item } }] });
      }
      return;
    }else if(activeLayer===BUILDING_LAYER){
      const p = getCanvasXY(e);
      const hit = hitTestBuilding(p.x, p.y);
      // Erase if eraser ON or right click
      if(hit && (eraser || e.button===2)){
        const removed = buildings.splice(hit.index,1)[0];
        pushHistory({ kind:'object', target:'building', ops:[{ type:'remove', index: hit.index, item: { ...removed } }] });
        return;
      }
      if(hit){
        // start dragging
        draggingB = hit.b; dragStartB = { x:hit.b.x, y:hit.b.y };
        dragOffX = p.x - draggingB.x;
        dragOffY = p.y - draggingB.y;
        return;
      }
      // place new
      const faction = (ui.buildingFaction?.value)||'knight';
      let type = (ui.buildingType?.value)||'castle';
      const color = (ui.buildingColor?.value)||'blue';
      const state = (ui.buildingState?.value)||'normal';
      if(faction==='goblin'){ type = (type==='tower') ? 'wood_tower' : 'wood_house'; }
      const spec = { faction, type, color, state };
      const img = await loadBuildingImage(spec);
      if(img){ const sc = parseFloat(ui.buildingScale?.value)||1; const item = { ...spec, x:p.x, y:p.y, scale:sc }; buildings.push(item); pushHistory({ kind:'object', target:'building', ops:[{ type:'add', index: buildings.length-1, item: { ...item } }] }); }
      return;
    }
    const cell = cellFromEvent(e); if(!cell) return;
    painting = true; paintValue = (e.button===2 || eraser) ? 0 : 1; lastCell = cell;
    currentPatch = { kind:'grid', layer: activeLayer, changes: [] };
    if(e.shiftKey && lastCell){ paintLine(lastCell, cell, paintValue);} else { drawCell(cell.x, cell.y, paintValue); }
    render();
  }, { passive:false });
  cvs.addEventListener('mousemove', (e)=>{
    e.preventDefault();
    // Drag building if any
    if(draggingB){ const p = getCanvasXY(e); draggingB.x = p.x - dragOffX; draggingB.y = p.y - dragOffY; return; }
    // Drag torch if any
    if(draggingTorch){ const p = getCanvasXY(e); draggingTorch.x = p.x - dragOffTX; draggingTorch.y = p.y - dragOffTY; return; }
    // Drag tree if any
    if(draggingTree){ const p = getCanvasXY(e); draggingTree.x = p.x - dragOffTrX; draggingTree.y = p.y - dragOffTrY; return; }
    // Drag sheep if any
    if(draggingSheep){ const p = getCanvasXY(e); draggingSheep.x = p.x - dragOffShX; draggingSheep.y = p.y - dragOffShY; return; }
    // Drag deco png if any
    if(draggingDeco){ const p = getCanvasXY(e); draggingDeco.x = p.x - dragOffDeX; draggingDeco.y = p.y - dragOffDeY; return; }
    if(!painting) return; const cell = cellFromEvent(e); if(!cell) return;
    if(e.shiftKey && lastCell){ paintLine(lastCell, cell, paintValue); lastCell=cell; }
    else { drawCell(cell.x, cell.y, paintValue); lastCell = cell; }
    render();
  }, { passive:false });
  cvs.addEventListener('mouseup', ()=>{
    // Finish building drag → record move
    if(draggingB && dragStartB){ const idx = buildings.indexOf(draggingB); if(idx>=0){ pushHistory({ kind:'object', target:'building', ops:[{ type:'move', index: idx, prev: { ...dragStartB }, next: { x:draggingB.x, y:draggingB.y } }] }); } }
    draggingB=null; dragStartB=null;
    if(draggingTorch && dragStartTorch){ const idx = dragTorchIndex; if(idx>=0){ pushHistory({ kind:'object', target:'torch', ops:[{ type:'move', index: idx, prev: { ...dragStartTorch }, next: { x:draggingTorch.x, y:draggingTorch.y } }] }); } }
    draggingTorch=null; dragStartTorch=null; dragTorchIndex=-1;
    if(draggingTree && dragStartTree){ const idx = dragTreeIndex; if(idx>=0){ pushHistory({ kind:'object', target:'tree', ops:[{ type:'move', index: idx, prev: { ...dragStartTree }, next: { x:draggingTree.x, y:draggingTree.y } }] }); } }
    draggingTree=null; dragStartTree=null; dragTreeIndex=-1;
    if(draggingSheep && dragStartSheep){ const idx = dragSheepIndex; if(idx>=0){ pushHistory({ kind:'object', target:'sheep', ops:[{ type:'move', index: idx, prev: { ...dragStartSheep }, next: { x:draggingSheep.x, y:draggingSheep.y } }] }); } }
    draggingSheep=null; dragStartSheep=null; dragSheepIndex=-1;
    if(draggingDeco && dragStartDeco){ const idx = dragDecoIndex; if(idx>=0){ pushHistory({ kind:'object', target:'deco', ops:[{ type:'move', index: idx, prev: { ...dragStartDeco }, next: { x:draggingDeco.x, y:draggingDeco.y } }] }); } }
    draggingDeco=null; dragStartDeco=null; dragDecoIndex=-1;
    painting=false; lastCell=null; pushHistory(currentPatch); currentPatch=null;
  });
  cvs.addEventListener('mouseleave', ()=>{
    // cancel drags without recording move
    draggingB=null; dragStartB=null; draggingTorch=null; dragStartTorch=null; dragTorchIndex=-1; draggingTree=null; dragStartTree=null; dragTreeIndex=-1; draggingSheep=null; dragStartSheep=null; dragSheepIndex=-1; draggingDeco=null; dragStartDeco=null; dragDecoIndex=-1;
    if(painting){ pushHistory(currentPatch); } painting=false; lastCell=null; currentPatch=null;
  });
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
  if(ui.btnAddDeco){
    ui.btnAddDeco.onclick = async ()=>{
      const type = (ui.decorType?.value)||'deco-01';
      const selected = (type && type.startsWith('deco-')) ? type.slice(5) : '01';
      const variant = normalizeDecoVariant(selected) || '01';
      const img = await ensureDecoImage(variant);
      if(img){ const sc=parseFloat(ui.decoScale?.value)||1; decoItems.push({ variant, x:cvs.width/2, y:cvs.height-32, scale:sc }); }
    };
  }
  if(ui.btnClearDeco){ ui.btnClearDeco.onclick = ()=>{ decoItems.length=0; }; }
  ui.btnAddTorch.onclick = async ()=>{ const anim=(ui.torchAnim?.value)||'idle'; const sc=parseFloat(ui.torchScale?.value)||1; await ensureTorchResources(anim); torches.push({ anim:anim.toLowerCase(), x:cvs.width/2, y:cvs.height-32, scale:sc, fps:10, fi:0, acc:0 }); };
  ui.btnClearTorch.onclick = ()=>{ torches.length=0; };
  ui.btnAddBuilding.onclick = async ()=>{ const faction=(ui.buildingFaction?.value)||'knight'; let type=(ui.buildingType?.value)||'castle'; const color=(ui.buildingColor?.value)||'blue'; const state=(ui.buildingState?.value)||'normal'; if(faction==='goblin') type=(type==='tower')?'wood_tower':'wood_house'; const spec={faction,type,color,state}; const img=await loadBuildingImage(spec); if(img){ const sc=parseFloat(ui.buildingScale?.value)||1; buildings.push({ ...spec, x:cvs.width/2, y:cvs.height-32, scale:sc }); } };
  ui.btnClearBuilding.onclick = ()=>{ buildings.length=0; };
  document.getElementById('btnUndo').onclick = ()=> undo();
  document.getElementById('btnRedo').onclick = ()=> redo();
  document.getElementById('btnEraser').onclick = (e)=>{ eraser = !eraser; e.currentTarget.textContent = `Eraser: ${eraser? 'ON':'OFF'}`; };

  ui.variant.onchange = async ()=>{ await TerrainEngine.setVariant(ui.variant.value); render(); };

  // Marker tool selection
  if(ui.markerTools){
    ui.markerTools.addEventListener('change', (ev)=>{
      const input = ev.target.closest('input[type="radio"][name="markerTool"]');
      if(!input) return; markerTool = input.value || 'none'; setStatus(`Marker: ${markerTool}`);
    });
  }

  // When changing Goblin anim in the panel, update existing torches too
  if(ui.torchAnim){
    ui.torchAnim.onchange = async ()=>{
      const anim = (ui.torchAnim?.value)||'idle';
      await ensureTorchResources(anim);
      const target = anyTorchSelected() ? torches.filter(t=>t.selected) : torches;
      for(const t of target){ t.anim = anim.toLowerCase(); t.fi=0; t.acc=0; }
    };
  }

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

  // Fixed mode: no auto expand
}

function toJson(){
  const toMask = (g)=> g.map(row=> row.map(v=>v?1:0).join(''));
  const toColors = (g)=> g.map(row=> row.map(v=> (Number.isFinite(v)? v|0 : (v?1:0))).join(''));
  const board = document.getElementById('board');
  const cssW = Math.round(parseFloat(getComputedStyle(board).width));
  const cssH = Math.round(parseFloat(getComputedStyle(board).height));
  return {
    variant: ui.variant.value,
    cols: COLS,
    rows: ROWS,
    tileSize,
    viewport: { cssWidth: cssW, cssHeight: cssH },
    layers: {
      water: toMask(grids.water),
      ground: toMask(grids.ground),
      cliff_land: toMask(grids.cliff_land),
      cliff_land2: toMask(grids.cliff_land2),
      cliff_water: toMask(grids.cliff_water),
      slopes: toMask(grids.slopes)
    },
    // Store exact per-cell palette codes (0..3) for mixed colors rendering
    colors: {
      ground: toColors(grids.ground),
      cliff_land: toColors(grids.cliff_land),
      cliff_land2: toColors(grids.cliff_land2),
      cliff_water: toColors(grids.cliff_water),
      slopes: toColors(grids.slopes)
    },
    decorTrees: trees.map(t=>({type:t.idx, x:Math.round(t.x), y:Math.round(t.y), scale:t.scale})),
    decorSheep: sheeps.map(s=>({anim:s.anim, x:Math.round(s.x), y:Math.round(s.y), scale:s.scale})),
    decorPngs: decoItems.map(d=>({variant:d.variant, x:Math.round(d.x), y:Math.round(d.y), scale:d.scale})),
    goblinTorches: torches.map(t=>({anim:t.anim, x:Math.round(t.x), y:Math.round(t.y), scale:t.scale})),
    buildings: buildings.map(b=>({faction:b.faction,type:b.type,color:b.color,state:b.state,x:Math.round(b.x),y:Math.round(b.y),scale:b.scale})),
    start: startRC ? { r:startRC.r, c:startRC.c } : undefined,
    goal:  goalRC  ? { r:goalRC.r,  c:goalRC.c  } : undefined,
    checkpoints: checkpoints.map(p=>({r:p.r,c:p.c})),
    items: items.map(p=>({r:p.r,c:p.c})),
    obstacles: obstacles.map(p=>({r:p.r,c:p.c}))
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
  const readColors = (arr)=>{
    const g = createGrid(COLS, ROWS, 0);
    for(let r=0;r<ROWS;r++){
      const s = arr?.[r] || ''.padEnd(COLS,'0');
      for(let c=0;c<COLS;c++){
        const ch = s.charAt(c);
        const n = parseInt(ch,10);
        g[r][c] = Number.isFinite(n) ? n : (ch==='1'?1:0);
      }
    }
    return g;
  };
  grids.water       = readMask(doc.layers?.water);
  // Prefer exact color codes if provided; fallback to masks
  grids.ground      = doc.colors?.ground      ? readColors(doc.colors.ground)      : readMask(doc.layers?.ground);
  grids.cliff_land  = doc.colors?.cliff_land  ? readColors(doc.colors.cliff_land)  : readMask(doc.layers?.cliff_land);
  grids.cliff_land2 = doc.colors?.cliff_land2 ? readColors(doc.colors.cliff_land2) : readMask(doc.layers?.cliff_land2);
  grids.cliff_water = doc.colors?.cliff_water ? readColors(doc.colors.cliff_water) : readMask(doc.layers?.cliff_water);
  grids.slopes      = doc.colors?.slopes      ? readColors(doc.colors.slopes)      : readMask(doc.layers?.slopes);
  trees.length=0; sheeps.length=0; decoItems.length=0; torches.length=0; buildings.length=0;
  (doc.decorTrees||[]).forEach(async it=>{ const idx=it.type||1; await ensureTreeResources(idx); trees.push({ idx, x:it.x||0, y:it.y||0, scale:it.scale||1, fps:10, fi:0, acc:0 }); });
  (doc.decorSheep||[]).forEach(async it=>{ const anim=(it.anim||'idle'); await ensureSheepResources(anim); sheeps.push({ anim, x:it.x||0, y:it.y||0, scale:it.scale||1, fps:10, fi:0, acc:0 }); });
  (doc.decorPngs||[]).forEach(async it=>{ const variant=normalizeDecoVariant(it.variant||it.id||it.type); const img=await ensureDecoImage(variant); if(img && variant){ decoItems.push({ variant, x:it.x||0, y:it.y||0, scale:it.scale||1 }); } });
  (doc.goblinTorches||doc.decorTorches||[]).forEach(async it=>{ const anim=(it.anim||'idle'); await ensureTorchResources(anim); torches.push({ anim:anim.toLowerCase(), x:it.x||0, y:it.y||0, scale:it.scale||1, fps:10, fi:0, acc:0 }); });
  (doc.buildings||[]).forEach(async it=>{ const spec={ faction:it.faction||'knight', type:it.type||'castle', color:it.color||'blue', state:it.state||'normal' }; await loadBuildingImage(spec); buildings.push({ ...spec, x:it.x||0, y:it.y||0, scale:it.scale||1 }); });
  // markers
  startRC = (doc.start && Number.isFinite(doc.start.r) && Number.isFinite(doc.start.c)) ? { r:doc.start.r|0, c:doc.start.c|0 } : null;
  goalRC  = (doc.goal  && Number.isFinite(doc.goal.r)  && Number.isFinite(doc.goal.c))  ? { r:doc.goal.r|0,  c:doc.goal.c|0  } : null;
  checkpoints.length=0; (doc.checkpoints||[]).forEach(p=>{ if(Number.isFinite(p.r)&&Number.isFinite(p.c)) checkpoints.push({r:p.r|0,c:p.c|0}); });
  items.length=0;       (doc.items||[]).forEach(p=>{ if(Number.isFinite(p.r)&&Number.isFinite(p.c)) items.push({r:p.r|0,c:p.c|0}); });
  obstacles.length=0;   (doc.obstacles||[]).forEach(p=>{ if(Number.isFinite(p.r)&&Number.isFinite(p.c)) obstacles.push({r:p.r|0,c:p.c|0}); });
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
