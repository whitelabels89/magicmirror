import { markCompletedLocal } from './progress.js';

const styleContent = `
.finish-bar { position: fixed; right: 16px; bottom: 16px; z-index: 1000; }
#btnSelesai { background: #22c55e; color: #fff; border: none; cursor: pointer;
  padding: 12px 16px; border-radius: 12px; font-weight: 700; font-size: 16px;
  box-shadow: 0 6px 18px rgba(16, 185, 129, 0.4); }
#btnSelesai:hover { filter: brightness(1.05); }
#btnSelesai:active { transform: translateY(1px); }
@media (max-width: 480px) {
  #btnSelesai { padding: 10px 14px; font-size: 15px; }
}
`;

function ensureStyle(){
  if(!document.getElementById('finish-btn-style')){
    const s=document.createElement('style');
    s.id='finish-btn-style';
    s.textContent=styleContent;
    document.head.appendChild(s);
  }
}

export function addFinishButton(worldId,label,nextUrl){
  ensureStyle();
  const bar=document.createElement('div');
  bar.className='finish-bar';
  const btn=document.createElement('button');
  btn.id='btnSelesai';
  btn.type='button';
  btn.textContent=`Selesai ${label}`;
  bar.appendChild(btn);
  document.body.appendChild(bar);
  btn.addEventListener('click',()=>{
    markCompletedLocal(worldId,label);
    window.location = nextUrl;
  });
}
