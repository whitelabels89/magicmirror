(function () {
  var CONFIG_URL = 'config.json';
  var hudState = {
    stars: 0,
    coins: 0,
    refs: null,
    hud: null,
    updateHudOffset: null
  };
  var SKIP_TAGS = { SCRIPT: true, STYLE: true };
  var SKIP_CLASSNAMES = ['finish-bar', 'toast', 'alphabet-hud'];
  var SKIP_IDS = { 'pause-menu': true, globalToast: true };

  function hasClass(node, className) {
    if (!node || !className) {
      return false;
    }
    if (node.classList && node.classList.contains) {
      return node.classList.contains(className);
    }
    var classAttr = node.className;
    if (typeof classAttr !== 'string') {
      return false;
    }
    var parts = classAttr.split(/\s+/);
    for (var i = 0; i < parts.length; i += 1) {
      if (parts[i] === className) {
        return true;
      }
    }
    return false;
  }

  function addClass(node, className) {
    if (!node || !className) {
      return;
    }
    if (node.classList && node.classList.add) {
      node.classList.add(className);
      return;
    }
    if (!hasClass(node, className)) {
      node.className = node.className ? node.className + ' ' + className : className;
    }
  }

  function removeClass(node, className) {
    if (!node || !className) {
      return;
    }
    if (node.classList && node.classList.remove) {
      node.classList.remove(className);
      return;
    }
    var classAttr = node.className;
    if (typeof classAttr !== 'string' || !classAttr) {
      return;
    }
    var next = [];
    var parts = classAttr.split(/\s+/);
    for (var i = 0; i < parts.length; i += 1) {
      if (parts[i] && parts[i] !== className) {
        next.push(parts[i]);
      }
    }
    node.className = next.join(' ');
  }

  function getData(node, key) {
    if (!node || !key) {
      return null;
    }
    if (node.dataset && node.dataset[key] != null) {
      return node.dataset[key];
    }
    if (node.getAttribute) {
      return node.getAttribute('data-' + key);
    }
    return null;
  }

  function refreshHudOffset() {
    if (typeof hudState.updateHudOffset === 'function') {
      hudState.updateHudOffset();
    }
  }

  function fetchConfig(onSuccess, onError) {
    var success = typeof onSuccess === 'function' ? onSuccess : function () {};
    var failure = typeof onError === 'function' ? onError : function () {};

    if (typeof window.fetch === 'function') {
      try {
        window.fetch(CONFIG_URL, { cache: 'no-store' })
          .then(function (response) {
            if (response && response.ok) {
              return response.json();
            }
            return null;
          })
          .then(function (data) {
            success(data || null);
          })
          .catch(function () {
            failure();
          });
        return;
      } catch (err) {
        failure();
        return;
      }
    }

    var request;
    try {
      request = new XMLHttpRequest();
    } catch (err) {
      failure();
      return;
    }

    try {
      request.open('GET', CONFIG_URL, true);
    } catch (errOpen) {
      failure();
      return;
    }

    try {
      request.responseType = 'json';
    } catch (errType) {
      /* ignore unsupported responseType */
    }

    request.onreadystatechange = function () {
      if (request.readyState !== 4) {
        return;
      }
      if (request.status >= 200 && request.status < 300) {
        var response = request.response;
        if (!response && request.responseText) {
          try {
            response = JSON.parse(request.responseText);
          } catch (errParse) {
            response = null;
          }
        }
        success(response || null);
      } else {
        failure();
      }
    };

    request.onerror = function () {
      failure();
    };

    try {
      request.send();
    } catch (errSend) {
      failure();
    }
  }

  function getLevelInfo(config) {
    var nodes = [];
    if (config && config.map && config.map.nodes && typeof config.map.nodes.length === 'number') {
      nodes = config.map.nodes;
    }

    var path = '';
    if (window.location && typeof window.location.pathname === 'string') {
      path = window.location.pathname.replace(/\+/g, '/');
    }

    var current = null;
    var index = -1;
    for (var i = 0; i < nodes.length; i += 1) {
      var item = nodes[i];
      if (!item || typeof item.entry !== 'string') {
        continue;
      }
      var entry = item.entry;
      if (entry && path && path.length >= entry.length && path.slice(-entry.length) === entry) {
        current = item;
        index = i;
        break;
      }
    }

    var fallbackNumber = null;
    var match = path.match(/alpha-L(\d+)/i);
    if (match && match[1]) {
      fallbackNumber = parseInt(match[1], 10);
    }

    var letter = '';
    if (current) {
      if (current.label != null) {
        letter = String(current.label);
      } else if (current.id != null) {
        letter = String(current.id);
      }
    }

    var title = document && typeof document.title === 'string' && document.title
      ? document.title
      : 'Alphabet Adventure';

    return {
      index: index,
      total: nodes.length || 0,
      letter: letter,
      title: title,
      fallbackNumber: fallbackNumber
    };
  }

  function createHud() {
    var hud = document.createElement('section');
    hud.className = 'alphabet-hud alphabet-card alphabet-card--hud';

    var meta = document.createElement('div');
    meta.className = 'alphabet-hud__meta';
    hud.appendChild(meta);

    var badge = document.createElement('span');
    badge.className = 'alphabet-badge';
    meta.appendChild(badge);

    var titleBox = document.createElement('div');
    titleBox.className = 'alphabet-hud__title';
    meta.appendChild(titleBox);

    var mainTitle = document.createElement('h1');
    titleBox.appendChild(mainTitle);

    var subtitle = document.createElement('p');
    subtitle.className = 'alphabet-hud__subtitle';
    titleBox.appendChild(subtitle);

    var progressWrap = document.createElement('div');
    progressWrap.className = 'alphabet-hud__progress';
    hud.appendChild(progressWrap);

    var progressBar = document.createElement('div');
    progressBar.className = 'alphabet-progress';
    progressWrap.appendChild(progressBar);

    var progressValue = document.createElement('span');
    progressValue.className = 'alphabet-progress__value';
    progressBar.appendChild(progressValue);

    var progressLabel = document.createElement('div');
    progressLabel.className = 'alphabet-progress__label';
    progressWrap.appendChild(progressLabel);

    var maskotWrap = document.createElement('div');
    maskotWrap.className = 'alphabet-hud__maskot';
    hud.appendChild(maskotWrap);

    var bubble = document.createElement('div');
    bubble.className = 'alphabet-letter-bubble';
    maskotWrap.appendChild(bubble);

    var stats = document.createElement('div');
    stats.className = 'alphabet-hud__stats';
    hud.appendChild(stats);

    var stars = document.createElement('div');
    stars.className = 'alphabet-stars';
    stats.appendChild(stars);

    var starElements = [];
    for (var i = 0; i < 3; i += 1) {
      var star = document.createElement('span');
      star.className = 'alphabet-star';
      star.setAttribute('aria-hidden', 'true');
      star.setAttribute('data-star', String(i + 1));
      starElements.push(star);
      stars.appendChild(star);
    }

    var coins = document.createElement('div');
    coins.className = 'alphabet-coins';
    stats.appendChild(coins);

    var coinsValue = document.createElement('span');
    coinsValue.className = 'alphabet-coins__value';
    coinsValue.textContent = '0';
    coins.appendChild(coinsValue);

    return {
      hud: hud,
      refs: {
        badge: badge,
        mainTitle: mainTitle,
        subtitle: subtitle,
        progressValue: progressValue,
        progressLabel: progressLabel,
        starElements: starElements,
        coinsValue: coinsValue,
        bubble: bubble
      }
    };
  }

  function initHud(info, refs) {
    var total = info.total || 0;
    var hasIndex = typeof info.index === 'number' && info.index >= 0;
    var fallbackNumber = typeof info.fallbackNumber === 'number' ? info.fallbackNumber : 0;
    var levelNumber = hasIndex ? info.index + 1 : fallbackNumber;
    if (!levelNumber) {
      levelNumber = 0;
    }
    var safeLevel = levelNumber;
    if (levelNumber > 0 && total > 0) {
      safeLevel = Math.min(levelNumber, total);
    }

    var percent = 0;
    if (total > 0 && levelNumber > 0) {
      percent = (levelNumber / total) * 100;
    }
    var safePercent = Math.max(0, Math.min(100, percent));
    var widthValue = safePercent;
    if (levelNumber > 0) {
      widthValue = Math.max(4, safePercent);
    }
    if (refs.progressValue && refs.progressValue.style) {
      refs.progressValue.style.width = widthValue + '%';
    }

    if (refs.progressLabel) {
      if (total > 0 && safeLevel > 0) {
        refs.progressLabel.textContent = safeLevel + ' / ' + total;
      } else if (safeLevel > 0) {
        refs.progressLabel.textContent = 'Level ' + safeLevel;
      } else {
        refs.progressLabel.textContent = 'Belajar';
      }
    }

    var levelLabel = safeLevel > 0 ? 'Level ' + safeLevel : 'Level';
    if (refs.badge) {
      refs.badge.textContent = levelLabel;
    }

    var lessonTitle = info.title && ('' + info.title).replace(/\s+/g, ' ').trim();
    if (!lessonTitle) {
      lessonTitle = 'Ayo belajar sambil bermain!';
    }

    if (refs.mainTitle) {
      if (safeLevel > 0) {
        refs.mainTitle.textContent = levelLabel;
      } else {
        refs.mainTitle.textContent = lessonTitle;
      }
    }

    if (refs.subtitle) {
      if (safeLevel > 0) {
        refs.subtitle.textContent = lessonTitle;
      } else {
        refs.subtitle.textContent = 'Ayo belajar sambil bermain!';
      }
    }

    if (refs.bubble) {
      if (info.letter) {
        refs.bubble.textContent = String(info.letter).toUpperCase();
        refs.bubble.style.fontSize = '';
      } else {
        refs.bubble.textContent = 'ABC';
        refs.bubble.style.fontSize = '1.4rem';
      }
    }
  }

  function shouldSkipNode(node) {
    if (!node || node.nodeType !== 1) {
      return true;
    }
    if (SKIP_TAGS[node.tagName]) {
      return true;
    }
    if (hasClass(node, 'alphabet-card')) {
      return true;
    }
    if (hasClass(node, 'alphabet-hud')) {
      return true;
    }
    var shellMode = getData(node, 'shell');
    if (shellMode === 'skip') {
      return true;
    }
    var nodeId = node.id || (node.getAttribute ? node.getAttribute('id') : '');
    if (nodeId && SKIP_IDS[nodeId]) {
      return true;
    }
    for (var i = 0; i < SKIP_CLASSNAMES.length; i += 1) {
      if (hasClass(node, SKIP_CLASSNAMES[i])) {
        return true;
      }
    }
    try {
      var computed = window.getComputedStyle ? window.getComputedStyle(node) : null;
      if (computed && computed.position === 'fixed') {
        return true;
      }
    } catch (err) {
      /* ignore errors */
    }
    return false;
  }

  function wrapContent(body) {
    var originals = [];
    for (var i = 0; i < body.children.length; i += 1) {
      originals.push(body.children[i]);
    }
    for (var j = 0; j < originals.length; j += 1) {
      var node = originals[j];
      if (shouldSkipNode(node)) {
        continue;
      }
      var wrapper = document.createElement('div');
      wrapper.className = 'alphabet-card alphabet-card--content';
      var shellMode = getData(node, 'shell');
      if (shellMode && shellMode !== 'skip') {
        addClass(wrapper, 'alphabet-card--' + shellMode);
      }
      if (node.parentNode) {
        node.parentNode.insertBefore(wrapper, node);
        wrapper.appendChild(node);
      }
    }
  }

  function exposeApi() {
    var api = window.AlphabetHUD || {};
    if (api.__isThemeReady) {
      window.AlphabetHUD = api;
      return;
    }

    api.__isThemeReady = true;

    api.setStars = function (value) {
      if (!hudState.refs || !hudState.refs.starElements) {
        return;
      }
      var amount = parseInt(value, 10);
      if (isNaN(amount) || amount < 0) {
        amount = 0;
      }
      var max = hudState.refs.starElements.length;
      if (amount > max) {
        amount = max;
      }
      hudState.stars = amount;
      for (var i = 0; i < max; i += 1) {
        var star = hudState.refs.starElements[i];
        if (!star) {
          continue;
        }
        if (i < amount) {
          addClass(star, 'is-filled');
        } else {
          removeClass(star, 'is-filled');
        }
      }
      refreshHudOffset();
    };

    api.setCoins = function (value) {
      if (!hudState.refs || !hudState.refs.coinsValue) {
        return;
      }
      var coins = parseInt(value, 10);
      if (isNaN(coins) || coins < 0) {
        coins = 0;
      }
      hudState.coins = coins;
      hudState.refs.coinsValue.textContent = String(coins);
      refreshHudOffset();
    };

    api.addCoins = function (delta) {
      var deltaValue = parseInt(delta, 10);
      if (isNaN(deltaValue)) {
        deltaValue = 0;
      }
      var next = (hudState.coins || 0) + deltaValue;
      api.setCoins(next);
    };

    api.setProgress = function (percent, label) {
      if (!hudState.refs || !hudState.refs.progressValue) {
        return;
      }
      var safe = parseFloat(percent);
      if (isNaN(safe) || safe < 0) {
        safe = 0;
      } else if (safe > 100) {
        safe = 100;
      }
      hudState.refs.progressValue.style.width = safe + '%';
      if (label && hudState.refs.progressLabel) {
        hudState.refs.progressLabel.textContent = label;
      }
      refreshHudOffset();
    };

    window.AlphabetHUD = api;
  }

  function applyHudOffset(hud) {
    var body = document.body;
    if (!body || !hud) {
      return;
    }

    var update = function () {
      if (!hud || !hud.getBoundingClientRect) {
        return;
      }
      var rect = hud.getBoundingClientRect();
      var top = 0;
      try {
        if (window.getComputedStyle) {
          var computed = window.getComputedStyle(hud);
          if (computed && computed.top) {
            var parsed = parseFloat(computed.top);
            if (!isNaN(parsed)) {
              top = parsed;
            }
          }
        }
      } catch (err) {
        top = 0;
      }
      var outer = rect ? Math.max(0, Math.ceil(rect.height + top)) : 0;
      if (body.style && body.style.setProperty) {
        body.style.setProperty('--alphabet-hud-outer', outer + 'px');
      } else {
        body.style.paddingTop = outer + 'px';
      }
    };

    hudState.updateHudOffset = update;
    hudState.hud = hud;

    update();

    if (typeof window.ResizeObserver === 'function') {
      try {
        var observer = new window.ResizeObserver(function () {
          update();
        });
        observer.observe(hud);
        hud.__alphabetResizeObserver = observer;
      } catch (err) {
        /* ignore observer errors */
      }
    }

    try {
      window.addEventListener('resize', update);
    } catch (err) {
      /* ignore missing addEventListener */
    }
  }

  function mountHud(info) {
    var body = document.body;
    if (!body) {
      return;
    }
    var created = createHud(info);
    var hud = created.hud;
    var refs = created.refs;

    if (body.firstChild) {
      body.insertBefore(hud, body.firstChild);
    } else {
      body.appendChild(hud);
    }

    initHud(info, refs);
    hudState.refs = refs;
    applyHudOffset(hud);
    exposeApi();
  }

  function init() {
    var body = document.body;
    if (!body) {
      return;
    }
    if ((body.dataset && body.dataset.alphabetTheme === 'ready') ||
        (body.getAttribute && body.getAttribute('data-alphabet-theme') === 'ready')) {
      return;
    }
    if (body.dataset) {
      body.dataset.alphabetTheme = 'ready';
    }
    if (body.setAttribute) {
      body.setAttribute('data-alphabet-theme', 'ready');
    }
    if (body.classList && body.classList.contains) {
      if (!body.classList.contains('alphabet-game')) {
        body.classList.add('alphabet-game');
      }
    } else if (!(body.className && /\balphabet-game\b/.test(body.className))) {
      body.className = body.className ? body.className + ' alphabet-game' : 'alphabet-game';
    }

    wrapContent(body);

    var mounted = false;
    function mountWithConfig(config) {
      if (mounted) {
        return;
      }
      mounted = true;
      var info = getLevelInfo(config);
      mountHud(info);
    }

    fetchConfig(function (config) {
      mountWithConfig(config);
    }, function () {
      mountWithConfig(null);
    });
  }

  if (document.readyState === 'loading') {
    var onReady = function () {
      document.removeEventListener('DOMContentLoaded', onReady);
      init();
    };
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    init();
  }
})();
