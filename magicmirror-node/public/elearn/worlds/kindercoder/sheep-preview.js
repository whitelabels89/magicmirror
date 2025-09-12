// Sheep preview: uses Sheep_Idle/Grass/Move.png and Sheep.json to animate.

const BASE = "/elearn/models/ts-fp/Decorations/Sheep/";
const SHEET_FOR = { idle: BASE+"Sheep_Idle.png", grass: BASE+"Sheep_Grass.png", move: BASE+"Sheep_Move.png" };
const JSON_URL = BASE + "Sheep.json";
const ANCHOR = { x:0.5, y:1.0 };

function loadImage(src){ return new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=()=>rej(new Error('img:'+src)); im.src=src; }); }
async function tryJson(url){ try{ const r=await fetch(url,{cache:'no-cache'}); if(!r.ok) return null; return await r.json(); }catch(_){ return null; } }

function parseSheepJson(doc){
  if(!doc?.frames || !doc?.meta?.frameTags) return null;
  const framesArray = Object.values(doc.frames);
  const tags = {}; // name->array of frames
  for(const tag of doc.meta.frameTags){
    const key = (tag.name||'').toLowerCase();
    const arr=[]; const baseX = framesArray[tag.from].frame.x;
    for(let i=tag.from;i<=tag.to;i++){ const f=framesArray[i]; arr.push({ sx:f.frame.x-baseX, sy:f.frame.y, w:f.frame.w, h:f.frame.h, dur:f.duration }); }
    tags[key] = arr;
  }
  return tags;
}

const cache = { images:new Map(), frames:new Map() }; // key anim -> img / frames
async function getFrames(anim){
  if(cache.frames.has(anim)) return cache.frames.get(anim);
  const doc = await tryJson(JSON_URL);
  let frames = [];
  if(doc){ const tags=parseSheepJson(doc); frames = tags?.[anim] || []; }
  if(frames.length===0){ // fallback: strip 8 frames of 128x128
    for(let i=0;i<8;i++) frames.push({ sx:i*128, sy:0, w:128, h:128, dur:100 });
  }
  cache.frames.set(anim, frames); return frames;
}
async function getImage(anim){ if(!cache.images.has(anim)) cache.images.set(anim, await loadImage(SHEET_FOR[anim])); return cache.images.get(anim); }

class Sheep{
  constructor(anim,x,y,scale,fps){ this.anim=anim; this.x=x; this.y=y; this.scale=scale; this.fps=fps; this.acc=0; this.fi=0; this.img=null; this.frames=null; }
  async ensure(){ if(!this.frames) this.frames = await getFrames(this.anim); if(!this.img) this.img = await getImage(this.anim); }
  update(dt){ if(!this.frames) return; const cur=this.frames[this.fi]; const ms = cur?.dur || (1000/Math.max(1,this.fps)); this.acc+=dt; while(this.acc>=ms){ this.acc-=ms; this.fi=(this.fi+1)%this.frames.length; } }
  draw(ctx){ if(!this.frames||!this.img) return; const f=this.frames[this.fi]; const dw=f.w*this.scale, dh=f.h*this.scale; const FOOT=50; const dx=Math.round(this.x-ANCHOR.x*dw), dy=Math.round(this.y-ANCHOR.y*dh + FOOT); ctx.drawImage(this.img, f.sx,f.sy,f.w,f.h, dx,dy,dw,dh); }
  hit(mx,my){ if(!this.frames) return false; const f=this.frames[this.fi]; const dw=f.w*this.scale, dh=f.h*this.scale; const dx=this.x-ANCHOR.x*dw, dy=this.y-ANCHOR.y*dh; return mx>=dx&&my>=dy&&mx<=dx+dw&&my<=dy+dh; }
}

const cvs = document.getElementById('stage'); const ctx = cvs.getContext('2d'); ctx.imageSmoothingEnabled=false;
const state = { objs:[], dragging:null, off:{x:0,y:0}, last:performance.now() };
function loop(ts){ const dt=ts-state.last; state.last=ts; ctx.clearRect(0,0,cvs.width,cvs.height); state.objs.sort((a,b)=>a.y===b.y?a.x-b.x:a.y-b.y); for(const o of state.objs){ if(o.frames) o.update(dt); } for(const o of state.objs){ if(o.frames) o.draw(ctx); } requestAnimationFrame(loop); } requestAnimationFrame(loop);

const ui = { anim:document.getElementById('anim'), scale:document.getElementById('scale'), fps:document.getElementById('fps'), add:document.getElementById('btnAdd'), clear:document.getElementById('btnClear') };

ui.add.onclick = async ()=>{ const anim=ui.anim.value; const sc=parseFloat(ui.scale.value)||1; const fps=parseInt(ui.fps.value,10)||10; const sh=new Sheep(anim, cvs.width/2, cvs.height-32, sc, fps); await sh.ensure(); state.objs.push(sh); };
ui.clear.onclick = ()=>{ state.objs.length=0; };

function getXY(e){ const r=cvs.getBoundingClientRect(); return { x:e.clientX-r.left, y:e.clientY-r.top }; }
cvs.addEventListener('mousedown', async (e)=>{ const p=getXY(e); for(let i=state.objs.length-1;i>=0;i--){ const o=state.objs[i]; await o.ensure(); if(o.hit(p.x,p.y)){ state.dragging=o; state.off.x=o.x-p.x; state.off.y=o.y-p.y; return; } } const anim=ui.anim.value; const sc=parseFloat(ui.scale.value)||1; const fps=parseInt(ui.fps.value,10)||10; const sh=new Sheep(anim,p.x,p.y,sc,fps); await sh.ensure(); state.objs.push(sh); });
cvs.addEventListener('mousemove', (e)=>{ if(!state.dragging) return; const p=getXY(e); state.dragging.x=p.x+state.off.x; state.dragging.y=p.y+state.off.y; });
window.addEventListener('mouseup', ()=>{ state.dragging=null; });
