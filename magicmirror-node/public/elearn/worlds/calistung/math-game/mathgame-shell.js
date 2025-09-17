(function(){
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
