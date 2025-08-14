(function(){
  const WS_DEBUG = (window.WORKSHEET_DEBUG === true);
  function clog(...args){ if(WS_DEBUG) console.log('[worksheet-submit]', ...args); }

  function resolveSubmitButton(){
    // try several common selectors
    return document.querySelector('#btnSelesai') ||
           document.querySelector('.btn-selesai') ||
           document.querySelector('button[data-action="finish"]') ||
           document.querySelector('button.hud-btn.finish') ||
           null;
  }
  function waitForButton(timeoutMs = 10000){
    return new Promise((resolve, reject)=>{
      const btn0 = resolveSubmitButton();
      if(btn0){ return resolve(btn0); }
      let found = null;
      const obs = new MutationObserver(()=>{
        const b = resolveSubmitButton();
        if(b){
          found = b;
          obs.disconnect();
          resolve(b);
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(()=>{
        if(!found){
          obs.disconnect();
          reject(new Error('Submit button not found within timeout'));
        }
      }, timeoutMs);
    });
  }

  async function capture(selector){
    const el = document.querySelector(selector);
    if(!el) throw new Error('Element not found: ' + selector);
    const canvas = await html2canvas(el);
    clog('captured canvas', canvas.width, canvas.height);
    return canvas.toDataURL('image/png').split(',')[1];
  }

  window.initWorksheetSubmit = async function initWorksheetSubmit(opts = {}){
    // wait for button (it may be injected after init)
    let btn;
    try{
      btn = await waitForButton(12000);
      clog('button resolved:', btn);
    }catch(e){
      console.warn('Worksheet submit: button not found.', e.message);
      return;
    }

    let courseId, lessonId;
    try {
      courseId = opts.courseId || window.COURSE_ID || null;
      lessonId = opts.lessonId || window.LESSON_ID || null;
    } catch(e){
      console.warn('Failed to resolve course/lesson IDs', e);
      return;
    }

    if (btn.dataset.wsBound === '1') {
      clog('button already bound, skipping rebind');
      return;
    }

    async function fetchUser(){
      // existing fetchUser code here
    }

    const user = await fetchUser();
    if(!user || !['guru','moderator'].includes(user.role)){
      btn.disabled = true;
      btn.title = 'Khusus Guru/Moderator';
      clog('blocked: role not allowed or user missing', user);
      return;
    }
    btn.dataset.wsBound = '1';
    btn.addEventListener('click', async function(e){
      e.preventDefault();
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Mengirim...';

      const root = document.querySelector('#worksheetRoot');
      if(!root){
        alert('Gagal: #worksheetRoot tidak ditemukan di halaman.');
        clog('no #worksheetRoot found');
        btn.disabled = false; btn.textContent = original;
        return;
      }

      try {
        const screenshot = await capture('#worksheetRoot');
        const payload = {
          murid_uid: user.uid || '',
          cid: opts.cid || '',
          nama_anak: opts.namaAnak || '',
          course_id: courseId,
          lesson_id: lessonId,
          answers_text: opts.answersText || '',
          screenshot_base64: screenshot
        };

        const res = await fetch('/worksheet/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        clog('submit response status:', res.status);
        if(res.ok){
          alert('Berhasil mengirim worksheet!');
          btn.textContent = 'Terkirim';
        } else {
          const data = await res.json();
          alert('Gagal mengirim worksheet: ' + (data.message || 'Unknown error'));
          btn.disabled = false;
          btn.textContent = original;
        }
      } catch(err) {
        alert('Terjadi kesalahan saat mengirim worksheet.');
        clog('submit error', err);
        btn.disabled = false;
        btn.textContent = original;
      }
    });
  };
})();
