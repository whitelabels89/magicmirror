(function(){
  if (typeof window !== 'undefined' && window.__calistungEnsureLessonActionsLoaded) {
    return;
  }
  if (typeof window !== 'undefined') {
    window.__calistungEnsureLessonActionsLoaded = true;
  }

  function canRun() {
    if (typeof document === 'undefined') {
      return false;
    }
    const body = document.body;
    if (!body || !body.classList) {
      return false;
    }
    const cls = body.classList;
    return cls.contains('alphabet-game') ||
      cls.contains('number-game') ||
      cls.contains('shape-shell') ||
      cls.contains('mathgame-shell');
  }

  function onReady(callback) {
    if (typeof document === 'undefined') {
      return;
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function ensureStyles() {
    if (typeof document === 'undefined') {
      return;
    }
    if (document.getElementById('lesson-actions-auto-style')) {
      return;
    }
    const style = document.createElement('style');
    style.id = 'lesson-actions-auto-style';
    style.textContent = `
      .lesson-actions-auto {
        position: fixed;
        right: 16px;
        bottom: 92px;
        z-index: 3200;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .lesson-actions-auto__btn {
        appearance: none;
        border: none;
        border-radius: 12px;
        background: linear-gradient(135deg, #0f172a, #1e293b);
        color: #fff;
        font-weight: 700;
        font-size: 0.92rem;
        padding: 10px 16px;
        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.28);
        cursor: pointer;
        transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
      }
      .lesson-actions-auto__btn:hover,
      .lesson-actions-auto__btn:focus-visible {
        transform: translateY(-1px) scale(1.02);
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.32);
        outline: none;
      }
      .lesson-actions-auto__btn:active {
        transform: translateY(0);
        filter: brightness(0.96);
      }
      @media (max-width: 640px) {
        .lesson-actions-auto {
          left: 50%;
          right: auto;
          bottom: 74px;
          transform: translateX(-50%);
          flex-direction: row;
        }
      }
    `;
    (document.head || document.documentElement || document.body).appendChild(style);
  }

  function trigger(action) {
    const method = 'lesson' + action;
    let handled = false;
    try {
      if (typeof window !== 'undefined' && typeof window[method] === 'function') {
        window[method]();
        handled = true;
      }
    } catch (err) {
      handled = true;
      console.error('[lesson-actions] Gagal menjalankan', method, err);
    }

    if (typeof document !== 'undefined') {
      try {
        const evt = new CustomEvent('lesson:' + action.toLowerCase(), { cancelable: true });
        const dispatched = document.dispatchEvent(evt);
        if (!dispatched || evt.defaultPrevented) {
          handled = true;
        }
      } catch (err) {
        console.error('[lesson-actions] Gagal broadcast event lesson:' + action.toLowerCase(), err);
        handled = true;
      }
    }

    if (!handled) {
      console.warn('[lesson-actions] Tidak ada handler untuk tombol', action.toLowerCase());
    }
  }

  function resolveParent(existingButtons) {
    const anchor = existingButtons.shuffle || existingButtons.reset || existingButtons.check;
    if (anchor && anchor.parentElement && anchor.parentElement !== document.body) {
      return {
        parent: anchor.parentElement,
        className: anchor.className || ''
      };
    }
    ensureStyles();
    let auto = document.querySelector('.lesson-actions-auto');
    if (!auto) {
      auto = document.createElement('div');
      auto.className = 'lesson-actions-auto';
      auto.setAttribute('data-generated', 'lesson-actions');
      if (document.body) {
        document.body.appendChild(auto);
      }
    }
    return {
      parent: auto,
      className: 'lesson-actions-auto__btn'
    };
  }

  function createButton(id, label, className, actionName) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = id;
    if (className) {
      btn.className = className;
    } else {
      ensureStyles();
      btn.className = 'lesson-actions-auto__btn';
    }
    btn.textContent = label;
    btn.dataset.lessonButton = actionName;
    btn.addEventListener('click', () => trigger(actionName.charAt(0).toUpperCase() + actionName.slice(1)));
    return btn;
  }

  function ensureButtons() {
    if (!canRun()) {
      return;
    }
    const body = document.body;
    const disableShuffle = (body.dataset.lessonShuffle || '').toLowerCase() === 'off';
    const disableCheck = (body.dataset.lessonCheck || '').toLowerCase() === 'off';
    const disableReset = (body.dataset.lessonReset || '').toLowerCase() === 'off';

    const existing = {
      shuffle: document.getElementById('btnShuffle'),
      check: document.getElementById('btnCheck'),
      reset: document.getElementById('btnReset')
    };

    if (!existing.shuffle) {
      existing.shuffle = document.querySelector('[data-lesson-button="shuffle"]');
    }
    if (!existing.check) {
      existing.check = document.querySelector('[data-lesson-button="check"]');
    }
    if (!existing.reset) {
      existing.reset = document.querySelector('[data-lesson-button="reset"]');
    }

    const needShuffle = !disableShuffle && !existing.shuffle;
    const needCheck = !disableCheck && !existing.check;
    const needReset = !disableReset && !existing.reset;

    if (!needShuffle && !needCheck && !needReset) {
      return;
    }

    const { parent, className } = resolveParent(existing);
    if (!parent) {
      return;
    }

    if (needShuffle) {
      const btn = createButton('btnShuffle', 'Acak Soal', className, 'shuffle');
      parent.appendChild(btn);
    }
    if (needReset) {
      const btn = createButton('btnReset', 'Reset', className, 'reset');
      parent.appendChild(btn);
    }
    if (needCheck) {
      const btn = createButton('btnCheck', 'Periksa Jawaban', className, 'check');
      parent.appendChild(btn);
    }
  }

  onReady(ensureButtons);
  if (typeof setTimeout === 'function') {
    setTimeout(ensureButtons, 1500);
  }
})();
