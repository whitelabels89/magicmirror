(function initCalistungNavbar(){
  if (window.__calistungNavbarInitialized) {
    return;
  }
  window.__calistungNavbarInitialized = true;

  const DEFAULT_HOME_URL = "/elearn/map.html";
  const NAV_STYLE_ID = "calistung-navbar-style";

  const ensureStyles = () => {
    if (document.getElementById(NAV_STYLE_ID)) {
      return;
    }
    const style = document.createElement("style");
    style.id = NAV_STYLE_ID;
    style.textContent = `
      :root {
        --calistung-navbar-height: 0px;
      }
      body.calistung-navbar-body {
        position: relative;
        --calistung-navbar-base-padding: 0px;
        --calistung-navbar-offset: 0px;
      }
      body.calistung-navbar-body:not(.alphabet-game) {
        padding-top: calc(var(--calistung-navbar-base-padding) + var(--calistung-navbar-offset));
        scroll-padding-top: calc(var(--calistung-navbar-base-padding) + var(--calistung-navbar-offset));
      }
      .calistung-navbar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 3000;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        width: 100%;
        box-sizing: border-box;
        padding: 12px 18px;
        background: rgba(255, 255, 255, 0.95);
        border-bottom-left-radius: 18px;
        border-bottom-right-radius: 18px;
        box-shadow: 0 8px 24px rgba(18, 38, 77, 0.18);
        backdrop-filter: blur(8px);
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
        position: relative;
        top: 0;
        left: auto;
        right: auto;
        width: 100%;
      }
      .alphabet-fixed-shell {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 2950;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        pointer-events: none;
        padding: 12px 0 0;
      }
      .alphabet-fixed-shell > * {
        pointer-events: auto;
      }
      .alphabet-fixed-shell .alphabet-card--hud {
        position: relative !important;
        top: 0 !important;
        width: min(1200px, calc(100% - 32px));
        margin: 0;
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
        .alphabet-fixed-shell .alphabet-card--hud {
          width: min(100%, calc(100% - 20px));
        }
      }
    `;
    document.head.appendChild(style);
  };

  const createNav = () => {
    const nav = document.createElement('nav');
    nav.className = 'calistung-navbar';

    const mapUrl = document.body.dataset.navHomeUrl || DEFAULT_HOME_URL;
    const badgeLabel = document.body.dataset.navBadge || 'Calistung';

    nav.innerHTML = `
      <button type="button" class="calistung-navbar__btn calistung-navbar__btn--back" aria-label="Kembali">
        ⬅️ <span>Kembali</span>
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
    backBtn.addEventListener('click', () => {
      const fallbackUrl = document.body.dataset.navBackUrl || mapUrl;
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = fallbackUrl;
      }
    });

    return nav;
  };

  const observeFonts = (fn) => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fn).catch(() => {});
    }
  };

  const mountDefault = (nav) => {
    document.body.classList.add('calistung-navbar-body');
    document.body.prepend(nav);

    const getBasePadding = () => {
      const styles = window.getComputedStyle(document.body);
      return parseFloat(styles.paddingTop) || 0;
    };

    const basePadding = getBasePadding();
    document.body.style.setProperty('--calistung-navbar-base-padding', `${basePadding}px`);

   const update = () => {
     const navHeight = nav.getBoundingClientRect().height;
     const offset = navHeight + 12;
     const total = basePadding + offset;
     document.body.style.setProperty('--calistung-navbar-offset', `${offset}px`);
     document.documentElement.style.setProperty('--calistung-navbar-height', `${navHeight}px`);
     document.body.style.paddingTop = `${total}px`;
     document.body.style.scrollPaddingTop = `${total}px`;
      window.dispatchEvent(new CustomEvent('calistung-navbar:offset', {
        detail: { height: navHeight, offset }
      }));
   };

    update();

    const resizeObserver = (typeof ResizeObserver === 'function') ? new ResizeObserver(update) : null;
    resizeObserver && resizeObserver.observe(nav);
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    observeFonts(update);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) update();
    }, { passive: true });
  };

  const mountAlphabet = (nav) => {
    document.body.classList.add('calistung-navbar-body');

    const ensureShell = () => {
      let shell = document.getElementById('alphabet-fixed-shell');
      if (!shell) {
        shell = document.createElement('div');
        shell.id = 'alphabet-fixed-shell';
        shell.className = 'alphabet-fixed-shell';
        document.body.appendChild(shell);
      }
      return shell;
    };

    const attachWhenReady = () => {
      const hud = document.querySelector('.alphabet-card--hud');
      if (!hud) {
        requestAnimationFrame(attachWhenReady);
        return;
      }

      const shell = ensureShell();
      nav.classList.add('calistung-navbar--alphabet');
      shell.appendChild(nav);
      shell.appendChild(hud);
      document.body.style.setProperty('--calistung-navbar-base-padding', '0px');

     const update = () => {
       const navHeight = nav.getBoundingClientRect().height;
       const hudHeight = hud.getBoundingClientRect().height;
       const stack = navHeight + hudHeight + 24;
       document.documentElement.style.setProperty('--calistung-navbar-height', `${navHeight}px`);
       document.body.style.setProperty('--calistung-navbar-offset', `${navHeight + 12}px`);
       document.body.style.setProperty('--alphabet-stack-offset', `${stack}px`);
       document.body.style.paddingTop = `16px`;
       document.body.style.scrollPaddingTop = `${stack + 16}px`;
        window.dispatchEvent(new CustomEvent('calistung-navbar:offset', {
          detail: { height: navHeight, offset: navHeight + 12 }
        }));
      };

      update();

     const roSupported = typeof ResizeObserver === 'function';
     if (roSupported) {
       const ro = new ResizeObserver(update);
       ro.observe(nav);
       ro.observe(hud);
     }
     window.addEventListener('resize', update, { passive: true });
     window.addEventListener('orientationchange', update, { passive: true });
     observeFonts(update);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) update();
      }, { passive: true });
    };

    attachWhenReady();
  };

  const buildNavbar = () => {
    ensureStyles();
    if (!document.body) {
      return;
    }

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
})();
