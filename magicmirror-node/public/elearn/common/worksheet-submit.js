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

  async function capture(selector){
    const sel = selector || getRootSelector();
    const el = document.querySelector(sel);
    if(!el) throw new Error('container not found');
    window.scrollTo(0,0);
    const canvas = await html2canvas(el,{scale:1.5,useCORS:true,backgroundColor:'#fff'});
    let dataUrl = canvas.toDataURL('image/png');
    if(dataUrl.length > 2*1024*1024){
      dataUrl = canvas.toDataURL('image/jpeg',0.92);
    }
    return dataUrl.replace(/^data:image\/\w+;base64,/,'');
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
    closeBtn.textContent = 'Lanjut';
    Object.assign(closeBtn.style, { background:'#28a745', color:'#fff', border:'none', padding:'10px 16px', borderRadius:'8px', cursor:'pointer', fontWeight:'700' });
    closeBtn.addEventListener('click', () => {
      overlay.remove();
      document.body.style.overflow = '';
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
