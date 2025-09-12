// Tree preview: loads Tree1-4.png and Trees.json, animates per-variant

const BASE = "/elearn/models/ts-fp/Decorations/Trees/";
const SHEETS = {
  1: BASE + "Tree1.png",
  2: BASE + "Tree2.png",
  3: BASE + "Tree3.png",
  4: BASE + "Tree4.png",
};
const JSON_URL = BASE + "Trees.json";

const FRAME_DEFAULT = { w: 192, h: 256, count: 8, fps: 10 };
const ANCHOR = { x: 0.5, y: 1.0 };

function loadImage(src){
  return new Promise((res, rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=()=>rej(new Error("img:"+src)); im.src=src; });
}

async function tryFetchJson(url){
  try{ const r = await fetch(url, { cache: 'no-cache' }); if(!r.ok) return null; return await r.json(); }catch(_){ return null; }
}

// Parse Aseprite JSON to get frames per tag
function parseTreesJson(doc){
  if(!doc || !doc.frames || !doc.meta || !Array.isArray(doc.meta.frameTags)) return null;
  const framesArray = Object.values(doc.frames);
  const byTag = {};
  for(const tag of doc.meta.frameTags){
    const name = (tag.name||"").toLowerCase();
    const list = [];
    for(let i=tag.from; i<=tag.to; i++){
      const f = framesArray[i];
      list.push({ x:f.frame.x, y:f.frame.y, w:f.frame.w, h:f.frame.h, duration:f.duration });
    }
    byTag[name] = list;
  }
  return { byTag };
}

// Build a sprite descriptor for a given variant index (1..4)
async function buildVariant(variantIdx){
  const img = await loadImage(SHEETS[variantIdx]);
  // try reading Trees.json to determine w/h/fps
  const doc = await tryFetchJson(JSON_URL);
  let frames = [];
  let fps = Number(document.getElementById('fps').value) || FRAME_DEFAULT.fps;
  if(doc){
    const parsed = parseTreesJson(doc);
    if(parsed && parsed.byTag){
      const key = `tree ${variantIdx}`; // tags are "Tree 1".."Tree 4"
      const arr = parsed.byTag[key];
      if(arr && arr.length){
        // Aseprite JSON uses a combined sheet (Trees.png) coordinates.
        // Our preview uses per-variant image (Tree{1..4}.png). Make coords relative
        // to the first frame of this tag by subtracting its sx.
        const baseX = arr[0].x;
        frames = arr.map(f=>({ sx:f.x - baseX, sy:f.y, w:f.w, h:f.h, dur:f.duration }));
      }
    }
  }
  if(frames.length===0){
    // fallback: horizontal strip of 8 frames using default size
    const w = FRAME_DEFAULT.w, h = FRAME_DEFAULT.h, count = FRAME_DEFAULT.count;
    for(let i=0;i<count;i++) frames.push({ sx:i*w, sy:0, w, h, dur:1000/fps });
  }
  return { img, frames };
}

// Simple instance with update/draw
class TreeInstance{
  constructor(variantIdx, x, y, scale, fps){ this.variantIdx=variantIdx; this.x=x; this.y=y; this.scale=scale; this.fps=fps; this.acc=0; this.fi=0; this.desc=null; }
  async ensure(){ if(!this.desc) this.desc = await buildVariant(this.variantIdx); }
  update(dt){
    if(!this.desc) return;
    const frames = this.desc.frames; if(frames.length===0) return;
    this.acc += dt;
    let ms = frames[this.fi]?.dur || (1000/Math.max(1,this.fps));
    while(this.acc >= ms){
      this.acc -= ms; this.fi = (this.fi+1) % frames.length; ms = frames[this.fi]?.dur || (1000/Math.max(1,this.fps));
    }
  }
  draw(ctx){ const {img, frames} = this.desc; const f = frames[this.fi]; const dw=f.w*this.scale, dh=f.h*this.scale; const dx=Math.round(this.x-ANCHOR.x*dw); const FOOT=8; const dy=Math.round(this.y-ANCHOR.y*dh + FOOT); ctx.drawImage(img, f.sx, f.sy, f.w, f.h, dx, dy, dw, dh); }
  hit(mx,my){ const {frames}=this.desc; const f=frames[this.fi]; const dw=f.w*this.scale, dh=f.h*this.scale; const dx=this.x-ANCHOR.x*dw, dy=this.y-ANCHOR.y*dh; return mx>=dx && my>=dy && mx<=dx+dw && my<=dy+dh; }
}

// Runtime
const cvs = document.getElementById('stage');
const ctx = cvs.getContext('2d');
ctx.imageSmoothingEnabled=false;

const state = { objs:[], dragging:null, dragOff:{x:0,y:0}, running:true, last:performance.now() };

function loop(ts){
  const dt = ts - state.last; state.last = ts;
  ctx.clearRect(0,0,cvs.width,cvs.height);
  // sort by y (simple depth)
  state.objs.sort((a,b)=> a.y===b.y? a.x-b.x : a.y-b.y);
  for(const o of state.objs){ if(o.desc) o.update(dt); }
  for(const o of state.objs){ if(o.desc) o.draw(ctx); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// UI
const ui = {
  variant: document.getElementById('variant'),
  scale: document.getElementById('scale'),
  fps: document.getElementById('fps'),
  add: document.getElementById('btnAdd'),
  clear: document.getElementById('btnClear'),
};

ui.add.onclick = async ()=>{
  const v = parseInt(ui.variant.value,10) || 1;
  const s = parseFloat(ui.scale.value)||1;
  const f = parseInt(ui.fps.value,10)||10;
  const inst = new TreeInstance(v, cvs.width/2, cvs.height-40, s, f);
  await inst.ensure();
  state.objs.push(inst);
};

ui.clear.onclick = ()=>{ state.objs.length=0; };

// Place by clicking; drag to move
cvs.addEventListener('mousedown', async (e)=>{
  const rect = cvs.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  // try pick existing
  for(let i=state.objs.length-1;i>=0;i--){
    const o = state.objs[i]; await o.ensure(); if(o.hit(x,y)){ state.dragging=o; state.dragOff.x=o.x-x; state.dragOff.y=o.y-y; return; }
  }
  // else add new at point
  const v = parseInt(ui.variant.value,10) || 1;
  const s = parseFloat(ui.scale.value)||1;
  const f = parseInt(ui.fps.value,10)||10;
  const inst = new TreeInstance(v, x, y, s, f);
  await inst.ensure();
  state.objs.push(inst);
});

cvs.addEventListener('mousemove', (e)=>{
  if(!state.dragging) return;
  const rect = cvs.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  state.dragging.x = x + state.dragOff.x;
  state.dragging.y = y + state.dragOff.y;
});

window.addEventListener('mouseup', ()=>{ state.dragging=null; });
