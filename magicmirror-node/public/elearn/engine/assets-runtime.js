// Simple data-driven asset runtime for browser
export const debug = { drawBounds:false };
export let onError = (err, ctx) => console.warn(err, ctx);

const state = {
  manifest:null,
  byId:{},
  byCategory:{},
  byTag:{},
  sprites:new Map(),
  entitiesById:{},
  entitiesByType:{},
};

export async function init({manifestUrl='/elearn/assets/manifest.json', prewarm=[]}={}){
  const res = await fetch(manifestUrl);
  state.manifest = await res.json();
  for(const a of state.manifest.assets){
    state.byId[a.id]=a;
    (state.byCategory[a.category]=state.byCategory[a.category]||[]).push(a);
    for(const tag of a.tags||[]){
      (state.byTag[tag]=state.byTag[tag]||[]).push(a);
    }
  }
  await loadEntities();
  // prewarm selected categories (load sprite metadata)
  for(const cat of prewarm){
    const arr = state.byCategory[cat]||[];
    for(const a of arr){ loadSprite(a.id); }
  }
}

async function loadEntities(){
  try{
    const res = await fetch('/elearn/assets/entities/');
    const text = await res.text();
    const files = Array.from(text.matchAll(/href="([^"?]*\.json)"/g)).map(m=>m[1]);
    for(const f of files){
      try{
        const def = await fetch('/elearn/assets/entities/'+f).then(r=>r.json());
        state.entitiesById[def.id]=def;
        (state.entitiesByType[def.type]=state.entitiesByType[def.type]||[]).push(def);
      }catch(e){ onError(e,{stage:'entity',file:f}); }
    }
  }catch(err){ onError(err,{stage:'entities-list'}); }
}

function loadImage(url){
  return new Promise((res,rej)=>{
    const img=new Image();
    img.onload=()=>res(img);
    img.onerror=rej;
    img.src=url;
  });
}

function parseSprite(data){
  const framesArray = Object.values(data.frames);
  const framesByTag = {};
  (data.meta.frameTags||[]).forEach(tag=>{
    const arr=[];
    for(let i=tag.from;i<=tag.to;i++){
      const f=framesArray[i];
      arr.push({x:f.frame.x,y:f.frame.y,w:f.frame.w,h:f.frame.h,duration:f.duration});
    }
    framesByTag[tag.name.toLowerCase()] = arr;
  });
  const anchor = (data.meta.slice9 && data.meta.slice9.anchor) ? data.meta.slice9.anchor : {x:0.5,y:1};
  return {framesByTag, meta:data.meta, anchor};
}

const failed = new Set();

export async function loadSprite(id){
  if(state.sprites.has(id)) return state.sprites.get(id);
  const asset = state.byId[id];
  if(!asset){
    const fb = createFallback(id);
    state.sprites.set(id, fb);
    const err = new Error('Asset not found: '+id);
    onError(err,{id});
    return fb;
  }
  const p = (async()=>{
    try{
      const [data, image] = await Promise.all([
        fetch(asset.json).then(r=>r.json()),
        loadImage(asset.png)
      ]);
      const sprite = parseSprite(data);
      sprite.id=id;
      sprite.image=image;
      sprite.draw = (ctx, tag, t, x, y, opts={})=>{
        const frames = sprite.framesByTag[tag] || sprite.framesByTag['idle'] || Object.values(sprite.framesByTag)[0];
        if(!frames||frames.length===0) return;
        const total = frames.reduce((s,f)=>s+f.duration,0);
        let time = t % total;
        let frame = frames[0];
        for(const fr of frames){ time -= fr.duration; if(time < 0){ frame=fr; break; } }
        const scale = opts.scale||1;
        const dx = Math.round(x - frame.w*scale*sprite.anchor.x);
        const dy = Math.round(y - frame.h*scale*sprite.anchor.y);
        ctx.drawImage(image, frame.x, frame.y, frame.w, frame.h, dx, dy, frame.w*scale, frame.h*scale);
        if(debug.drawBounds){ ctx.strokeStyle='red'; ctx.strokeRect(dx,dy,frame.w*scale,frame.h*scale); }
      };
      return sprite;
    }catch(err){
      if(!failed.has(id)){ failed.add(id); onError(err,{id}); }
      return createFallback(id);
    }
  })();
  state.sprites.set(id,p);
  return p;
}

function createFallback(id){
  return {
    id,
    framesByTag:{},
    meta:{},
    anchor:{x:0.5,y:1},
    draw(ctx,tag,t,x,y,opts={}){
      const size = opts.size || 32;
      ctx.fillStyle='red';
      ctx.fillRect(x-size/2, y-size, size, size);
    }
  };
}

export async function play(ctx,id,tag,t,x,y,opts){
  const s = await loadSprite(id);
  s.draw(ctx,tag,t,x,y,opts);
}

export async function size(id){
  const s = await loadSprite(id);
  const tag = Object.keys(s.framesByTag)[0];
  const fr = tag? s.framesByTag[tag][0] : {w:0,h:0};
  return {w:fr.w,h:fr.h};
}

export function find(q={}){
  const {category, tag} = q;
  let list = state.manifest.assets;
  if(category) list = list.filter(a=>a.category===category);
  if(tag) list = list.filter(a=>a.tags && a.tags.includes(tag));
  return list;
}

export function getEntities(type){
  if(!type) return Object.values(state.entitiesById);
  return state.entitiesByType[type] || [];
}

export async function spawn(defOrId, overrides={}){
  let def = typeof defOrId === 'string' ? state.entitiesById[defOrId] : defOrId;
  if(!def) throw new Error('Unknown entity '+defOrId);
  const inst = { ...def, ...overrides };
  inst.state = Object.assign({anim:def.defaultAnim||'idle', t:0}, def.state||{}, overrides.state||{});
  await loadSprite(inst.sprite);
  inst.draw = function(ctx){
    const t = inst.state.t;
    if(inst.placements){
      for(const p of inst.placements){
        play(ctx, inst.sprite, inst.state.anim, t, (inst.x||0)+p.x, (inst.y||0)+p.y, inst);
      }
    }else{
      play(ctx, inst.sprite, inst.state.anim, t, inst.x||0, inst.y||0, inst);
    }
  };
  inst.update = function(dt){ inst.state.t += dt; };
  return inst;
}

export function createScene(canvas){
  const ctx = canvas.getContext('2d');
  const objs=[]; let raf, last=0, running=false;
  function loop(ts){
    const dt = ts - last; last = ts;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(const o of objs){ o.update(dt); o.draw(ctx); }
    raf = requestAnimationFrame(loop);
  }
  return {
    add:(...o)=>objs.push(...o),
    start(){ if(!running){ running=true; last=performance.now(); raf=requestAnimationFrame(loop);} },
    stop(){ running=false; cancelAnimationFrame(raf); },
    ctx, objects:objs
  };
}

