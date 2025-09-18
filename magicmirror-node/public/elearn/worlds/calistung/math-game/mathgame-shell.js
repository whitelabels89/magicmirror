(function(){
  function ensureMathNavbarDefaults(){
    if (!document || !document.body) {
      return false;
    }
    const body = document.body;
    const dataset = body.dataset;
    const setDataAttr = (key, value) => {
      if (!value) {
        return;
      }
      if (dataset && !dataset[key]) {
        dataset[key] = value;
        return;
      }
      if (!dataset) {
        const attrName = 'data-' + key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
        if (!body.hasAttribute(attrName)) {
          body.setAttribute(attrName, value);
        }
      }
    };

    setDataAttr('navBadge', 'Calistung Math');
    setDataAttr('navHomeUrl', '/elearn/worlds/calistung/math-game/index.html');

    const homeUrl = dataset ? dataset.navHomeUrl : (body.getAttribute('data-nav-home-url') || '/elearn/worlds/calistung/math-game/index.html');
    setDataAttr('navBackUrl', homeUrl);
    setDataAttr('navBackBehavior', 'pause-menu');
    setDataAttr('pauseToggle', 'disabled');
    return true;
  }

  function ensurePauseMenuScript(){
    if (!document || !document.body || !document.body.dataset) {
      return;
    }
    const behavior = (document.body.dataset.navBackBehavior || '').toLowerCase();
    if (behavior !== 'pause-menu') {
      return;
    }
    if (document.querySelector('script[data-pause-menu]') || document.querySelector('script[src*="/elearn/worlds/ui/pause-menu.js"]')) {
      return;
    }
    try {
      const script = document.createElement('script');
      script.src = '/elearn/worlds/ui/pause-menu.js';
      script.setAttribute('data-pause-menu', 'true');
      document.body.appendChild(script);
    } catch (err) {
      /* ignore append errors */
    }
  }

  const ensuredNow = ensureMathNavbarDefaults();
  if (!ensuredNow && document && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', function handleReady(){
      document.removeEventListener('DOMContentLoaded', handleReady);
      ensureMathNavbarDefaults();
      ensurePauseMenuScript();
    });
  } else {
    ensurePauseMenuScript();
  }

  if (document && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', ensurePauseMenuScript, { once: true });
  }

  function mapHudElements(){
    const map = {};
    document.querySelectorAll('[data-hud-value]').forEach(el => {
      const key = el.getAttribute('data-hud-value');
      map[key] = map[key] || [];
      map[key].push(el);
    });
    return map;
  }

  const hudMap = mapHudElements();
  const missionEl = document.querySelector('[data-mission-text]');
  const buddyEmojiEl = document.querySelector('[data-buddy-emoji]');
  const buddyDialogEl = document.querySelector('[data-buddy-dialog]');

  function updateHud(updates){
    if (!updates) return;
    Object.entries(updates).forEach(([key, value]) => {
      if (hudMap[key]) {
        hudMap[key].forEach(el => {
          if (typeof value === 'number' && el.dataset.hudFormat === 'time') {
            el.textContent = new Date(value * 1000).toISOString().substring(14, 19);
          } else {
            el.textContent = value;
          }
        });
      }
    });
  }

  function setMission(text){
    if (missionEl && typeof text === 'string') {
      missionEl.textContent = text;
    }
  }

  function setBuddyMood(emoji, message){
    if (buddyEmojiEl && emoji) {
      buddyEmojiEl.textContent = emoji;
    }
    if (buddyDialogEl && message) {
      buddyDialogEl.textContent = message;
    }
  }

  window.mathgameShell = Object.assign(window.mathgameShell || {}, {
    updateHud,
    setMission,
    setBuddyMood,
  });
})();
