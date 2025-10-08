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

  const ACTION_HINTS = {
    shuffle: {
      selectors: [
        '#btnShuffle',
        '#shuffleBtn',
        '#shuffle',
        '#btnAcak',
        '#btnAcakSoal',
        '#btnAcakLevel',
        '#btnShuffleLevel',
        '#btnNew',
        '#btnAcak1',
        '#btnAcak2',
        '#btnAcak3',
        '#shuffleLevel',
        'button[id*="acak" i]',
        'button[id*="shuffle" i]',
        'button[name*="acak" i]',
        'button[name*="shuffle" i]',
        '[data-lesson-button="shuffle"]',
        '[data-lesson-action="shuffle"]',
        '[data-action="shuffle"]'
      ],
      keywords: ['shuffle', 'acak']
    },
    check: {
      selectors: [
        '#btnCheck',
        '#checkBtn',
        '#check',
        '#btnPeriksa',
        '#btnCek',
        '#btnPeriksa1',
        '#btnPeriksa2',
        '#btnPeriksa3',
        '#btnCheckJawaban',
        '#cekJawabanBtn',
        '#checkButton',
        '#check-btn',
        '#btn-check',
        '#btnPeriksaJawaban',
        '#check1',
        '#check2',
        '#check3',
        'button[id*="periksa" i]',
        'button[id*="cek" i]',
        'button[id*="check" i]',
        'button[name*="periksa" i]',
        'button[name*="cek" i]',
        'button[name*="check" i]',
        '[data-lesson-button="check"]',
        '[data-lesson-action="check"]',
        '[data-action="check"]'
      ],
      keywords: ['periksa', 'cek', 'check']
    },
    reset: {
      selectors: [
        '#btnReset',
        '#resetBtn',
        '#reset',
        '#btnResetAll',
        '#btn-reset',
        '#reset-btn',
        '#resetAns',
        '#resetJawaban',
        '#btnResetJawaban',
        '#resetPilihan',
        '#zoomReset',
        '#btnReset1',
        '#btnReset2',
        '#btnReset3',
        'button[id*="reset" i]',
        'button[id*="ulang" i]',
        'button[name*="reset" i]',
        'button[name*="ulang" i]',
        '[data-lesson-button="reset"]',
        '[data-lesson-action="reset"]',
        '[data-action="reset"]'
      ],
      keywords: ['reset', 'ulang', 'clear', 'hapus']
    }
  };

  const INTERACTIVE_SELECTOR = 'button, a[role="button"], [role="button"]';

  function toSearchableString(value) {
    if (typeof value === 'string') {
      return value.toLowerCase();
    }
    if (!value) {
      return '';
    }
    if (typeof value === 'object') {
      if (typeof value.baseVal === 'string') {
        return value.baseVal.toLowerCase();
      }
      if (typeof value.animVal === 'string') {
        return value.animVal.toLowerCase();
      }
    }
    return String(value || '').toLowerCase();
  }

  function keywordMatches(value, keywords) {
    const normalized = toSearchableString(value);
    if (!normalized) {
      return false;
    }
    for (let i = 0; i < keywords.length; i++) {
      if (normalized.indexOf(keywords[i]) !== -1) {
        return true;
      }
    }
    return false;
  }

  function findExistingAction(action) {
    if (typeof document === 'undefined') {
      return null;
    }
    const hints = ACTION_HINTS[action];
    if (!hints) {
      return null;
    }

    const selectors = hints.selectors || [];
    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i];
      if (!selector) {
        continue;
      }
      let element = null;
      try {
        element = document.querySelector(selector);
      } catch (err) {
        element = null;
      }
      if (element) {
        return element;
      }
    }

    const keywordList = (hints.keywords || []).map((kw) => kw.toLowerCase());
    if (!keywordList.length) {
      return null;
    }

    let interactive = [];
    try {
      interactive = Array.prototype.slice.call(document.querySelectorAll(INTERACTIVE_SELECTOR));
    } catch (err) {
      interactive = [];
    }

    for (let i = 0; i < interactive.length; i++) {
      const el = interactive[i];
      if (!el) {
        continue;
      }
      const dataset = el.dataset || {};
      if (keywordMatches(dataset.lessonButton, keywordList) ||
        keywordMatches(dataset.lessonAction, keywordList) ||
        keywordMatches(dataset.action, keywordList)) {
        return el;
      }
      if (keywordMatches(el.id, keywordList) ||
        keywordMatches(el.getAttribute ? el.getAttribute('name') : '', keywordList) ||
        keywordMatches(el.className, keywordList) ||
        keywordMatches(el.getAttribute ? el.getAttribute('title') : '', keywordList) ||
        keywordMatches(el.getAttribute ? el.getAttribute('aria-label') : '', keywordList) ||
        keywordMatches(el.textContent, keywordList)) {
        return el;
      }
    }

    return null;
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
      shuffle: findExistingAction('shuffle'),
      check: findExistingAction('check'),
      reset: findExistingAction('reset')
    };

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
