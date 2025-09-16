(function () {
  const CONFIG_URL = 'config.json';
  const hudState = {
    stars: 0,
    coins: 0,
    refs: null,
    hud: null,
    updateHudOffset: null
  };
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE']);
  const SKIP_CLASSNAMES = ['finish-bar', 'toast', 'alphabet-hud'];
  const SKIP_IDS = new Set(['pause-menu', 'globalToast']);

  function refreshHudOffset() {
    if (typeof hudState.updateHudOffset === 'function') {
      hudState.updateHudOffset();
    }
  }

  function fetchConfig() {
    if (typeof window.fetch !== 'function') {
      return new Promise((resolve) => {
        try {
          const request = new XMLHttpRequest();
          request.open('GET', CONFIG_URL, true);
          request.responseType = 'json';
          request.onreadystatechange = () => {
            if (request.readyState !== 4) {
              return;
            }
            if (request.status >= 200 && request.status < 300) {
              let response = request.response;
              if (!response && request.responseText) {
                try {
                  response = JSON.parse(request.responseText);
                } catch (err) {
                  /* ignore parse error */
                }
              }
              resolve(response || null);
            } else {
              resolve(null);
            }
          };
          request.onerror = () => resolve(null);
          request.send();
        } catch (err) {
          resolve(null);
        }
      });
    }

    return window.fetch(CONFIG_URL, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }

  function getLevelInfo(config) {
    const nodes = (config && config.map && Array.isArray(config.map.nodes)) ? config.map.nodes : [];
    const path = (window.location.pathname || '').replace(/\\+/g, '/');
    const current = nodes.find((item) => typeof item.entry === 'string' && path.endsWith(item.entry));
    const index = current ? nodes.indexOf(current) : -1;
    let fallbackNumber = null;
    const match = path.match(/alpha-L(\d+)/i);
    if (match) {
      fallbackNumber = Number.parseInt(match[1], 10);
    }

    return {
      index,
      total: nodes.length || 0,
      letter: current && (current.label || current.id) ? String(current.label || current.id) : '',
      title: document.title || 'Alphabet Adventure',
      fallbackNumber
    };
  }

  function createHud(info) {
    const hud = document.createElement('section');
    hud.className = 'alphabet-hud alphabet-card alphabet-card--hud';

    const meta = document.createElement('div');
    meta.className = 'alphabet-hud__meta';

    const badge = document.createElement('span');
    badge.className = 'alphabet-badge';
    meta.appendChild(badge);

    const titleBox = document.createElement('div');
    titleBox.className = 'alphabet-hud__title';

    const mainTitle = document.createElement('h1');
    titleBox.appendChild(mainTitle);

    const subtitle = document.createElement('p');
    subtitle.className = 'alphabet-hud__subtitle';
    titleBox.appendChild(subtitle);

    meta.appendChild(titleBox);
    hud.appendChild(meta);

    const progress = document.createElement('div');
    progress.className = 'alphabet-hud__progress';
    const progressBar = document.createElement('div');
    progressBar.className = 'alphabet-progress';
    const progressValue = document.createElement('span');
    progressValue.className = 'alphabet-progress__value';
    progressBar.appendChild(progressValue);
    progress.appendChild(progressBar);
    const progressLabel = document.createElement('div');
    progressLabel.className = 'alphabet-progress__label';
    progress.appendChild(progressLabel);
    hud.appendChild(progress);

    const maskotWrap = document.createElement('div');
    maskotWrap.className = 'alphabet-hud__maskot';
    const bubble = document.createElement('div');
    bubble.className = 'alphabet-letter-bubble';
    maskotWrap.appendChild(bubble);
    hud.appendChild(maskotWrap);

    const stats = document.createElement('div');
    stats.className = 'alphabet-hud__stats';
    const stars = document.createElement('div');
    stars.className = 'alphabet-stars';
    const starElements = [];
    for (let i = 0; i < 3; i += 1) {
      const star = document.createElement('span');
      star.className = 'alphabet-star';
      star.setAttribute('aria-hidden', 'true');
      star.dataset.star = String(i + 1);
      starElements.push(star);
      stars.appendChild(star);
    }
    stats.appendChild(stars);

    const coins = document.createElement('div');
    coins.className = 'alphabet-coins';
    const coinsValue = document.createElement('span');
    coinsValue.className = 'alphabet-coins__value';
    coinsValue.textContent = '0';
    coins.appendChild(coinsValue);
    stats.appendChild(coins);

    hud.appendChild(stats);

    return {
      hud,
      refs: {
        badge,
        mainTitle,
        subtitle,
        progressValue,
        progressLabel,
        starElements,
        coinsValue,
        bubble
      }
    };
  }

  function initHud(info, refs) {
    const total = info.total || 0;
    const hasIndex = typeof info.index === 'number' && info.index >= 0;
    const levelNumber = hasIndex ? info.index + 1 : (info.fallbackNumber || 0);
    const safeLevel = levelNumber > 0 && total > 0 ? Math.min(levelNumber, total) : levelNumber;
    const percent = total > 0 && levelNumber > 0 ? (levelNumber / total) * 100 : 0;
    const safePercent = Math.max(0, Math.min(100, percent));

    refs.progressValue.style.width = `${levelNumber > 0 ? Math.max(4, safePercent) : safePercent}%`;
    refs.progressLabel.textContent = (total > 0 && safeLevel > 0)
      ? `${safeLevel} / ${total}`
      : 'Belajar';

    const levelLabel = safeLevel > 0 ? `Level ${safeLevel}` : 'Level';
    refs.badge.textContent = levelLabel;

    const lessonTitle = (info.title && info.title.trim())
      ? info.title.trim()
      : 'Ayo belajar sambil bermain!';

    if (safeLevel > 0) {
      refs.mainTitle.textContent = levelLabel;
      refs.subtitle.textContent = lessonTitle;
    } else {
      refs.mainTitle.textContent = lessonTitle;
      refs.subtitle.textContent = 'Ayo belajar sambil bermain!';
    }

    if (info.letter) {
      refs.bubble.textContent = info.letter.toUpperCase();
      refs.bubble.style.fontSize = '';
    } else {
      refs.bubble.textContent = 'ABC';
      refs.bubble.style.fontSize = '1.4rem';
    }
  }

  function shouldSkipNode(node) {
    if (!(node instanceof HTMLElement)) {
      return true;
    }
    if (SKIP_TAGS.has(node.tagName) || node.classList.contains('alphabet-card')) {
      return true;
    }
    if (node.dataset && node.dataset.shell === 'skip') {
      return true;
    }
    if (node.id && SKIP_IDS.has(node.id)) {
      return true;
    }
    for (let i = 0; i < SKIP_CLASSNAMES.length; i += 1) {
      if (node.classList.contains(SKIP_CLASSNAMES[i])) {
        return true;
      }
    }
    try {
      const computed = window.getComputedStyle(node);
      if (computed.position === 'fixed') {
        return true;
      }
    } catch (err) {
      /* ignore computed style errors */
    }
    return false;
  }

  function wrapContent(body) {
    const originals = Array.from(body.children);
    originals.forEach((node) => {
      if (shouldSkipNode(node)) {
        return;
      }
      const wrapper = document.createElement('div');
      wrapper.className = 'alphabet-card alphabet-card--content';
      const shellMode = node.dataset ? node.dataset.shell : '';
      if (shellMode && shellMode !== 'skip') {
        wrapper.classList.add(`alphabet-card--${shellMode}`);
      }
      node.parentNode.insertBefore(wrapper, node);
      wrapper.appendChild(node);
    });
  }

  function exposeApi() {
    if (window.AlphabetHUD && window.AlphabetHUD.__isThemeReady) {
      return;
    }

    window.AlphabetHUD = {
      __isThemeReady: true,
      setStars(value) {
        if (!hudState.refs) return;
        const amount = Math.max(0, Math.min(hudState.refs.starElements.length, Number(value) || 0));
        hudState.stars = amount;
        hudState.refs.starElements.forEach((star, index) => {
          star.classList.toggle('is-filled', index < amount);
        });
        refreshHudOffset();
      },
      setCoins(value) {
        if (!hudState.refs) return;
        const coins = Math.max(0, Number(value) || 0);
        hudState.coins = coins;
        hudState.refs.coinsValue.textContent = coins.toString();
        refreshHudOffset();
      },
      addCoins(delta) {
        const next = (hudState.coins || 0) + (Number(delta) || 0);
        this.setCoins(next);
      },
      setProgress(percent, label) {
        if (!hudState.refs) return;
        const safe = Math.max(0, Math.min(100, Number(percent) || 0));
        hudState.refs.progressValue.style.width = `${safe}%`;
        if (label) {
          hudState.refs.progressLabel.textContent = label;
        }
        refreshHudOffset();
      }
    };
  }

  function applyHudOffset(hud) {
    const body = document.body;
    if (!body || !hud) {
      return;
    }

    const update = () => {
      const rect = hud.getBoundingClientRect();
      let top = 0;
      try {
        const computed = window.getComputedStyle(hud);
        top = Number.parseFloat(computed.top) || 0;
      } catch (err) {
        /* ignore */
      }
      const outer = Math.max(0, Math.ceil(rect.height + top));
      body.style.setProperty('--alphabet-hud-outer', `${outer}px`);
    };

    hudState.updateHudOffset = update;
    hudState.hud = hud;

    update();

    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(() => update());
      observer.observe(hud);
      hud.__alphabetResizeObserver = observer;
    }

    try {
      window.addEventListener('resize', update, { passive: true });
    } catch (err) {
      window.addEventListener('resize', update);
    }
  }

  function mountHud(info) {
    const body = document.body;
    const { hud, refs } = createHud(info);
    body.insertBefore(hud, body.firstChild);
    initHud(info, refs);
    hudState.refs = refs;
    applyHudOffset(hud);
    exposeApi();
  }

  function init() {
    const body = document.body;
    if (!body || body.dataset.alphabetTheme === 'ready') {
      return;
    }

    body.dataset.alphabetTheme = 'ready';
    body.classList.add('alphabet-game');

    wrapContent(body);

    fetchConfig()
      .then((config) => {
        const info = getLevelInfo(config);
        mountHud(info);
      })
      .catch(() => {
        mountHud({ index: -1, total: 0, letter: '', title: document.title || 'Alphabet Adventure' });
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
