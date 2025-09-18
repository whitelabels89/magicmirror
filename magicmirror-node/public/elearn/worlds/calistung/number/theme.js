(function () {
  var CONFIG_URL = 'config.json';
  var state = {
    config: null,
    hudCard: null,
    progressValue: null,
    nav: null
  };
  var SIDEBAR_HINT_SELECTOR = '[data-number-role="sidebar"], .number-sidebar, .instructions, .instruction-panel, .petunjuk, .guideline';
  var MUSIC_SCRIPT_SRC = '/elearn/worlds/calistung/music.js';

  function ensureBackgroundMusic() {
    if (typeof document === 'undefined') {
      return;
    }
    var run = function () {
      if (window.CalistungMusic && typeof window.CalistungMusic.ensureLevel === 'function') {
        window.CalistungMusic.ensureLevel();
      }
    };
    if (window.CalistungMusic && typeof window.CalistungMusic.ensureLevel === 'function') {
      run();
      return;
    }
    var existing = document.querySelector('script[src="' + MUSIC_SCRIPT_SRC + '"]');
    if (existing) {
      existing.addEventListener('load', run, { once: true });
      return;
    }
    var script = document.createElement('script');
    script.src = MUSIC_SCRIPT_SRC;
    script.addEventListener('load', run, { once: true });
    (document.head || document.documentElement || document.body).appendChild(script);
  }

  ensureBackgroundMusic();

  function isWhitespace(node) {
    return node && node.nodeType === 3 && !/\S/.test(node.textContent || '');
  }

  function isElement(node) {
    return node && node.nodeType === 1;
  }

  function restructureLayout() {
    var body = document.body;
    if (!body || body.querySelector('.number-card.number-card--challenge')) {
      return {
        sidebar: body ? body.querySelector('.number-layout__sidebar') : null,
        playarea: body ? body.querySelector('.number-layout__playarea') : null,
        actions: body ? body.querySelector('.number-actions') : null
      };
    }

    var contentNodes = [];
    var child = body.firstChild;
    while (child) {
      var next = child.nextSibling;
      if (isElement(child) && child.tagName === 'SCRIPT') {
        child = next;
        continue;
      }
      if (isWhitespace(child)) {
        body.removeChild(child);
        child = next;
        continue;
      }
      body.removeChild(child);
      contentNodes.push(child);
      child = next;
    }

    var main = document.createElement('main');
    main.className = 'number-game__container';

    var section = document.createElement('section');
    section.className = 'number-card number-card--challenge';

    var layout = document.createElement('div');
    layout.className = 'number-layout';

    var sidebar = document.createElement('aside');
    sidebar.className = 'number-layout__sidebar';
    sidebar.setAttribute('data-number-sidebar', 'auto');

    var playarea = document.createElement('div');
    playarea.className = 'number-layout__playarea';
    playarea.setAttribute('data-number-playarea', 'auto');

    for (var i = 0; i < contentNodes.length; i += 1) {
      playarea.appendChild(contentNodes[i]);
    }

    layout.appendChild(sidebar);
    layout.appendChild(playarea);
    section.appendChild(layout);
    main.appendChild(section);

    var actions = document.createElement('footer');
    actions.className = 'number-actions';
    actions.setAttribute('data-number-actions', 'auto');

    var buttonsWrapper = document.createElement('div');
    buttonsWrapper.className = 'number-actions__buttons';
    actions.appendChild(buttonsWrapper);

    main.appendChild(actions);

    body.insertBefore(main, body.firstChild || null);

    return { sidebar: sidebar, playarea: playarea, actions: actions };
  }

  function populateSidebar(sidebar, playarea) {
    if (!sidebar || !playarea) {
      return;
    }

    if (sidebar.children.length === 0) {
      var explicitNodes = playarea.querySelectorAll(SIDEBAR_HINT_SELECTOR);
      for (var i = 0; i < explicitNodes.length; i += 1) {
        if (explicitNodes[i].parentNode === sidebar) {
          continue;
        }
        sidebar.appendChild(explicitNodes[i]);
      }
    }

    var movedHeading = false;
    var movedText = 0;
    var child = playarea.firstChild;
    while (child) {
      var next = child.nextSibling;
      if (isWhitespace(child)) {
        playarea.removeChild(child);
        child = next;
        continue;
      }
      if (isElement(child)) {
        var tag = child.tagName;
        if (!movedHeading && (tag === 'H1' || tag === 'H2' || tag === 'H3')) {
          sidebar.appendChild(child);
          movedHeading = true;
          child = next;
          continue;
        }
        if (movedText < 2 && (tag === 'P' || tag === 'UL' || tag === 'OL')) {
          sidebar.appendChild(child);
          movedText += 1;
          child = next;
          continue;
        }
      }
      child = next;
    }

    if (sidebar.children.length === 0) {
      var fallbackHeading = document.createElement('h2');
      fallbackHeading.textContent = guessLevelTitle();
      sidebar.appendChild(fallbackHeading);
    }

    var hasParagraph = sidebar.querySelector('p, ul, ol');
    if (!hasParagraph) {
      var helper = document.createElement('p');
      helper.textContent = 'Ikuti instruksi pada layar permainan lalu selesaikan tantangan angka ini!';
      sidebar.appendChild(helper);
    }
  }

  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function fetchConfig(onComplete) {
    var done = typeof onComplete === 'function' ? onComplete : function () {};
    if (typeof window.fetch === 'function') {
      window.fetch(CONFIG_URL, { cache: 'no-store' })
        .then(function (response) {
          if (!response || !response.ok) {
            return null;
          }
          return response.json();
        })
        .then(function (data) {
          state.config = data || null;
          done(state.config);
        })
        .catch(function () {
          state.config = null;
          done(null);
        });
      return;
    }

    var request;
    try {
      request = new XMLHttpRequest();
      request.open('GET', CONFIG_URL, true);
      request.responseType = 'json';
      request.onreadystatechange = function () {
        if (request.readyState !== 4) {
          return;
        }
        if (request.status >= 200 && request.status < 300) {
          var response = request.response;
          if (!response && request.responseText) {
            try {
              response = JSON.parse(request.responseText);
            } catch (err) {
              response = null;
            }
          }
          state.config = response || null;
          done(state.config);
        } else {
          state.config = null;
          done(null);
        }
      };
      request.onerror = function () {
        state.config = null;
        done(null);
      };
      request.send();
    } catch (err) {
      state.config = null;
      done(null);
    }
  }

  function getLevelList(config) {
    var list = [];
    if (!config || !config.routes) {
      return list;
    }
    var routes = config.routes;
    var keys = Object.keys(routes);
    keys.sort(function (a, b) {
      var matchA = (a || '').match(/(\d+)/);
      var matchB = (b || '').match(/(\d+)/);
      var numA = matchA ? parseInt(matchA[1], 10) : 0;
      var numB = matchB ? parseInt(matchB[1], 10) : 0;
      return numA - numB;
    });
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      list.push({ label: key, path: routes[key] });
    }
    return list;
  }

  function normalizePath(value) {
    if (typeof value !== 'string') {
      return '';
    }
    return value.replace(/\+/g, '/');
  }

  function guessLevelTitle() {
    var heading = document.querySelector('main h1, main h2, .number-layout__sidebar h1, .number-layout__sidebar h2');
    if (heading && heading.textContent) {
      return heading.textContent.trim();
    }
    var fallbackHeading = document.querySelector('h1, h2');
    if (fallbackHeading && fallbackHeading.textContent) {
      return fallbackHeading.textContent.trim();
    }
    if (document.title) {
      return document.title.replace(/\s*[-|–].*$/, '').trim();
    }
    return 'Petualangan Angka';
  }

  function resolveLevelInfo(config) {
    var list = getLevelList(config);
    var path = '';
    if (window.location && typeof window.location.pathname === 'string') {
      path = normalizePath(window.location.pathname);
    }
    var current = null;
    var index = -1;
    for (var i = 0; i < list.length; i += 1) {
      var item = list[i];
      var entryPath = normalizePath(item.path);
      if (!entryPath) {
        continue;
      }
      if (path.slice(-entryPath.length) === entryPath) {
        current = item;
        index = i;
        break;
      }
    }
    var matchNumber = path.match(/number-L(\d+)/i);
    var fallbackNumber = matchNumber ? parseInt(matchNumber[1], 10) : null;
    if (!current && fallbackNumber != null) {
      for (var j = 0; j < list.length; j += 1) {
        var candidate = list[j];
        if (!candidate || typeof candidate.label !== 'string') {
          continue;
        }
        if (candidate.label.replace(/\D+/g, '') === String(fallbackNumber)) {
          current = candidate;
          index = j;
          break;
        }
      }
    }
    var info = {
      label: current ? current.label : (fallbackNumber != null ? 'Level ' + fallbackNumber : 'Level'),
      index: index,
      total: list.length,
      next: null,
      prev: null,
      title: guessLevelTitle(),
      subtitle: 'Seragam petualangan angka yang seru!'
    };
    if (index >= 0 && list.length) {
      if (index + 1 < list.length) {
        info.next = list[index + 1];
      }
      if (index - 1 >= 0) {
        info.prev = list[index - 1];
      }
    }
    var progress = 0;
    if (index >= 0 && list.length > 0) {
      progress = ((index + 1) / list.length) * 100;
    } else if (fallbackNumber != null && list.length > 0) {
      progress = (fallbackNumber / list.length) * 100;
    }
    info.progressPercent = Math.max(0, Math.min(progress, 100));
    info.progressText = '';
    if (list.length > 0) {
      var currentDisplay = index >= 0 ? (index + 1) : (fallbackNumber || 0);
      info.progressText = 'Level ' + currentDisplay + ' dari ' + list.length;
    }
    return info;
  }

  function buildHud(info) {
    var card = document.createElement('section');
    card.className = 'number-card number-card--hud';

    var hud = document.createElement('div');
    hud.className = 'number-hud';

    var meta = document.createElement('div');
    meta.className = 'number-hud__meta';

    var badge = document.createElement('span');
    badge.className = 'number-badge';
    badge.textContent = info.label || 'Level';

    var titleWrap = document.createElement('div');
    titleWrap.className = 'number-hud__title';

    var title = document.createElement('h1');
    title.textContent = info.title || 'Petualangan Angka';

    var subtitle = document.createElement('p');
    subtitle.className = 'number-hud__subtitle';
    subtitle.textContent = info.subtitle || 'Seragam petualangan angka yang seru!';

    titleWrap.appendChild(title);
    if (info.progressText) {
      var subtitleText = document.createElement('span');
      subtitleText.textContent = info.progressText;
      subtitleText.className = 'number-progress__label';
      subtitleText.style.display = 'block';
      subtitleText.style.fontSize = '0.9rem';
      subtitleText.style.marginBottom = '4px';
      titleWrap.appendChild(subtitleText);
    }
    titleWrap.appendChild(subtitle);

    meta.appendChild(badge);
    meta.appendChild(titleWrap);

    var progressWrap = document.createElement('div');
    progressWrap.className = 'number-hud__progress';

    var progressLabel = document.createElement('span');
    progressLabel.className = 'number-progress__label';
    progressLabel.textContent = 'Progres petualangan';

    var progress = document.createElement('div');
    progress.className = 'number-progress';

    var progressValue = document.createElement('span');
    progressValue.className = 'number-progress__value';
    progressValue.style.width = Math.max(0, Math.min(info.progressPercent || 0, 100)).toFixed(2) + '%';

    progress.appendChild(progressValue);
    progressWrap.appendChild(progressLabel);
    progressWrap.appendChild(progress);

    var status = document.createElement('div');
    status.className = 'number-hud__status';

    var coins = document.createElement('div');
    coins.className = 'number-hud__stat number-hud__stat--coins';
    coins.innerHTML = '<span aria-hidden="true">⭐</span><span>0</span>';

    var lives = document.createElement('div');
    lives.className = 'number-hud__stat number-hud__stat--lives';
    lives.innerHTML = '<span aria-hidden="true">💖</span><span>3</span>';

    status.appendChild(coins);
    status.appendChild(lives);

    hud.appendChild(meta);
    hud.appendChild(progressWrap);
    hud.appendChild(status);

    card.appendChild(hud);
    state.hudCard = card;
    state.progressValue = progressValue;
    return card;
  }

  function ensureHud(info) {
    if (state.hudCard) {
      return state.hudCard;
    }
    var hud = buildHud(info);
    var body = document.body;
    if (!body) {
      return hud;
    }
    var firstCard = body.querySelector('.number-card');
    if (firstCard && firstCard.parentNode) {
      firstCard.parentNode.insertBefore(hud, firstCard);
    } else {
      body.insertBefore(hud, body.firstChild);
    }
    return hud;
  }

  function ensureBodyClass() {
    var body = document.body;
    if (body && body.className.indexOf('number-game') === -1) {
      body.classList.add('number-game');
    }
  }

  function ensureActions(info) {
    var actions = document.querySelector('.number-actions');
    if (!actions) {
      return;
    }
    var nav = actions.querySelector('.number-actions__nav');
    if (!nav) {
      nav = document.createElement('div');
      nav.className = 'number-actions__nav';
      actions.appendChild(nav);
    }
    while (nav.firstChild) {
      nav.removeChild(nav.firstChild);
    }
    if (info.prev && info.prev.path) {
      var prevLink = document.createElement('a');
      prevLink.className = 'number-link number-link--ghost';
      prevLink.href = info.prev.path;
      prevLink.textContent = '⬅️ Level sebelumnya';
      nav.appendChild(prevLink);
    }
    if (info.next && info.next.path) {
      var nextLink = document.createElement('a');
      nextLink.className = 'number-link';
      nextLink.href = info.next.path;
      nextLink.textContent = 'Lanjut Level ➡️';
      nav.appendChild(nextLink);
    }
    if (!nav.firstChild) {
      var message = document.createElement('span');
      message.className = 'number-actions__message';
      message.textContent = 'Ayo selesaikan misinya dan kumpulkan bintang!';
      nav.appendChild(message);
    }
  }

  function ensureCalistungNavbar(info) {
    var body = document.body;
    if (!body) {
      return;
    }

    if (typeof body.dataset === 'object') {
      if (!body.dataset.navBadge) {
        body.dataset.navBadge = 'Calistung Number';
      }
      if (info && info.title) {
        body.dataset.levelTitle = info.title;
      }
      body.dataset.navBackBehavior = 'pause-menu';
      body.dataset.pauseToggle = 'disabled';
    }

    var nav = document.querySelector('.calistung-navbar');
    if (nav) {
      var titleEl = nav.querySelector('.calistung-navbar__title');
      if (titleEl && info && info.title) {
        titleEl.textContent = info.title;
      }
      var badgeEl = nav.querySelector('.calistung-navbar__badge');
      if (badgeEl && body.dataset && body.dataset.navBadge) {
        badgeEl.textContent = body.dataset.navBadge;
      }
    }

    if (!document.querySelector('script[data-pause-menu]') &&
        !document.querySelector('script[src*="/elearn/worlds/ui/pause-menu.js"]')) {
      var pauseScript = document.createElement('script');
      pauseScript.src = '/elearn/worlds/ui/pause-menu.js';
      pauseScript.setAttribute('data-pause-menu', 'true');
      document.body.appendChild(pauseScript);
    }

    if (document.querySelector('script[data-number-navbar]')) {
      return;
    }

    var script = document.createElement('script');
    script.src = '/elearn/common/calistung-navbar.js';
    script.setAttribute('data-number-navbar', 'true');
    document.body.appendChild(script);
  }

  function wrapActionButtons() {
    var actions = document.querySelector('.number-actions');
    if (!actions) {
      return;
    }
    var wrapper = actions.querySelector('.number-actions__buttons');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'number-actions__buttons';
      actions.insertBefore(wrapper, actions.firstChild);
    }
    var child = actions.firstChild;
    while (child) {
      var next = child.nextSibling;
      if (child !== wrapper && isElement(child) && (child.tagName === 'BUTTON' || child.tagName === 'A')) {
        wrapper.appendChild(child);
      }
      child = next;
    }
  }

  function init() {
    ensureBodyClass();
    var layout = restructureLayout();
    populateSidebar(layout.sidebar, layout.playarea);
    wrapActionButtons();
    ensureCalistungNavbar(null);
    fetchConfig(function (config) {
      var info = resolveLevelInfo(config || null);
      ensureHud(info);
      ensureActions(info);
      ensureCalistungNavbar(info);
    });
  }

  onReady(init);
})();
