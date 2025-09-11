// elearn/models/ts-fp/Terrain/script/trees.js
// Minimal tree animation module (no external libs). ES Module.
// Usage in terrain.html:
//   import { initTrees, spawnTree } from "../../Terrain/script/trees.js";
//   await initTrees({ canvas: "#trees-canvas" });
//   spawnTree({ type: "pineA", x: 640, y: 620, scale: 1 });

// === CONFIG ===
const BASE = "/elearn/models/ts-fp/Decorations/Trees/"; // sprite sheets location
const ATLAS = {
  // 4 tree variants; each sheet = 1 row, 8 frames
  pineA:  BASE + "Tree1.png",
  pineB:  BASE + "Tree2.png",
  birchA: BASE + "Tree3.png",
  birchB: BASE + "Tree4.png",
};

// From Aseprite export (Trees.json): each frame 192x256, 8 frames per tag
const FRAME_W = 192;
const FRAME_H = 256;
const FRAMES  = 8;
const DEFAULT_FPS = 10; // ~100 ms per frame

// draw reference: bottom-center sits on ground
const ANCHOR = { x: 0.5, y: 1.0 };

// === SIMPLE LOADER ===
function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image load failed: ${src}`));
    img.src = src;
  });
}

const imgCache = new Map(); // key: type → HTMLImageElement
async function getImage(type){
  if (!ATLAS[type]) throw new Error(`Unknown tree type: ${type}`);
  if (!imgCache.has(type)) {
    try {
      imgCache.set(type, await loadImage(ATLAS[type]));
    } catch (err) {
      console.error('[trees] load error for', type, ATLAS[type], err);
      throw err;
    }
  }
  return imgCache.get(type);
}

// === TREE ENTITY ===
class TreeSprite {
  constructor({ type, x, y, scale = 1, fps = DEFAULT_FPS, randomStart = true, footLift = 0 }){
    this.type = type;
    this.x = x; this.y = y;
    this.scale = scale;
    this.msPerFrame = 1000 / Math.max(1, fps);
    this.timeAcc = randomStart ? Math.random() * 9999 : 0;
    this.frameIdx = 0;
    this.img = null; // set on first draw
    this.footLift = footLift | 0;
  }
  async ensureImage(){
    if (!this.img) this.img = await getImage(this.type);
  }
  update(dt){
    this.timeAcc += dt;
    while (this.timeAcc >= this.msPerFrame){
      this.timeAcc -= this.msPerFrame;
      this.frameIdx = (this.frameIdx + 1) % FRAMES;
    }
  }
  draw(ctx){
    if (!this.img) return;
    const sx = this.frameIdx * FRAME_W;
    const sy = 0; // single row
    const dw = FRAME_W * this.scale;
    const dh = FRAME_H * this.scale;
    const dx = this.x - ANCHOR.x * dw;
    const dy = this.y - ANCHOR.y * dh - this.footLift;
    ctx.drawImage(this.img, sx, sy, FRAME_W, FRAME_H, dx, dy, dw, dh);
  }
}

// === RUNTIME STATE ===
const _state = {
  ctx: null,
  sprites: [],
  running: false,
  last: 0,
  clearEachFrame: true,
};

function _resortByY(){
  _state.sprites.sort((a,b)=> (a.y === b.y ? a.x - b.x : a.y - b.y));
}

function _loop(now){
  if (!_state.running) return;
  const dt = now - _state.last; _state.last = now;
  const { ctx } = _state;
  if (!ctx) return;

  if (_state.clearEachFrame){
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  for (const s of _state.sprites) s.update(dt);
  for (const s of _state.sprites) s.draw(ctx);

  requestAnimationFrame(_loop);
}

// === PUBLIC API ===
export async function initTrees({ canvas = "#trees-canvas", clearEachFrame = true } = {}){
  // Prefer dedicated trees canvas if present; fallback to #terrain-canvas
  let cvs = document.querySelector(canvas) || document.querySelector("#terrain-canvas");
  if (!cvs) throw new Error("Canvas for trees not found. Provide a canvas selector or add #terrain-canvas.");
  _state.ctx = cvs.getContext("2d", { alpha: true });
  _state.clearEachFrame = !!clearEachFrame;
  _state.sprites.length = 0;
  _state.last = performance.now();
  _state.running = true;
  requestAnimationFrame(_loop);
}

export async function spawnTree({ type = "pineA", x = 640, y = 600, scale = 1, fps = DEFAULT_FPS, randomStart = true, footLift = 0 } = {}){
  const spr = new TreeSprite({ type, x, y, scale, fps, randomStart, footLift });
  await spr.ensureImage();
  _state.sprites.push(spr);
  _resortByY();
  return spr;
}

export function stopTrees(){ _state.running = false; }
export function startTrees(){
  if (_state.running) return;
  _state.running = true;
  _state.last = performance.now();
  requestAnimationFrame(_loop);
}

export function clearTrees(){
  _state.sprites.length = 0;
}

export async function spawnForest({
  area,                 // { x, y, width, height }
  count,                // optional fixed count
  density,              // optional density per 10k px^2 (ignored if count given)
  types = ["pineA","birchA","pineB","birchB"],
  scaleRange = [0.9, 1.1],
  fpsRange = [8, 12],
  jitterY = 0,          // add small random y-offset to mimic depth variance
  avoidMinDist = 0,     // minimal distance between trees (px)
  edgePadding = 0,      // inset from area edges (px)
  layout = "poisson",   // "poisson" (default) or "banded"
  rows = 3,             // only for layout="banded"
  footLift = 0,
  filter = null         // optional function (x,y) => boolean to accept placement
} = {}){
  if (!area || area.width <= 0 || area.height <= 0) throw new Error("spawnForest: invalid area");
  const { x:ax, y:ay, width:aw, height:ah } = area;
  const inset = Math.max(0, edgePadding|0);
  const bx = ax + inset, by = ay + inset;
  const bw = Math.max(0, aw - inset*2), bh = Math.max(0, ah - inset*2);

  let n = 0;
  if (typeof count === 'number') n = Math.max(0, Math.floor(count));
  else if (typeof density === 'number') {
    // density per (100x100) px block
    n = Math.max(0, Math.floor(density * (aw * ah) / 10000));
  } else {
    n = Math.max(1, Math.floor((aw * ah) / 80000)); // fallback heuristic
  }

  const pts = [];

  if (layout === "banded"){
    const bands = Math.max(1, rows|0);
    const avgScale = (scaleRange[0] + scaleRange[1]) * 0.5;
    const minX = Math.max(24, avoidMinDist || Math.round(FRAME_W * avgScale * 0.7));

    // distribute n across bands, capped by width/minX
    const maxCols = Math.max(1, Math.floor(bw / minX));
    const basePerRow = Math.max(1, Math.floor(n / bands));

    const rnd = (min,max)=>min+Math.random()*(max-min);
    let placed = 0;

    for (let r=0; r<bands && placed < n; r++){
      const colsForThis = Math.min(maxCols, basePerRow + (r < (n % bands) ? 1 : 0));
      if (colsForThis <= 0) continue;

      const yRow = by + bh * (r + 0.5) / bands;
      const cellW = bw / colsForThis;
      const jitterX = Math.min(cellW * 0.25, minX * 0.25);

      for (let c=0; c<colsForThis && placed < n; c++){
        const xCenter = bx + (c + 0.5) * cellW;
        const px = xCenter + (colsForThis > 1 ? rnd(-jitterX, jitterX) : 0);
        const py = yRow + (jitterY ? rnd(-jitterY, jitterY) : 0);
        if (typeof filter === 'function' && !filter(px, py)) continue; // skip disallowed spots
        pts.push({ x: px, y: py });
        placed++;
      }
    }

    const spawned = [];
    function pick(arr){ return arr[(Math.random()*arr.length)|0]; }
    function rndF(min,max){ return min + Math.random()*(max-min); }
    for (const p of pts){
      const type = pick(types);
      const scale = rndF(scaleRange[0], scaleRange[1]);
      const fps = Math.round(rndF(fpsRange[0], fpsRange[1]));
      const spr = await spawnTree({ type, x: p.x, y: p.y, scale, fps, footLift });
      if (spr) spawned.push(spr);
    }
    return spawned;
  }

  const cell = Math.max(1, avoidMinDist);
  const cols = Math.max(1, Math.ceil(bw / cell));
  const rowsC = Math.max(1, Math.ceil(bh / cell));
  const grid = Array.from({ length: cols * rowsC }, () => []);
  function cellIndex(x, y){
    const cx = Math.min(cols-1, Math.max(0, Math.floor((x - bx) / cell)));
    const cy = Math.min(rowsC-1, Math.max(0, Math.floor((y - by) / cell)));
    return cy * cols + cx;
  }
  function farEnough(x, y){
    if (!avoidMinDist) return true;
    const cx = Math.min(cols-1, Math.max(0, Math.floor((x - bx) / cell)));
    const cy = Math.min(rowsC-1, Math.max(0, Math.floor((y - by) / cell)));
    for (let yy = Math.max(0, cy-1); yy <= Math.min(rowsC-1, cy+1); yy++){
      for (let xx = Math.max(0, cx-1); xx <= Math.min(cols-1, cx+1); xx++){
        const arr = grid[yy * cols + xx];
        for (const p of arr){ if (Math.hypot(p.x - x, p.y - y) < avoidMinDist) return false; }
      }
    }
    return true;
  }

  function rnd(min, max){ return min + Math.random() * (max - min); }
  function pick(arr){ return arr[(Math.random() * arr.length) | 0]; }

  const maxAttempts = 40;
  for (let i=0; i<n; i++){
    let px, py, attempts = 0;
    do {
      px = bx + Math.random()*bw;
      py = by + Math.random()*bh;
      attempts++;
      if (typeof filter === 'function' && !filter(px, py)) continue; // reject by mask
      if (!avoidMinDist) break;
    } while (attempts < maxAttempts && !farEnough(px, py));

    const p = { x:px, y:py };
    pts.push(p);
    grid[cellIndex(px, py)].push(p);
  }

  const spawned = [];
  for (const p of pts){
    const type = pick(types);
    const scale = rnd(scaleRange[0], scaleRange[1]);
    const fps = Math.round(rnd(fpsRange[0], fpsRange[1]));
    const y = p.y + (jitterY ? rnd(-jitterY, jitterY) : 0);
    const spr = await spawnTree({ type, x: p.x, y, scale, fps, footLift });
    if (spr) spawned.push(spr);
  }
  return spawned;
}

// For quick debugging in console (optional)
// window.__Trees = { initTrees, spawnTree, spawnForest, clearTrees, stopTrees, startTrees };