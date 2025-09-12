// Torch Purple – Aseprite JSON + spritesheet animator
// Loads Torch_Purple.png and Torch_Purple.json, lists frameTags and plays the selected tag.

const BASE = "/elearn/models/ts-up/Factions/Goblins/Troops/Torch/Purple/";
const IMG_URL = BASE + "Torch_Purple.png";
const JSON_URL = BASE + "Torch_Purple.json";
const ANCHOR = { x: 0.5, y: 1.0 }; // pivot at bottom-center

function loadImage(src){
  return new Promise((res, rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=()=>rej(new Error("img:"+src)); im.src=src; });
}

async function fetchJson(url){
  const r = await fetch(url, { cache: 'no-cache' });
  if(!r.ok) throw new Error("json fetch failed: "+r.status);
  return await r.json();
}

// Parse Aseprite JSON into { tags: Map<tagName, frames[]> }
function parseAseprite(doc){
  if(!doc?.frames || !doc?.meta?.frameTags) throw new Error("Invalid Aseprite JSON");
  const framesArray = Object.values(doc.frames);
  const tags = new Map();
  for(const tag of doc.meta.frameTags){
    const name = tag.name || "tag";
    const list = [];
    for(let i=tag.from; i<=tag.to; i++){
      const f = framesArray[i];
      // Keep logical index and size; actual sheet layout may differ from JSON meta
      list.push({ index:i, w:f.frame.w, h:f.frame.h, dur:f.duration||100 });
    }
    tags.set(name, list);
  }
  return { tags };
}

// Simple animator for one sprite instance
class SpritePlayer{
  constructor(img, frames){ this.img=img; this.frames=frames||[]; this.index=0; this.acc=0; this.playing=true; this.speed=1; this.scale=1.5; this.x=480; this.y=560; this.cols=1; }
  setFrames(frames){ this.frames = frames||[]; this.index=0; this.acc=0; }
  update(dt){ if(!this.playing || this.frames.length===0) return; const cur=this.frames[this.index]; const ms=(cur?.dur||100)/Math.max(0.01,this.speed); this.acc+=dt; while(this.acc>=ms){ this.acc-=ms; this.index=(this.index+1)%this.frames.length; } }
  draw(ctx){
    if(this.frames.length===0) return;
    const f = this.frames[this.index];
    // Compute source coordinates based on actual sheet layout (grid)
    const cols = Math.max(1, Math.floor(this.img.width / f.w));
    const sx = (f.index % cols) * f.w;
    const sy = Math.floor(f.index / cols) * f.h;
    const dw=f.w*this.scale, dh=f.h*this.scale; const dx=Math.round(this.x-ANCHOR.x*dw); const dy=Math.round(this.y-ANCHOR.y*dh);
    ctx.drawImage(this.img, sx, sy, f.w, f.h, dx, dy, dw, dh);
  }
}

// Boot
const cvs = document.getElementById('stage');
const ctx = cvs.getContext('2d');
ctx.imageSmoothingEnabled = false;

const ui = {
  anim: document.getElementById('anim'),
  scale: document.getElementById('scale'),
  speed: document.getElementById('speed'),
  play: document.getElementById('btnPlay'),
  reset: document.getElementById('btnReset'),
};

const state = { player: null, tags: new Map(), last: performance.now(), dragging:false, off:{x:0,y:0} };

function loop(ts){
  const dt = ts - state.last; state.last = ts;
  ctx.clearRect(0,0,cvs.width,cvs.height);
  // simple ground shadow for context
  ctx.save();
  ctx.globalAlpha=0.25; ctx.fillStyle='#000';
  const shW = 160 * (state.player?.scale||1); const shH = 22 * (state.player?.scale||1);
  ctx.beginPath(); ctx.ellipse(state.player?.x||480, (state.player?.y||560)+shH*0.1, shW, shH, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  if(state.player){ state.player.update(dt); state.player.draw(ctx); }
  requestAnimationFrame(loop);
}

function populateTags(tags){
  ui.anim.innerHTML = '';
  for(const name of tags.keys()){
    const opt=document.createElement('option'); opt.value=name; opt.textContent=name; ui.anim.appendChild(opt);
  }
  // Prefer Idle if present
  const prefer = ['Idle','Run','Original'];
  for(const p of prefer){ const o=[...ui.anim.options].find(o=>o.value===p); if(o){ ui.anim.value=o.value; break; } }
}

function bindUI(){
  ui.anim.addEventListener('change', ()=>{ const frames = state.tags.get(ui.anim.value)||[]; state.player.setFrames(frames); });
  ui.scale.addEventListener('input', ()=>{ if(state.player) state.player.scale=parseFloat(ui.scale.value)||1; });
  ui.speed.addEventListener('input', ()=>{ if(state.player) state.player.speed=parseFloat(ui.speed.value)||1; });
  ui.play.addEventListener('click', ()=>{ if(state.player) state.player.playing=!state.player.playing; });
  ui.reset.addEventListener('click', ()=>{ if(state.player){ state.player.index=0; state.player.acc=0; } });

  // Drag to reposition
  function getXY(e){ const r=cvs.getBoundingClientRect(); return { x:e.clientX-r.left, y:e.clientY-r.top }; }
  cvs.addEventListener('mousedown', (e)=>{ if(!state.player) return; const p=getXY(e); const f=state.player.frames[state.player.index]; const dw=f.w*state.player.scale, dh=f.h*state.player.scale; const x0=state.player.x-ANCHOR.x*dw, y0=state.player.y-ANCHOR.y*dh; if(p.x>=x0&&p.x<=x0+dw&&p.y>=y0&&p.y<=y0+dh){ state.dragging=true; state.off.x=state.player.x-p.x; state.off.y=state.player.y-p.y; } else { state.player.x=p.x; state.player.y=p.y; } });
  cvs.addEventListener('mousemove', (e)=>{ if(!state.dragging||!state.player) return; const r=cvs.getBoundingClientRect(); state.player.x=e.clientX-r.left+state.off.x; state.player.y=e.clientY-r.top+state.off.y; });
  window.addEventListener('mouseup', ()=>{ state.dragging=false; });
}

(async function main(){
  const [img, json] = await Promise.all([ loadImage(IMG_URL), fetchJson(JSON_URL) ]);
  const parsed = parseAseprite(json);

  // Detect and remove empty frames (fully transparent tiles) to avoid kedipan
  const sampleW = (Object.values(json.frames)[0]?.frame?.w) || 192;
  const sampleH = (Object.values(json.frames)[0]?.frame?.h) || 192;
  const cols = Math.max(1, Math.floor(img.width / sampleW));
  const total = Object.values(json.frames).length;
  const off = document.createElement('canvas'); off.width = sampleW; off.height = sampleH; const octx = off.getContext('2d', { willReadFrequently:true });
  const empty = new Set();
  for(let i=0;i<total;i++){
    const sx = (i % cols) * sampleW; const sy = Math.floor(i / cols) * sampleH;
    octx.clearRect(0,0,sampleW,sampleH);
    octx.drawImage(img, sx, sy, sampleW, sampleH, 0, 0, sampleW, sampleH);
    const id = octx.getImageData(0,0,sampleW,sampleH).data;
    let any = false;
    // sample every 8th pixel to speed up
    for(let p=3; p<id.length; p+=32){ if(id[p] !== 0){ any = true; break; } }
    if(!any) empty.add(i);
  }

  // Filter frames in tags
  const filteredTags = new Map();
  for(const [name, list] of parsed.tags.entries()){
    filteredTags.set(name, list.filter(f=>!empty.has(f.index)));
  }
  state.tags = filteredTags; populateTags(state.tags);

  const player = new SpritePlayer(img, state.tags.get(ui.anim.value)||[]);
  player.scale = parseFloat(ui.scale.value)||1.5;
  player.speed = parseFloat(ui.speed.value)||1;
  state.player = player;

  bindUI();
  requestAnimationFrame(loop);
})();
