(function initCalistungNavbar(){
  if (window.__calistungNavbarInitialized) {
    return;
  }
  window.__calistungNavbarInitialized = true;

  const DEFAULT_HOME_URL = "/elearn/map.html";
  const NAV_STYLE_ID = "calistung-navbar-style";
  const PAUSE_MENU_SCRIPT_SRC = "/elearn/worlds/ui/pause-menu.js";

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
    return true;
  };

  const earlyPrepared = applyPageDefaults();
  if (!earlyPrepared) {
    document.addEventListener('DOMContentLoaded', applyPageDefaults, { once: true });
  }

  const createNav = () => {
    const nav = document.createElement('nav');
    nav.className = 'calistung-navbar';

    const mapUrl = document.body.dataset.navHomeUrl || DEFAULT_HOME_URL;
    const badgeLabel = document.body.dataset.navBadge || 'Calistung';

    nav.innerHTML = `
      <button type="button" class="calistung-navbar__btn calistung-navbar__btn--back" aria-label="BACK">
        ⬅️ <span>BACK</span>
      </button>
      <div class="calistung-navbar__info">
        <span class="calistung-navbar__badge">${badgeLabel}</span>
        <span class="calistung-navbar__title"></span>
      </div>
      <a class="calistung-navbar__btn" href="${mapUrl}">
        🗺️ <span>Map</span>
      </a>
    `;

    const titleEl = nav.querySelector('.calistung-navbar__title');
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

    const backBtn = nav.querySelector('.calistung-navbar__btn--back');
    const backBehavior = (document.body.dataset.navBackBehavior || '').toLowerCase();

    const runDefaultBack = () => {
      const fallbackUrl = document.body.dataset.navBackUrl || mapUrl;
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = fallbackUrl;
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
        if (window.history.length > 1) {
          window.history.back();
        } else if (fallback) {
          window.location.href = fallback;
        }
      }
    });
  }
})();
