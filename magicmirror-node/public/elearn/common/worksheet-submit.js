(function(){
  const WS_DEBUG = (window.WORKSHEET_DEBUG === true);
  function dlog(){ if (WS_DEBUG) console.log.apply(console, ['[worksheet-submit]'].concat([].slice.call(arguments))); }
  const API_BASE = window.API_BASE || '';

  function getRootSelector(){
    if (window.WORKSHEET_META && window.WORKSHEET_META.captureSelector) return window.WORKSHEET_META.captureSelector;
    if (document.getElementById('worksheet-root')) return '#worksheet-root';
    if (document.getElementById('worksheetRoot')) return '#worksheetRoot';
    return 'body';
  }

  async function fetchUser(){
    try{
      const res = await fetch(`${API_BASE}/api/auth/me`, { credentials:'include' });
      if(!res.ok) return null;
      return await res.json();
    }catch(err){
      return null;
    }
  }

  function collectAnswers(){
    const els = document.querySelectorAll('[data-answers="true"], textarea, .code-editor');
    const arr = [];
    els.forEach(el=>{
      if(el.matches && el.matches('[data-answers="true"]')){
        const val = el.value || el.textContent || '';
        if(val) arr.push(val);
      }else if(el.tagName === 'TEXTAREA'){
        if(el.value) arr.push(val = el.value);
      }else if(el.classList && el.classList.contains('code-editor')){
        const val = el.value || el.textContent || '';
        if(val) arr.push(val);
      }
    });
    return arr.join('\n---\n');
  }

  // Convert canvas capture to base64 JPEG asynchronously to avoid blocking the main thread
  async function canvasToBase64(canvas){
    return await new Promise((resolve, reject) => {
      try {
        canvas.toBlob(function(blob){
          if (!blob) {
            resolve('');
            return;
          }
          const reader = new FileReader();
          reader.onloadend = function(){
            try {
              const result = reader.result || '';
              resolve(String(result).replace(/^data:[^;]+;base64,/, ''));
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = function(err){ reject(err || new Error('Failed to read canvas blob')); };
          reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.82);
      } catch (err) {
        reject(err);
      }
    });
  }

  async function capture(selector){
    const sel = selector || getRootSelector();
    const el = document.querySelector(sel);
    if(!el) throw new Error('container not found');
    window.scrollTo(0,0);
    // Limit render scale so html2canvas does not create overly large bitmaps on high-DPI screens
    const scale = Math.min(Math.max(window.devicePixelRatio || 1, 1), 1.25);
    const canvas = await html2canvas(el,{scale,useCORS:true,backgroundColor:'#fff',logging:false});
    try {
      return await canvasToBase64(canvas);
    } catch (err) {
      // Fallback to sync PNG/JPEG conversion if toBlob is not supported
      let dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      if(dataUrl.length > 2*1024*1024){
        dataUrl = canvas.toDataURL('image/jpeg',0.72);
      }
      return dataUrl.replace(/^data:image\/\w+;base64,/,'');
    }
  }

  function slugify(s){ return String(s||'').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,''); }

  function guessCourseIdFromPath(pathname){
    const segs = pathname.split('/').filter(Boolean);
    const idx = segs.indexOf('calistung');
    const domain = idx >= 0 ? segs[idx + 1] : '';
    if(!domain) return '';
    const map = { number:'numbers-basic', numbers:'numbers-basic', alphabet:'alphabet-basic', huruf:'alphabet-basic', python:'python-basic' };
    return map[slugify(domain)] || `${slugify(domain)}-basic`;
  }

  function guessLessonIdFromPath(pathname){
    const patterns = [/L(\d+)\.html$/i, /alpha(\d+)\.html$/i, /level[-_]?(\d+)\.html$/i];
    for(const rx of patterns){
      const m = pathname.match(rx);
      if(m && m[1]) return 'L' + m[1];
    }
    return '';
  }

  // --- Next lesson utilities ---
  function nextLessonId(lessonId){
    const m = String(lessonId||'').match(/L(\d+)/i);
    if(!m) return '';
    const n = Number(m[1]);
    if (isNaN(n)) return '';
    return 'L' + (n + 1);
  }

  function buildNextLessonUrl(pathname, curLessonId, nextId){
    try{
      // Prefer manifest/router hints if available
      if (window.LESSON_MANIFEST && window.LESSON_MANIFEST_NEXT && window.LESSON_MANIFEST_NEXT[pathname]) {
        return window.LESSON_MANIFEST_NEXT[pathname];
      }
      if (window.LESSON_ROUTER && typeof window.LESSON_ROUTER.nextUrl === 'function') {
        const u = window.LESSON_ROUTER.nextUrl({ pathname, curLessonId, nextId });
        if (u) return u;
      }
      // Heuristics: replace common filename patterns
      const tryPatterns = [
        [/L(\d+)\.html$/i, `${nextId}.html`],
        [/alpha(\d+)\.html$/i, `alpha${nextId.replace(/^L/i,'')}.html`],
        [/level[-_]?(\d+)\.html$/i, `level-${nextId.replace(/^L/i,'')}.html`]
      ];
      for (const [rx, repl] of tryPatterns){
        if (rx.test(pathname)){
          return pathname.replace(rx, repl);
        }
      }
      return '';
    }catch(_){ return ''; }
  }

  function relabelFinishButtons(){
    const nodes = document.querySelectorAll('#btnSelesai, .btn-selesai, button[data-action="finish"], button.hud-btn.finish, a#btnSelesai, a.btn-selesai');
    nodes.forEach(btn => {
      if (btn && btn.textContent && /selesai/i.test(btn.textContent)) {
        btn.textContent = btn.textContent.replace(/selesai/i, 'Complete');
      } else if (btn && !btn.textContent) {
        btn.textContent = 'Complete';
      }
      // set accessible label/title too
      btn.setAttribute('aria-label','Complete');
      if (!btn.title || /selesai/i.test(btn.title)) btn.title = 'Complete';
    });
  }

  function resolveIds(){
    const rootEl = document.getElementById('worksheetRoot') || document.getElementById('worksheet-root') || document.body;
    let courseId = rootEl?.dataset?.courseId || document.body?.dataset?.courseId || '';
    let lessonId = rootEl?.dataset?.lessonId || document.body?.dataset?.lessonId || '';

    // Allow explicit override via WORKSHEET_META
    if (window.WORKSHEET_META) {
      courseId = window.WORKSHEET_META.course_id || courseId;
      lessonId = window.WORKSHEET_META.lesson_id || lessonId;
    }

    if(!courseId && window.SIDEBAR?.selectedCourseId) courseId = window.SIDEBAR.selectedCourseId;
    if(!lessonId && window.SIDEBAR?.selectedLessonId) lessonId = window.SIDEBAR.selectedLessonId;

    const p = location.pathname;
    const mf = window.LESSON_MANIFEST?.[p];
    if(!courseId && mf?.course_id) courseId = mf.course_id;
    if(!lessonId && mf?.lesson_id) lessonId = mf.lesson_id;

    if(!courseId) courseId = guessCourseIdFromPath(p);
    if(!lessonId) lessonId = guessLessonIdFromPath(p);

    if(!courseId || !lessonId){
      throw new Error(`Course/Lesson ID tidak ditemukan.\nPath: ${p}\ncourseId: ${courseId || '-'}\nlessonId: ${lessonId || '-'}\nKonfigurasi: data-attribute, sidebar.mod, manifest-lessons.js, atau penamaan file.`);
    }
    return {courseId, lessonId};
  }

  // --- Sound: lightweight win jingle using Web Audio ---
  function playTone(ctx, freq, start, dur, type = 'triangle', gainVal = 0.07) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    // Simple attack/decay envelope
    gain.gain.exponentialRampToValueAtTime(gainVal, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  function playWinSound() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const now = ctx.currentTime;
      // Arpeggio: C5 -> E5 -> G5 -> C6 (cheery)
      playTone(ctx, 523.25, now + 0.00, 0.16, 'triangle', 0.08); // C5
      playTone(ctx, 659.25, now + 0.12, 0.16, 'triangle', 0.08); // E5
      playTone(ctx, 783.99, now + 0.24, 0.18, 'triangle', 0.08); // G5
      playTone(ctx, 1046.50, now + 0.38, 0.28, 'sine', 0.07);   // C6
      // Soft sparkle on top
      playTone(ctx, 1318.51, now + 0.42, 0.12, 'sine', 0.05);   // E6
      // Auto close
      setTimeout(() => { try { ctx.close(); } catch(_){} }, 1200);
    } catch (_) {
      // ignore sound errors
    }
  }

  function showWinPopup({ added = 0, total = 0, storageUrl, driveUrl, courseId, lessonId }) {
    // Prevent duplicate overlay
    if (document.getElementById('wsWinOverlay')) return;

    // Inject keyframes once
    if (!document.getElementById('wsWinStyles')) {
      const style = document.createElement('style');
      style.id = 'wsWinStyles';
      style.textContent = `
        @keyframes ws-pop { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.05);opacity:1} 100%{transform:scale(1)} }
        @keyframes ws-float { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(-30px);opacity:0} }
        @keyframes ws-burst {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          70% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
        @keyframes ws-star {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-120px) rotate(180deg); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'wsWinOverlay';
    Object.assign(overlay.style, {
      position:'fixed', inset:'0', background:'rgba(0,0,0,0.6)', zIndex: 9999,
      display:'flex', alignItems:'center', justifyContent:'center'
    });

    // Modal container
    const box = document.createElement('div');
    Object.assign(box.style, {
      width:'min(520px, 92vw)', background:'#111', color:'#fff', borderRadius:'14px',
      border:'1px solid #333', padding:'20px 22px 18px', textAlign:'center',
      boxShadow:'0 10px 30px rgba(0,0,0,0.45)', position:'relative', animation:'ws-pop .4s ease-out'
    });

    // Title + subtitle
    const title = document.createElement('div');
    title.textContent = 'Level Complete!';
    Object.assign(title.style, { fontSize:'28px', fontWeight:'800', letterSpacing:'0.5px', marginBottom:'2px' });
    const sub = document.createElement('div');
    sub.textContent = `${courseId || '-'} • ${lessonId || '-'}`;
    Object.assign(sub.style, { opacity:'0.8', marginBottom:'14px', fontSize:'14px' });

    // Coin & points counter
    const coinWrap = document.createElement('div');
    Object.assign(coinWrap.style, { display:'flex', alignItems:'baseline', justifyContent:'center', gap:'10px', margin:'8px 0 2px' });

    const coin = document.createElement('div');
    coin.textContent = '🪙';
    Object.assign(coin.style, { fontSize:'40px', lineHeight:'40px' });

    const pts = document.createElement('div');
    Object.assign(pts.style, { fontSize:'40px', fontWeight:'900' });
    pts.textContent = '+0';

    coinWrap.appendChild(coin);
    coinWrap.appendChild(pts);

    // Total label
    const totalEl = document.createElement('div');
    totalEl.textContent = `Total Coin: ${total}`;
    Object.assign(totalEl.style, { marginTop:'6px', fontSize:'13px', opacity:'0.9' });

    // Links row (optional)
    const links = document.createElement('div');
    Object.assign(links.style, { display:'flex', gap:'10px', justifyContent:'center', marginTop:'12px' });
    if (storageUrl) {
      const a = document.createElement('a');
      a.href = storageUrl; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = 'Lihat di Storage';
      Object.assign(a.style, { background:'#222', color:'#ffd166', padding:'8px 10px', borderRadius:'8px', textDecoration:'none', fontSize:'13px' });
      links.appendChild(a);
    }
    if (driveUrl) {
      const a = document.createElement('a');
      a.href = driveUrl; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = 'Lihat di Drive';
      Object.assign(a.style, { background:'#222', color:'#a6e1fa', padding:'8px 10px', borderRadius:'8px', textDecoration:'none', fontSize:'13px' });
      links.appendChild(a);
    }

    // Action buttons
    const actions = document.createElement('div');
    Object.assign(actions.style, { marginTop:'14px', display:'flex', gap:'10px', justifyContent:'center' });
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Next';
    Object.assign(closeBtn.style, { background:'#28a745', color:'#fff', border:'none', padding:'10px 16px', borderRadius:'8px', cursor:'pointer', fontWeight:'700' });
    closeBtn.addEventListener('click', () => {
      // Try navigate to next lesson; fallback to just close
      const curPath = location.pathname;
      const nextId = nextLessonId(lessonId);
      const nextUrl = nextId ? buildNextLessonUrl(curPath, lessonId, nextId) : '';
      if (nextUrl) {
        location.assign(nextUrl);
      } else {
        overlay.remove();
        document.body.style.overflow = '';
      }
    });
    actions.appendChild(closeBtn);

    // Stars burst layer
    const starLayer = document.createElement('div');
    Object.assign(starLayer.style, { position:'absolute', inset:'0', pointerEvents:'none', overflow:'hidden' });

    function spawnStars() {
      for (let i=0; i<14; i++) {
        const s = document.createElement('div');
        s.textContent = '★';
        const size = 14 + Math.floor(Math.random()*12);
        const left = 8 + Math.random() * 84;
        const top = 55 + Math.random() * 10;
        Object.assign(s.style, {
          position:'absolute',
          left: left+'%',
          top: top+'%',
          fontSize: size+'px',
          color: ['#ffd166','#f6c90e','#fff3b0','#ffeaa7'][Math.floor(Math.random()*4)],
          textShadow:'0 0 6px rgba(255,209,102,0.6)',
          animation:`ws-star .9s ease-out ${Math.random()*0.2}s forwards`
        });
        starLayer.appendChild(s);
        // auto-remove
        setTimeout(()=>s.remove(), 1200);
      }
    }

    // Count-up animation
    function animateCount(target) {
      const duration = Math.min(900, 120 * target); // up to ~0.9s
      const start = performance.now();
      function step(ts){
        const p = Math.min(1, (ts - start) / duration);
        const val = Math.floor(p * target);
        pts.textContent = `+${val}`;
        if (p < 1) requestAnimationFrame(step);
        else pts.textContent = `+${target}`;
      }
      requestAnimationFrame(step);
    }

    // Assemble
    box.appendChild(title);
    box.appendChild(sub);
    box.appendChild(coinWrap);
    box.appendChild(totalEl);
    if (links.children.length) box.appendChild(links);
    box.appendChild(actions);
    box.appendChild(starLayer);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Trigger effects
    playWinSound();
    spawnStars();
    if (added > 0) animateCount(added);
  }
  // Backward-compat alias (keep old call sites working)
  const showSuccessModal = (...args) => {
    const [storageUrl, driveUrl] = args;
    showWinPopup({ storageUrl, driveUrl });
  };

  window.initWorksheetSubmit = async function initWorksheetSubmit(opts = {}){
    let courseId = opts.courseId;
    let lessonId = opts.lessonId;

    try{
      if(!courseId || !lessonId){
        const ids = resolveIds();
        courseId = courseId || ids.courseId;
        lessonId = lessonId || ids.lessonId;
      }
    }catch(e){
      console.error(e);
      window.__WS_RESOLVE_ERROR__ = 'ID pelajaran tidak ditemukan. Hubungi admin untuk memperbaiki konfigurasi halaman.';
    }
    // Update visible label from "Selesai" to "Complete"
    try { relabelFinishButtons(); } catch(_){}

    if (document.__WS_DELEGATED_BOUND__) {
      dlog('delegated click already bound');
      return;
    }
    document.__WS_DELEGATED_BOUND__ = true;

    document.addEventListener('click', async function(e){
      const btn = e.target?.closest?.('#btnSelesai, .btn-selesai, button[data-action="finish"], button.hud-btn.finish, a#btnSelesai, a.btn-selesai');
      if(!btn) return;

      dlog('delegated click on finish button');
      e.preventDefault();
      e.stopPropagation();

      if ((!courseId || !lessonId) && window.__WS_RESOLVE_ERROR__) {
        btn.title = window.__WS_RESOLVE_ERROR__;
        alert(window.__WS_RESOLVE_ERROR__);
        return;
      }

      // Resolve role (prefer FE userInfo, then opts.role, then /api/auth/me)
      let role = (opts.role || '').toLowerCase();
      let info = {};
      if (typeof getUserInfo === 'function') {
        try { info = getUserInfo() || {}; } catch(e){}
        role = role || (info.role && String(info.role).toLowerCase()) || '';
        dlog('role from getUserInfo():', role || '(none)');
      }
      if (!role) {
        const apiUser = await fetchUser();
        role = (apiUser && apiUser.role || '').toLowerCase();
        dlog('role from /api/auth/me:', role || '(none)');
      }
      if(!['murid','guru','moderator'].includes(role)){
        btn.title = 'Khusus Murid/Guru/Moderator';
        dlog('blocked by role check. role =', role || '(none)');
        return;
      }

      const rootSel = getRootSelector();
      const root = document.querySelector(rootSel);
      if(!root){
        alert(`Gagal: elemen root untuk screenshot tidak ditemukan (${rootSel}).`);
        dlog('no root found for capture', { rootSel });
        return;
      }

      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Menyimpan...';

      try{
        const answers = collectAnswers();
        const screenshot = await capture(getRootSelector());
        const payload = {
          murid_uid: opts.muridUid || info.uid || '',
          cid: opts.cid || info.cid || '',
          nama_anak: opts.namaAnak || info.nama || '',
          course_id: courseId,
          lesson_id: lessonId,
          answers_text: answers,
          screenshot_base64: screenshot
        };

        const headers = { 'Content-Type': 'application/json' };
        const feRole = role || (info.role && String(info.role).toLowerCase()) || '';
        if (info.uid) headers['X-UID'] = info.uid;
        if (feRole) headers['X-ROLE'] = feRole;

        const res = await fetch(`${API_BASE}/api/worksheet/submit`,{
          method:'POST',
          headers,
          credentials:'include',
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(()=>({ok:false,message:'Invalid JSON'}));
        dlog('submit response status:', res.status);
        if(res.ok && data.ok){
          showWinPopup({
            added: data.points ? (data.points.added || 0) : 0,
            total: data.points ? (data.points.total_points || 0) : 0,
            storageUrl: data.storage_url,
            driveUrl: data.drive_url,
            courseId,
            lessonId
          });
          if (data.points) {
            if (data.points.added > 0) {
              const toast = document.createElement('div');
              toast.textContent = `+${data.points.added} poin!`;
              Object.assign(toast.style, {
                position: 'fixed',
                top: '20px',
                right: '20px',
                background: '#ffd166',
                color: '#000',
                padding: '8px 12px',
                borderRadius: '4px',
                zIndex: 10000,
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
              });
              document.body.appendChild(toast);
              setTimeout(()=>toast.remove(),2000);
            }
            window.dispatchEvent(new CustomEvent('points:updated', {
              detail: {
                added: data.points.added || 0,
                total_points: data.points.total_points
              }
            }));
          }
        }else{
          throw new Error(data.message || 'Gagal');
        }
      }catch(err){
        alert('Gagal menyimpan worksheet: '+err.message);
        console.error('worksheet submit error (frontend):', err);
      }finally{
        btn.disabled = false;
        btn.textContent = original;
      }
    }, true);
    dlog('delegated click handler bound (capture)');
  };
})();

// Conditionally load Pause Menu for Calistung maps
;(function loadPauseMenuIfCalistung(){
  try{
    const p = (location && location.pathname) || '';
    const match = /\/elearn\/worlds\/calistung\/(alphabet|number|shape|math-game)\//.test(p);
    if (!match) return;
    if (window.__hasPauseMenu) return;
    const shouldDisableToggle = () => {
      try {
        const body = document.body;
        if (!body || !body.dataset) return false;
        const ds = body.dataset;
        return ds.pauseToggle === 'disabled' || ds.navBackBehavior === 'pause-menu';
      } catch (err) {
        return false;
      }
    };
    const s = document.createElement('script');
    s.src = '/elearn/worlds/ui/pause-menu.js';
    s.async = true;
    document.head.appendChild(s);
    window.__hasPauseMenu = true;
    // Fallback: if script fails or slow, inject minimal toggle after delay
    setTimeout(() => {
      try{
        if (document.getElementById('pmToggle') || shouldDisableToggle()) return;
        // Minimal inline UI
        const btn = document.createElement('button');
        btn.id = 'pmToggle';
        Object.assign(btn.style, {
          position:'fixed', left:'12px', top:'12px', zIndex: 10050,
          background:'#111827', color:'#fff', border:'1px solid #243249',
          borderRadius:'12px', padding:'8px 12px', cursor:'pointer', fontWeight:'800',
          boxShadow:'0 6px 18px rgba(0,0,0,.25)'
        });
        btn.textContent = '⏸ Menu';
        document.body.appendChild(btn);
        const ov = document.createElement('div');
        ov.id = 'pmOverlay';
        Object.assign(ov.style, {
          position:'fixed', inset:'0', background:'rgba(0,0,0,.5)',
          display:'none', alignItems:'center', justifyContent:'center', zIndex: 10040
        });
        const panel = document.createElement('div');
        Object.assign(panel.style, {
          minWidth:'260px', maxWidth:'min(92vw,520px)', background:'#0f172a', color:'#fff',
          border:'1px solid #1f2937', borderRadius:'16px', boxShadow:'0 10px 30px rgba(0,0,0,.35)'
        });
        const head = document.createElement('div'); head.textContent='Paused';
        Object.assign(head.style,{padding:'14px 16px', borderBottom:'1px solid #1f2937', fontWeight:'900'});
        const body = document.createElement('div'); Object.assign(body.style,{padding:'16px'});
        const row = document.createElement('div'); Object.assign(row.style,{display:'flex', gap:'10px', justifyContent:'flex-end'});
        const resume = document.createElement('button'); resume.textContent='Lanjut';
        Object.assign(resume.style,{padding:'10px 14px', borderRadius:'12px', border:'none', background:'#e2e8f0', color:'#0b2942', fontWeight:'800'});
        const back = document.createElement('a'); back.textContent='⬅ Kembali ke Menu'; back.href='https://queensacademy.id/elearn/worlds/calistung/index.html';
        Object.assign(back.style,{padding:'10px 14px', borderRadius:'12px', background:'#22c55e', color:'#0b1220', fontWeight:'800', textDecoration:'none'});
        row.appendChild(resume); row.appendChild(back);
        body.appendChild(document.createTextNode('Permainan dijeda. Pilih aksi berikut:'));
        body.appendChild(document.createElement('div')).style.height='10px';
        body.appendChild(row);
        panel.appendChild(head); panel.appendChild(body);
        ov.appendChild(panel);
        document.body.appendChild(ov);
        const open = ()=>{ ov.style.display='flex'; };
        const close = ()=>{ ov.style.display='none'; };
        btn.onclick = open; resume.onclick = close; ov.addEventListener('click', (e)=>{ if (e.target===ov) close(); });
        document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') close(); if (e.key && e.key.toLowerCase()==='p') open(); });
      }catch(_){ /* noop */ }
    }, 600);
  }catch(e){ /* noop */ }
})();
