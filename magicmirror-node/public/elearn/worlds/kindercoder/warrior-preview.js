// Canvas-based animated preview for Warrior spritesheets.
// Each state (Idle/Run/Guard/Attack1/Attack2) is a spritesheet.

const IMG_BASE = "/elearn/models/ts-fp/Units/Black Units/Warrior";
const STATES = ["Idle", "Run", "Guard", "Attack1", "Attack2"];

const canvas = document.getElementById("warriorCanvas");
const ctx = canvas.getContext("2d");
const stateLabel = document.getElementById("stateLabel");
const stage = document.querySelector(".stage-inner");

// Target FPS per state (sane defaults)
const FPS = { Idle: 6, Run: 12, Guard: 8, Attack1: 12, Attack2: 12 };

// Cache images + inferred frame meta
const cache = new Map(); // state -> {img, frames, fw, fh, vertical:boolean}
function pathFor(state) {
  return `${IMG_BASE}/Warrior_${state}.png`;
}

function inferMeta(img) {
  // Try common patterns: horizontal strip of square frames, else vertical, else even split up to 16
  let frames = 1, fw = img.width, fh = img.height, vertical = false;
  if (img.width > img.height && img.width % img.height === 0) {
    frames = img.width / img.height;
    fw = img.height; fh = img.height; vertical = false;
  } else if (img.height > img.width && img.height % img.width === 0) {
    frames = img.height / img.width;
    fw = img.width; fh = img.width; vertical = true;
  } else {
    // fallback: try 2..16 columns horizontal
    for (let n = 2; n <= 16; n++) {
      if (img.width % n === 0) { frames = n; fw = img.width / n; fh = img.height; break; }
    }
  }
  // Clamp
  frames = Math.max(1, Math.min(frames, 64));
  return { frames, fw, fh, vertical };
}

async function preloadAll() {
  await Promise.all(
    STATES.map((s) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => { cache.set(s, { img, ...inferMeta(img) }); resolve(); };
        img.onerror = () => { cache.set(s, { img, frames:1, fw:img.width||64, fh:img.height||64, vertical:false }); resolve(); };
        img.src = pathFor(s);
      })
    )
  );
}

// Resize canvas to stage
function sizeCanvas() {
  const r = stage.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = Math.floor(r.width * 0.9) + "px";
  canvas.style.height = Math.floor(r.height * 0.9) + "px";
  canvas.width = Math.floor(parseFloat(canvas.style.width) * dpr);
  canvas.height = Math.floor(parseFloat(canvas.style.height) * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

let idx = 0;
let playing = true;
let cycleStates = false;
let frameIdx = 0;
let acc = 0;

function setStateIndex(i) {
  idx = (i + STATES.length) % STATES.length;
  frameIdx = 0; acc = 0;
  const s = STATES[idx];
  stateLabel.textContent = `state: ${s}`;
}

function draw(ts) {
  const s = STATES[idx];
  const entry = cache.get(s);
  if (!entry) return requestAnimationFrame(draw);
  const { img, frames, fw, fh, vertical } = entry;

  // Advance frames
  const fps = FPS[s] || 10;
  const frameMs = 1000 / fps;
  if (playing) acc += 16.67; // approximate; we’ll draw every RAF but advance by ~1/60
  while (acc >= frameMs) {
    acc -= frameMs; frameIdx = (frameIdx + 1) % frames;
    // on loop, optionally cycle state
    if (frameIdx === 0 && cycleStates) setStateIndex(idx + 1);
  }

  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Compute source rect
  const sx = vertical ? 0 : frameIdx * fw;
  const sy = vertical ? frameIdx * fh : 0;

  // Fit to canvas with padding and preserve pixel look
  const pad = 8;
  const maxW = canvas.width / (window.devicePixelRatio || 1) - pad * 2;
  const maxH = canvas.height / (window.devicePixelRatio || 1) - pad * 2;
  const scale = Math.min(maxW / fw, maxH / fh, 3);
  const dw = Math.floor(fw * scale);
  const dh = Math.floor(fh * scale);
  const dx = Math.floor((canvas.width / (window.devicePixelRatio || 1) - dw) / 2);
  const dy = Math.floor((canvas.height / (window.devicePixelRatio || 1) - dh) / 2);

  ctx.drawImage(img, sx, sy, fw, fh, dx, dy, dw, dh);

  requestAnimationFrame(draw);
}

function bindUI() {
  // Buttons choose state
  document.querySelectorAll("button[data-state]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = btn.getAttribute("data-state");
      const i = STATES.indexOf(s);
      if (i >= 0) setStateIndex(i);
    });
  });

  // Cycle toggle
  document.getElementById("btnCycle")?.addEventListener("click", () => {
    cycleStates = !cycleStates;
    document.getElementById("btnCycle").style.borderColor = cycleStates ? "#4da3ff" : "#2a3146";
  });

  // Pause/Play
  document.getElementById("btnPause")?.addEventListener("click", () => {
    playing = !playing;
  });

  // Keyboard: 1..5, Space=pause, C=cycle, ArrowLeft/Right switch state
  window.addEventListener("keydown", (e) => {
    const map = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4 };
    if (e.code in map) { setStateIndex(map[e.code]); return; }
    if (e.code === "Space") { playing = !playing; e.preventDefault(); return; }
    if (e.key?.toLowerCase() === "c") { cycleStates = !cycleStates; return; }
    if (e.code === "ArrowRight") { setStateIndex(idx + 1); return; }
    if (e.code === "ArrowLeft") { setStateIndex(idx - 1); return; }
  });

  // Click stage to advance state
  stage?.addEventListener("click", () => setStateIndex(idx + 1));

  // Resize handling
  const ro = new ResizeObserver(sizeCanvas);
  ro.observe(stage);
}

(async function main() {
  sizeCanvas();
  await preloadAll();
  bindUI();
  setStateIndex(0);
  requestAnimationFrame(draw);
})();
