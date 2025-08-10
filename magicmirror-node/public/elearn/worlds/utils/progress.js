// Simple local progress (bisa diganti Firestore)
export function getCompletedLocal(worldId){
  try{
    const raw = localStorage.getItem(`progress:${worldId}`);
    if(!raw) return [];
    return JSON.parse(raw).completed || [];
  }catch(e){ return []; }
}

export function markCompletedLocal(worldId, label){
  const key = `progress:${worldId}`;
  const raw = localStorage.getItem(key);
  const data = raw? JSON.parse(raw) : { completed:[], percent:0 };
  if (!data.completed.includes(label)) data.completed.push(label);
  // naive percent: selesai / 21 * 100
  const total = 21;
  data.percent = Math.min(100, Math.round(data.completed.length/total*100));
  localStorage.setItem(key, JSON.stringify(data));
}
