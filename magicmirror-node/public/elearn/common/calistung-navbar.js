(function initCalistungNavbar(){
  if (window.__calistungNavbarInitialized) {
    return;
  }
  window.__calistungNavbarInitialized = true;

  const initPenTouchBridge = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    if (!window.PointerEvent) {
      return;
    }
    if (window.__calistungPenTouchBridgeInitialized) {
      return;
    }
    window.__calistungPenTouchBridgeInitialized = true;

    const POINTER_TO_TOUCH = {
      pointerdown: 'touchstart',
      pointermove: 'touchmove',
      pointerup: 'touchend',
      pointercancel: 'touchcancel'
    };

    const asTouchEntry = (evt) => ({
      identifier: evt.pointerId || 0,
      target: evt.target || document.body,
      clientX: evt.clientX,
      clientY: evt.clientY,
      screenX: evt.screenX,
      screenY: evt.screenY,
      pageX: evt.pageX,
      pageY: evt.pageY,
      radiusX: evt.width ? evt.width / 2 : 0,
      radiusY: evt.height ? evt.height / 2 : 0,
      force: typeof evt.pressure === 'number' ? evt.pressure : 0.5
    });

    const define = (obj, prop, value) => {
      try {
        Object.defineProperty(obj, prop, {
          configurable: true,
          enumerable: true,
          value
        });
      } catch (err) {
        try {
          obj[prop] = value;
        } catch (_) {
          /* ignore */
        }
      }
    };

    const dispatchSyntheticTouch = (pointerEvent, type) => {
      const target = pointerEvent.target;
      if (!target || typeof target.dispatchEvent !== 'function') {
        return;
      }

      const touches = (type === 'touchend' || type === 'touchcancel')
        ? []
        : [asTouchEntry(pointerEvent)];
      const changedTouches = [asTouchEntry(pointerEvent)];

      const synthetic = new Event(type, { bubbles: true, cancelable: true });
      define(synthetic, 'touches', touches);
      define(synthetic, 'changedTouches', changedTouches);
      define(synthetic, 'targetTouches', touches);
      define(synthetic, 'pointerEvent', pointerEvent);
      define(synthetic, 'clientX', pointerEvent.clientX);
      define(synthetic, 'clientY', pointerEvent.clientY);
      define(synthetic, 'pageX', pointerEvent.pageX);
      define(synthetic, 'pageY', pointerEvent.pageY);
      define(synthetic, 'screenX', pointerEvent.screenX);
      define(synthetic, 'screenY', pointerEvent.screenY);

      const defaultPrevent = synthetic.preventDefault.bind(synthetic);
      let prevented = false;
      synthetic.preventDefault = () => {
        prevented = true;
        return defaultPrevent();
      };

      const cancelled = !target.dispatchEvent(synthetic);
      if (prevented || synthetic.defaultPrevented || cancelled) {
        pointerEvent.preventDefault();
      }
    };

    const shouldEmulate = (evt, type) => {
      if (!evt || evt.isPrimary === false) {
        return false;
      }
      if (evt.pointerType === 'pen') {
        if (type === 'pointermove' && evt.buttons === 0 && (!evt.pressure || evt.pressure === 0)) {
          return false;
        }
        return true;
      }
      if (evt.pointerType === 'touch' && !('ontouchstart' in window)) {
        if (type === 'pointermove' && evt.buttons === 0 && (!evt.pressure || evt.pressure === 0)) {
          return false;
        }
        return true;
      }
      return false;
    };

    Object.keys(POINTER_TO_TOUCH).forEach((pointerType) => {
      document.addEventListener(pointerType, (evt) => {
        if (!shouldEmulate(evt, pointerType)) {
          return;
        }
        const mapped = POINTER_TO_TOUCH[pointerType];
        dispatchSyntheticTouch(evt, mapped);
      }, true);
    });
  };

  const initWorksheetScrollGuard = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    if (window.__calistungScrollGuardInitialized) {
      return;
    }

    const boot = () => {
      if (window.__calistungScrollGuardInitialized) {
        return;
      }
      const body = document.body;
      if (!body) {
        return;
      }
      window.__calistungScrollGuardInitialized = true;

      const activePointers = new Set();
      const KEYWORD_RE = /(canvas|trace|draw|touch|paint|scribble|write|tulis|warna|gambar)/i;
      const IGNORE_SELECTOR = [
        '.calistung-navbar',
        '.finish-bar',
        '.hud-bar',
        '.hud-panel',
        '.shell-action-bar',
        '.shell-button',
        '.shape-button',
        '#btnSelesai',
        '.btn-selesai',
        'button[data-action="finish"]',
        'button.hud-btn.finish',
        'a#btnSelesai',
        'a.btn-selesai',
        '[data-allow-scroll]',
        '[data-scrollable]'
      ].join(', ');

      const style = document.createElement('style');
      const scopedSelectors = IGNORE_SELECTOR
        .split(',')
        .map((sel) => `body.calistung-scroll-lock ${sel.trim()}`)
        .join(', ');
      style.textContent = `
        body.calistung-scroll-lock {
          touch-action: none !important;
          overscroll-behavior: contain;
        }
        ${scopedSelectors} {
          touch-action: auto !important;
        }
      `;
      (document.head || document.documentElement || body).appendChild(style);

      const asElement = (node) => {
        if (!node) {
          return null;
        }
        if (node.nodeType === 1) {
          return node;
        }
        return node.parentElement || null;
      };

      const shouldSkip = (element) => {
        if (!element || typeof element.closest !== 'function') {
          return false;
        }
        return Boolean(element.closest(IGNORE_SELECTOR));
      };

      const hasKeyword = (element) => {
        if (!element) {
          return false;
        }
        const id = (element.id || '').toLowerCase();
        if (KEYWORD_RE.test(id)) {
          return true;
        }
        const className = typeof element.className === 'string' ? element.className.toLowerCase() : '';
        if (KEYWORD_RE.test(className)) {
          return true;
        }
        const role = (element.getAttribute && element.getAttribute('data-role')) || '';
        if (KEYWORD_RE.test(role.toLowerCase())) {
          return true;
        }
        return false;
      };

      const shouldLock = (target) => {
        let element = asElement(target);
        while (element && element !== body) {
          if (shouldSkip(element)) {
            return false;
          }
          if (element.hasAttribute('data-touch-lock') || element.hasAttribute('data-scroll-lock') || element.hasAttribute('data-touch-scroll-lock')) {
            return true;
          }
          if (hasKeyword(element)) {
            return true;
          }
          if (element.tagName === 'CANVAS' || element.tagName === 'SVG') {
            return true;
          }
          if (element.tagName === 'PATH' || element.tagName === 'LINE' || element.tagName === 'CIRCLE' || element.tagName === 'RECT' || element.tagName === 'POLYGON') {
            return true;
          }
          try {
            const style = window.getComputedStyle ? window.getComputedStyle(element) : null;
            if (style) {
              const touchAction = (style.touchAction || '').trim();
              if (touchAction && touchAction !== 'auto' && touchAction !== 'manipulation') {
                return true;
              }
              if (!hasKeyword(element) && (touchAction === 'auto' || !touchAction)) {
                const userSelect = (style.userSelect || style.webkitUserSelect || '').toLowerCase();
                if (userSelect === 'none' && (style.cursor || '').includes('grab')) {
                  return true;
                }
              }
            }
          } catch (err) {
            /* ignore */
          }
          element = element.parentElement;
        }
        return false;
      };

      const lock = (id) => {
        if (!id && id !== 0) {
          id = 'default';
        }
        activePointers.add(id);
        if (activePointers.size > 0) {
          body.classList.add('calistung-scroll-lock');
        }
      };

      const unlock = (id) => {
        if (!id && id !== 0) {
          id = 'default';
        }
        activePointers.delete(id);
        if (activePointers.size === 0) {
          body.classList.remove('calistung-scroll-lock');
        }
      };

      const isTouchLikePointer = (evt) => evt && (evt.pointerType === 'touch' || evt.pointerType === 'pen');

      document.addEventListener('pointerdown', (evt) => {
        if (!isTouchLikePointer(evt)) {
          return;
        }
        if (!shouldLock(evt.target)) {
          return;
        }
        lock('p' + (evt.pointerId || 0));
      }, true);

      const pointerRelease = (evt) => {
        if (!isTouchLikePointer(evt)) {
          return;
        }
        unlock('p' + (evt.pointerId || 0));
      };

      document.addEventListener('pointerup', pointerRelease, true);
      document.addEventListener('pointercancel', pointerRelease, true);
      document.addEventListener('lostpointercapture', pointerRelease, true);

      document.addEventListener('touchstart', (evt) => {
        const touches = evt.changedTouches || [];
        for (let i = 0; i < touches.length; i += 1) {
          const touch = touches[i];
          const target = touch.target || evt.target;
          if (!shouldLock(target)) {
            continue;
          }
          lock('t' + (touch.identifier || i));
        }
      }, { capture: true, passive: true });

      const touchRelease = (evt) => {
        const touches = evt.changedTouches || [];
        for (let i = 0; i < touches.length; i += 1) {
          const touch = touches[i];
          unlock('t' + (touch.identifier || i));
        }
      };

      document.addEventListener('touchend', touchRelease, true);
      document.addEventListener('touchcancel', touchRelease, true);

      document.addEventListener('touchmove', (evt) => {
        if (activePointers.size > 0) {
          evt.preventDefault();
        }
      }, { capture: true, passive: false });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          activePointers.clear();
          body.classList.remove('calistung-scroll-lock');
        }
      });

      window.addEventListener('blur', () => {
        activePointers.clear();
        body.classList.remove('calistung-scroll-lock');
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  };

  initPenTouchBridge();
  initWorksheetScrollGuard();

  const DEFAULT_HOME_URL = "/elearn/map.html";
  const NAV_STYLE_ID = "calistung-navbar-style";
  const PAUSE_MENU_SCRIPT_SRC = "/elearn/worlds/ui/pause-menu.js";
  const MUSIC_SCRIPT_SRC = "/elearn/worlds/calistung/music.js";
  const LESSON_ACTIONS_SCRIPT_SRC = "/elearn/worlds/calistung/common/lesson-actions.js";
  const BUTTON_SFX_FALLBACK_SRC = 'data:audio/wav;base64,' +
    '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';

  const initButtonSfx = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    if (window.__calistungButtonSfxInitialized) {
      return;
    }
    window.__calistungButtonSfxInitialized = true;

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;
    let buttonBuffer = null;
    let fallbackAudio = null;
    let lastPlayAt = 0;

    const ensureContext = () => {
      if (!AudioContextCtor) {
        return null;
      }
      if (!audioCtx) {
        try {
          audioCtx = new AudioContextCtor();
        } catch (err) {
          audioCtx = null;
        }
      }
      return audioCtx;
    };

    const createButtonBuffer = (context) => {
      if (!context || !context.createBuffer) {
        return null;
      }
      try {
        const duration = 0.28;
        const sampleRate = context.sampleRate || 44100;
        const frameCount = Math.max(1, Math.floor(sampleRate * duration));
        const buffer = context.createBuffer(1, frameCount, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < frameCount; i += 1) {
          const t = i / sampleRate;
          const decay = Math.pow(1 - (i / frameCount), 1.8);
          const freq = 420 + (820 * Math.pow(decay, 0.3));
          const tone = Math.sin(2 * Math.PI * freq * t);
          const noise = (Math.random() * 2 - 1) * 0.12;
          data[i] = (tone * 0.9 + noise * 0.4) * decay;
        }
        return buffer;
      } catch (err) {
        return null;
      }
    };

    const ensureButtonBuffer = (context) => {
      if (!context) {
        return null;
      }
      if (!buttonBuffer) {
        buttonBuffer = createButtonBuffer(context);
      }
      return buttonBuffer;
    };

    const playWithContext = (context) => {
      const buffer = ensureButtonBuffer(context);
      if (!buffer || !context.createBufferSource) {
        return false;
      }
      try {
        const now = context.currentTime || 0;
        const source = context.createBufferSource();
        source.buffer = buffer;
        const gain = context.createGain ? context.createGain() : null;
        if (gain && gain.gain) {
          const start = now;
          const peak = start + 0.012;
          const end = start + 0.28;
          gain.gain.setValueAtTime(0.001, start);
          gain.gain.exponentialRampToValueAtTime(0.5, peak);
          gain.gain.exponentialRampToValueAtTime(0.001, end);
          source.connect(gain).connect(context.destination);
        } else {
          source.connect(context.destination);
        }
        source.start(now);
        return true;
      } catch (err) {
        return false;
      }
    };

    const ensureFallbackAudio = () => {
      if (!fallbackAudio && typeof Audio !== 'undefined') {
        try {
          fallbackAudio = new Audio(BUTTON_SFX_FALLBACK_SRC);
          fallbackAudio.preload = 'auto';
          fallbackAudio.volume = 0.6;
        } catch (err) {
          fallbackAudio = null;
        }
      }
      return fallbackAudio;
    };

    const playFallback = () => {
      const audioEl = ensureFallbackAudio();
      if (!audioEl) {
        return;
      }
      try {
        audioEl.currentTime = 0;
      } catch (err) {
        /* ignore */
      }
      audioEl.play().catch(() => {});
    };

    const resumeContext = () => {
      const context = ensureContext();
      if (context && context.state === 'suspended' && typeof context.resume === 'function') {
        context.resume().catch(() => {});
      }
    };

    const shouldSkip = (element) => {
      if (!element) {
        return true;
      }
      if (typeof element.closest === 'function' && element.closest('[data-sfx-ignore], [data-no-sfx], [data-disable-sfx]')) {
        return true;
      }
      if (element.disabled) {
        return true;
      }
      if (typeof element.getAttribute === 'function') {
        const ariaDisabled = element.getAttribute('aria-disabled');
        if (ariaDisabled && ariaDisabled !== 'false') {
          return true;
        }
      }
      if (element.classList && element.classList.contains && element.classList.contains('disabled')) {
        return true;
      }
      return false;
    };

    const BUTTON_CLASS_RE = /(\bbtn\b|\bbutton\b|shape-button|mathgame|calistung-navbar__btn|finish|check|reset|submit|shuffle|control|action|option|choice|answer|play|pause|undo|redo|next|prev)/i;

    const qualifiesAsButton = (node) => {
      if (!node || shouldSkip(node)) {
        return false;
      }
      const tag = (node.tagName || '').toLowerCase();
      if (tag === 'button') {
        return true;
      }
      if (tag === 'input') {
        const type = (node.type || '').toLowerCase();
        if (type === 'button' || type === 'submit' || type === 'reset' || type === 'checkbox' || type === 'radio') {
          return !node.readOnly;
        }
      }
      const role = (typeof node.getAttribute === 'function' && node.getAttribute('role')) || '';
      if (role.toLowerCase() === 'button') {
        return true;
      }
      if (node.dataset) {
        if (node.dataset.button || node.dataset.action === 'button' || node.dataset.sfxButton === 'true') {
          return true;
        }
      }
      const className = typeof node.className === 'string' ? node.className : '';
      if (BUTTON_CLASS_RE.test(className)) {
        return true;
      }
      if (tag === 'a') {
        if (role && role.toLowerCase() === 'button') {
          return true;
        }
        if (className && BUTTON_CLASS_RE.test(className)) {
          return true;
        }
      }
      if (node.tabIndex != null && node.tabIndex >= 0 && BUTTON_CLASS_RE.test(className)) {
        return true;
      }
      return false;
    };

    const findInteractive = (target) => {
      let el = target;
      while (el && el !== document && el !== window) {
        if (qualifiesAsButton(el)) {
          return el;
        }
        el = el.parentElement;
      }
      return null;
    };

    const playSfx = () => {
      const now = Date.now();
      if (now - lastPlayAt < 40) {
        return;
      }
      lastPlayAt = now;
      const context = ensureContext();
      if (context && playWithContext(context)) {
        return;
      }
      playFallback();
    };

    const prepareContext = (event) => {
      if (!event || event.defaultPrevented || !event.isTrusted) {
        return;
      }
      const candidate = findInteractive(event.target);
      if (!candidate) {
        return;
      }
      resumeContext();
    };

    const handleClick = (event) => {
      if (!event || event.defaultPrevented || !event.isTrusted) {
        return;
      }
      const candidate = findInteractive(event.target);
      if (!candidate) {
        return;
      }
      resumeContext();
      playSfx();
    };

    const handleKey = (event) => {
      if (!event || event.defaultPrevented || !event.isTrusted) {
        return;
      }
      const key = event.key;
      if (key !== 'Enter' && key !== ' ' && key !== 'Spacebar') {
        return;
      }
      const target = document.activeElement || event.target;
      const candidate = findInteractive(target);
      if (!candidate) {
        return;
      }
      resumeContext();
      setTimeout(playSfx, 0);
    };

    document.addEventListener('pointerdown', prepareContext, true);
    document.addEventListener('touchstart', prepareContext, true);
    document.addEventListener('keydown', handleKey, true);
    document.addEventListener('click', handleClick, true);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initButtonSfx, { once: true });
  } else {
    initButtonSfx();
  }

  const ensureMusicScript = () => {
    if (!document) {
      return;
    }
    if (window.CalistungMusic && typeof window.CalistungMusic.applyAuto === 'function') {
      window.CalistungMusic.applyAuto();
      return;
    }
    const existing = document.querySelector(`script[src="${MUSIC_SCRIPT_SRC}"]`);
    const onReady = () => {
      if (window.CalistungMusic && typeof window.CalistungMusic.applyAuto === 'function') {
        window.CalistungMusic.applyAuto();
      }
    };
    if (existing) {
      existing.addEventListener('load', onReady, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = MUSIC_SCRIPT_SRC;
    script.addEventListener('load', onReady, { once: true });
    (document.head || document.documentElement || document.body).appendChild(script);
  };

  const ensureLessonActionsScript = () => {
    if (!document || !document.body) {
      return;
    }
    const existing = document.querySelector(`script[src="${LESSON_ACTIONS_SCRIPT_SRC}"]`);
    if (existing) {
      return;
    }
    const script = document.createElement('script');
    script.src = LESSON_ACTIONS_SCRIPT_SRC;
    script.setAttribute('data-lesson-actions', 'true');
    (document.body || document.documentElement || document.head).appendChild(script);
  };

  const ensureStyles = () => {
    if (document.getElementById(NAV_STYLE_ID)) {
      return;
    }
    const style = document.createElement("style");
    style.id = NAV_STYLE_ID;
    style.textContent = `
      body.calistung-navbar-body {
        position: relative;
      }
      .calistung-navbar {
        position: relative;
        z-index: 3000;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        width: min(1180px, calc(100% - 32px));
        max-width: 1180px;
        box-sizing: border-box;
        padding: 12px 18px;
        margin: clamp(18px, 4vw, 32px) auto;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 18px;
        box-shadow: 0 8px 24px rgba(18, 38, 77, 0.18);
        backdrop-filter: blur(8px);
      }
      body.number-game .calistung-navbar__btn--back {
        min-width: 110px;
        justify-content: center;
      }
      .calistung-navbar__btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-family: inherit;
        font-weight: 600;
        font-size: 0.95rem;
        padding: 10px 18px;
        border-radius: 999px;
        border: none;
        background: linear-gradient(135deg, #4c6ef5, #7950f2);
        color: #fff;
        box-shadow: 0 6px 18px rgba(76, 110, 245, 0.25);
        cursor: pointer;
        text-decoration: none;
        transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        min-width: 92px;
      }
      .calistung-navbar__btn:hover,
      .calistung-navbar__btn:focus-visible {
        transform: translateY(-1px) scale(1.02);
        box-shadow: 0 8px 22px rgba(76, 110, 245, 0.32);
        outline: none;
      }
      .calistung-navbar__btn:active {
        transform: translateY(0);
        filter: brightness(0.95);
      }
      .calistung-navbar__btn--back {
        background: linear-gradient(135deg, #ff922b, #f76707);
        box-shadow: 0 6px 18px rgba(247, 103, 7, 0.28);
      }
      .calistung-navbar__btn--back:hover,
      .calistung-navbar__btn--back:focus-visible {
        box-shadow: 0 8px 22px rgba(247, 103, 7, 0.35);
      }
      .calistung-navbar__info {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        min-width: 0;
      }
      .calistung-navbar__badge {
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.7rem;
        font-weight: 700;
        color: #495057;
      }
      .calistung-navbar__title {
        margin-top: 4px;
        font-size: 1.05rem;
        font-weight: 700;
        color: #212529;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
      .calistung-navbar__note {
        margin-top: 6px;
        font-size: 0.85rem;
        font-weight: 600;
        color: rgba(15, 23, 42, 0.72);
      }
      .calistung-navbar--alphabet {
        margin-bottom: clamp(18px, 4vw, 32px);
      }
      @media (max-width: 640px) {
        .calistung-navbar {
          padding: 10px 14px;
          gap: 8px;
        }
        .calistung-navbar__btn {
          font-size: 0.85rem;
          padding: 8px 14px;
          min-width: 78px;
        }
        .calistung-navbar__title {
          font-size: 0.95rem;
        }
        .calistung-navbar__note {
          font-size: 0.78rem;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const hasPauseMenuScript = () => {
    if (typeof window !== 'undefined' && window.__hasPauseMenu) {
      return true;
    }
    if (document.querySelector("script[data-pause-menu]")) {
      return true;
    }
    if (document.querySelector("script[src*=\"" + PAUSE_MENU_SCRIPT_SRC + "\"]")) {
      return true;
    }
    return false;
  };

  const ensurePauseMenuScript = () => {
    if (!document || !document.body || !document.body.dataset) {
      return;
    }
    const behavior = (document.body.dataset.navBackBehavior || '').toLowerCase();
    if (behavior !== 'pause-menu') {
      return;
    }
    if (hasPauseMenuScript()) {
      return;
    }
    const script = document.createElement('script');
    script.src = PAUSE_MENU_SCRIPT_SRC;
    script.setAttribute('data-pause-menu', 'true');
    script.onload = function () {
      try {
        window.__hasPauseMenu = true;
      } catch (err) {
        /* ignore flag assignment errors */
      }
    };
    try {
      (document.body || document.head || document.documentElement).appendChild(script);
    } catch (err) {
      /* ignore append errors */
    }
  };

  const applyPageDefaults = () => {
    if (!document || !document.body || !document.body.dataset) {
      return false;
    }
    const body = document.body;
    const dataset = body.dataset;
    const classList = body.classList;

    const badgeValue = (dataset.navBadge || '').toLowerCase();
    let isShapeWorld = false;
    let isMathWorld = false;

    if (classList && typeof classList.contains === 'function') {
      if (classList.contains('shape-shell')) {
        isShapeWorld = true;
      } else if (classList.contains('mathgame-shell')) {
        isMathWorld = true;
      }
    }

    if (!isShapeWorld && !isMathWorld) {
      if (badgeValue.indexOf('calistung') !== -1) {
        if (badgeValue.indexOf('shape') !== -1) {
          isShapeWorld = true;
        } else if (badgeValue.indexOf('math') !== -1 || badgeValue.indexOf('angka') !== -1) {
          isMathWorld = true;
        }
      }
    }

    if (isShapeWorld) {
      if (!dataset.navBadge) {
        dataset.navBadge = 'Calistung Shape';
      }
      if (!dataset.navHomeUrl) {
        dataset.navHomeUrl = '/elearn/worlds/calistung/shape/index.html';
      }
      if (!dataset.navBackBehavior) {
        dataset.navBackBehavior = 'pause-menu';
      }
      if (!dataset.pauseToggle) {
        dataset.pauseToggle = 'disabled';
      }
      if (!dataset.navNote) {
        dataset.navNote = 'Puzzle jawaban tidak bisa di-drag.';
      }
    }

    if (isMathWorld) {
      if (!dataset.navBadge) {
        dataset.navBadge = 'Calistung Math';
      }
      if (!dataset.navHomeUrl) {
        dataset.navHomeUrl = '/elearn/worlds/calistung/math-game/index.html';
      }
      if (!dataset.navBackBehavior) {
        dataset.navBackBehavior = 'pause-menu';
      }
      if (!dataset.pauseToggle) {
        dataset.pauseToggle = 'disabled';
      }
    }

    ensurePauseMenuScript();
    ensureLessonActionsScript();
    if (!dataset.calistungBgm) {
      dataset.calistungBgm = 'level';
    }
    return true;
  };

  const earlyPrepared = applyPageDefaults();
  if (!earlyPrepared) {
    document.addEventListener('DOMContentLoaded', applyPageDefaults, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureMusicScript, { once: true });
  } else {
    ensureMusicScript();
  }

  const createNav = () => {
    const nav = document.createElement('nav');
    nav.className = 'calistung-navbar';

    const mapUrl = document.body.dataset.navHomeUrl || DEFAULT_HOME_URL;
    const badgeLabel = document.body.dataset.navBadge || 'Calistung';
    const note = (document.body.dataset.navNote || '').trim();

    const mapBtn = document.createElement('a');
    mapBtn.className = 'calistung-navbar__btn calistung-navbar__btn--map';
    mapBtn.href = mapUrl || '#';
    mapBtn.innerHTML = '🗺️ <span>Map</span>';

    const info = document.createElement('div');
    info.className = 'calistung-navbar__info';

    const badgeEl = document.createElement('span');
    badgeEl.className = 'calistung-navbar__badge';
    badgeEl.textContent = badgeLabel;
    info.appendChild(badgeEl);

    const titleEl = document.createElement('span');
    titleEl.className = 'calistung-navbar__title';
    info.appendChild(titleEl);

    if (note) {
      const noteEl = document.createElement('span');
      noteEl.className = 'calistung-navbar__note';
      noteEl.textContent = note;
      info.appendChild(noteEl);
    }

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'calistung-navbar__btn calistung-navbar__btn--back';
    backBtn.setAttribute('aria-label', 'Back');
    backBtn.innerHTML = '<span>Back</span> ⬅️';

    nav.appendChild(mapBtn);
    nav.appendChild(info);
    nav.appendChild(backBtn);

    const prepareThemeTrack = () => {
      if (window.CalistungMusic && typeof window.CalistungMusic.prepareNextTrack === 'function') {
        window.CalistungMusic.prepareNextTrack('theme');
      }
    };

    const explicitTitle = document.body.dataset.levelTitle;
    if (explicitTitle) {
      titleEl.textContent = explicitTitle;
    } else {
      const firstHeading = document.querySelector('main h1, h1');
      if (firstHeading && firstHeading.textContent.trim()) {
        titleEl.textContent = firstHeading.textContent.trim();
      } else if (document.title) {
        titleEl.textContent = document.title;
      } else {
        titleEl.textContent = 'Lesson';
      }
    }

    const backBehavior = (document.body.dataset.navBackBehavior || '').toLowerCase();

    const runDefaultBack = () => {
      prepareThemeTrack();
      const targetUrl = document.body.dataset.navBackUrl || mapUrl || DEFAULT_HOME_URL;
      if (targetUrl) {
        window.location.href = targetUrl;
      }
    };

    const dispatchBackEvent = (event) => {
      try {
        document.dispatchEvent(new CustomEvent('calistung-navbar:back-click', {
          detail: { button: backBtn, event }
        }));
      } catch (err) {
        /* ignore */
      }
    };

    const tryPauseMenuBack = (event) => {
      let handled = false;
      try {
        const pauseApi = window.PauseMenu || window.__pauseMenu;
        if (pauseApi && typeof pauseApi.open === 'function') {
          pauseApi.open();
          handled = true;
        }
      } catch (err) {
        handled = false;
      }
      if (!handled) {
        const toggle = document.getElementById('pmToggle');
        if (toggle && typeof toggle.click === 'function') {
          try {
            toggle.click();
            handled = true;
          } catch (err) {
            handled = false;
          }
        }
      }
      dispatchBackEvent(event);
      return handled;
    };

    if (backBehavior === 'pause-menu') {
      backBtn.addEventListener('click', (event) => {
        event.preventDefault();
        if (!tryPauseMenuBack(event)) {
          runDefaultBack();
        }
      });
    } else {
      backBtn.addEventListener('click', runDefaultBack);
    }

    const mapBtn = nav.querySelector('.calistung-navbar__btn[href]');
    if (mapBtn) {
      mapBtn.addEventListener('click', prepareThemeTrack);
    }

    return nav;
  };

  const announceReady = (nav) => {
    try {
      document.dispatchEvent(new CustomEvent('calistung-navbar:ready', {
        detail: { nav }
      }));
    } catch (err) {
      /* ignore announce errors */
    }
  };

  const notifyLayout = (nav, offset) => {
    if (!nav || !window || !window.dispatchEvent) {
      return;
    }
    let height = 0;
    try {
      const rect = nav.getBoundingClientRect ? nav.getBoundingClientRect() : null;
      height = rect ? rect.height : 0;
    } catch (err) {
      height = 0;
    }
    try {
      window.dispatchEvent(new CustomEvent('calistung-navbar:offset', {
        detail: { height, offset: offset || 0 }
      }));
    } catch (err) {
      /* ignore dispatch errors */
    }
  };

  const mountDefault = (nav) => {
    document.body.classList.add('calistung-navbar-body');
    document.body.insertBefore(nav, document.body.firstChild || null);
    notifyLayout(nav, 0);
    announceReady(nav);
  };

  const mountAlphabet = (nav) => {
    document.body.classList.add('calistung-navbar-body');
    let attached = false;
    const attachWhenReady = () => {
      const hud = document.querySelector('.alphabet-card--hud');
      if (!hud) {
        if (!nav.isConnected) {
          document.body.insertBefore(nav, document.body.firstChild || null);
        }
        requestAnimationFrame(attachWhenReady);
        return;
      }
      if (attached) {
        return;
      }
      const parent = hud.parentNode || document.body;
      nav.classList.add('calistung-navbar--alphabet');
      parent.insertBefore(nav, hud);
      attached = true;
      notifyLayout(nav, 0);
      announceReady(nav);
    };

    attachWhenReady();
  };

  const buildNavbar = () => {
    ensureStyles();
    if (!document.body) {
      return;
    }

    applyPageDefaults();

    const nav = createNav();

    if (document.body.classList.contains('alphabet-game')) {
      mountAlphabet(nav);
    } else {
      mountDefault(nav);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildNavbar, { once: true });
  } else {
    buildNavbar();
  }

  if (!window.__calistungNavbarPauseBridge) {
    window.__calistungNavbarPauseBridge = true;
    document.addEventListener('calistung-navbar:back-click', function (event) {
      if (!event || !event.detail) {
        return;
      }
      var behavior = (document.body.dataset.navBackBehavior || '').toLowerCase();
      if (behavior !== 'pause-menu') {
        return;
      }
      var handled = false;
      try {
        var bridge = window.PauseMenu || window.__pauseMenu;
        if (bridge && typeof bridge.open === 'function') {
          bridge.open();
          handled = true;
        }
      } catch (err) {
        handled = false;
      }
      if (!handled) {
        var toggle = document.getElementById('pmToggle');
        if (toggle && typeof toggle.click === 'function') {
          try {
            toggle.click();
            handled = true;
          } catch (err) {
            handled = false;
          }
        }
      }
      if (!handled) {
        var fallback = document.body.dataset.navBackUrl || document.body.dataset.navHomeUrl || DEFAULT_HOME_URL;
        if (fallback) {
          window.location.href = fallback;
        }
      }
    });
  }
})();
