(function(){
  const WS_DEBUG = (window.WORKSHEET_DEBUG === true);
  function clog(...args){ if(WS_DEBUG) console.log('[worksheet-submit]', ...args); }
  const API_BASE = window.API_BASE || '';

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
      if(el.matches('[data-answers="true"]')){
        const val = el.value || el.textContent || '';
        if(val) arr.push(val);
      }else if(el.tagName === 'TEXTAREA'){
        if(el.value) arr.push(el.value);
      }else if(el.classList.contains('code-editor')){
        const val = el.value || el.textContent || '';
        if(val) arr.push(val);
      }
    });
    return arr.join('\n---\n');
  }

  async function capture(selector){
    const el = document.querySelector(selector);
    if(!el) throw new Error('container not found');
    window.scrollTo(0,0);
    const canvas = await html2canvas(el,{scale:1.5,useCORS:true,backgroundColor:'#fff'});
    let dataUrl = canvas.toDataURL('image/png');
    if(dataUrl.length > 2*1024*1024){
      dataUrl = canvas.toDataURL('image/jpeg',0.92);
    }
    return dataUrl.replace(/^data:image\/\w+;base64,/,'');
  }

  function slugify(s){
    return String(s || '').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'');
  }

  function guessCourseIdFromPath(pathname){
    const segs = pathname.split('/').filter(Boolean);
    const idx = segs.indexOf('calistung');
    const domain = idx >= 0 ? segs[idx + 1] : '';
    if(!domain) return '';
    const map = {
      number: 'numbers-basic',
      numbers: 'numbers-basic',
      alphabet: 'alphabet-basic',
      huruf: 'alphabet-basic',
      python: 'python-basic',
    };
    return map[slugify(domain)] || `${slugify(domain)}-basic`;
  }

  function guessLessonIdFromPath(pathname){
    const patterns = [
      /L(\d+)\.html$/i,
      /alpha(\d+)\.html$/i,
      /level[-_]?(\d+)\.html$/i
    ];
    for(const rx of patterns){
      const m = pathname.match(rx);
      if(m && m[1]) return 'L' + m[1];
    }
    return '';
  }

  function resolveIds(){
    const root = document.getElementById('worksheetRoot');
    let courseId = root?.dataset?.courseId || '';
    let lessonId = root?.dataset?.lessonId || '';

    if(!courseId && window.SIDEBAR?.selectedCourseId) courseId = window.SIDEBAR.selectedCourseId;
    if(!lessonId && window.SIDEBAR?.selectedLessonId) lessonId = window.SIDEBAR.selectedLessonId;

    const p = location.pathname;
    const mf = window.LESSON_MANIFEST?.[p];
    if(!courseId && mf?.course_id) courseId = mf.course_id;
    if(!lessonId && mf?.lesson_id) lessonId = mf.lesson_id;

    if(!courseId) courseId = guessCourseIdFromPath(p);
    if(!lessonId) lessonId = guessLessonIdFromPath(p);

    if(!courseId || !lessonId){
      throw new Error(`Course/Lesson ID tidak ditemukan. \n    Path: ${p}\n    courseId: ${courseId || '-'} \n    lessonId: ${lessonId || '-'}\n    Pastikan salah satu tersedia: data-attribute di #worksheetRoot, sidebar.mod, manifest-lessons.js, atau penamaan file yang konsisten.`);
    }
    return {courseId, lessonId};
  }

  function showSuccessModal(storageUrl, driveUrl){
    const modal = document.createElement('div');
    Object.assign(modal.style,{
      position:'fixed',top:'20%',left:'50%',transform:'translateX(-50%)',
      background:'#fff',border:'1px solid #ccc',padding:'16px',zIndex:9999,
      boxShadow:'0 2px 8px rgba(0,0,0,0.3)'
    });
    modal.innerHTML = `
      <p>Worksheet tersimpan \u2705</p>
      <p><a href="${storageUrl}" target="_blank" rel="noopener">View Storage</a></p>
      <p><a href="${driveUrl}" target="_blank" rel="noopener">View Drive</a></p>
      <button id="wsCloseModal">Tutup</button>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#wsCloseModal').addEventListener('click',()=>modal.remove());
  }

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
      // defer disabling to click-time since the button might not exist yet
      window.__WS_RESOLVE_ERROR__ = 'ID pelajaran tidak ditemukan. Hubungi admin untuk memperbaiki konfigurasi halaman.';
    }

    // Avoid duplicate delegated binding
    if (document.__WS_DELEGATED_BOUND__) {
      clog('delegated click already bound');
      return;
    }
    document.__WS_DELEGATED_BOUND__ = true;

    document.addEventListener('click', async function(e){
      const btn = e.target && e.target.closest && e.target.closest('#btnSelesai, .btn-selesai, button[data-action="finish"], button.hud-btn.finish, a#btnSelesai, a.btn-selesai');
      if(!btn) return;

      clog('delegated click on finish button');
      e.preventDefault();
      e.stopPropagation();

      // Resolve IDs on click if earlier failed
      if ((!courseId || !lessonId) && window.__WS_RESOLVE_ERROR__) {
        btn.title = window.__WS_RESOLVE_ERROR__;
        alert(window.__WS_RESOLVE_ERROR__);
        return;
      }

      // Role check at click-time
      const user = await fetchUser();
      if(!user || !['guru','moderator'].includes(user.role)){
        btn.title = 'Khusus Guru/Moderator';
        clog('blocked: role not allowed or user missing', user);
        return;
      }

      // Ensure worksheet root exists
      const root = document.querySelector('#worksheetRoot');
      if(!root){
        alert('Gagal: #worksheetRoot tidak ditemukan di halaman.');
        clog('no #worksheetRoot found');
        return;
      }

      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Menyimpan...';

      try{
        const answers = collectAnswers();
        const screenshot = await capture('#worksheetRoot');
        const payload = {
          murid_uid: opts.muridUid,
          cid: opts.cid || '',
          nama_anak: opts.namaAnak || '',
          course_id: courseId,
          lesson_id: lessonId,
          answers_text: answers,
          screenshot_base64: screenshot
        };

        const res = await fetch(`${API_BASE}/api/worksheet/submit`,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          credentials:'include',
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(()=>({ok:false,message:'Invalid JSON'}));
        clog('submit response status:', res.status);
        if(res.ok && data.ok){
          showSuccessModal(data.storage_url, data.drive_url);
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
    }, true); // capture phase
    clog('delegated click handler bound (capture)');
  };
})();
