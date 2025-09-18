(function(){
  if (window.CalistungMusic && window.CalistungMusic.__isSingleton) {
    try {
      if (typeof window.CalistungMusic.applyAuto === 'function') {
        window.CalistungMusic.applyAuto();
      }
    } catch (err) {
      /* ignore */
    }
    return;
  }

  const THEME_TRACK = '/elearn/worlds/calistung/thumbs/theme-calistung.mp3';
  const LEVEL_TRACK = '/elearn/worlds/calistung/thumbs/background-level.mp3';
  const STORAGE_KEY = 'calistung:bgm-state';
  const NEXT_TRACK_KEY = 'calistung:bgm-next';
  const VOLUME_KEY = 'calistung:bgm-volume';
  const DEFAULT_VOLUME = 0.35;

  const doc = document;
  const win = window;

  function safeRead(storage, key) {
    try {
      return storage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function safeWrite(storage, key, value) {
    try {
      storage.setItem(key, value);
    } catch (err) {
      /* ignore */
    }
  }

  function parseJSON(value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (err) {
      return null;
    }
  }

  function resolveTrack(input) {
    if (!input) return null;
    if (input === 'theme') return THEME_TRACK;
    if (input === 'level') return LEVEL_TRACK;
    return input;
  }

  const audio = doc.createElement('audio');
  audio.setAttribute('data-calistung-bgm', 'true');
  audio.setAttribute('preload', 'auto');
  audio.setAttribute('loop', 'true');
  audio.setAttribute('playsinline', 'true');
  audio.style.display = 'none';

  function appendAudio() {
    if (audio.parentElement) return;
    const target = doc.body || doc.documentElement;
    if (target) {
      try {
        target.appendChild(audio);
      } catch (err) {
        /* ignore */
      }
    }
  }

  function loadVolume() {
    const stored = parseFloat(safeRead(win.localStorage || {}, VOLUME_KEY));
    if (Number.isFinite(stored)) {
      return Math.min(1, Math.max(0, stored));
    }
    return DEFAULT_VOLUME;
  }

  function persistVolume() {
    safeWrite(win.localStorage || {}, VOLUME_KEY, String(audio.volume));
  }

  audio.volume = loadVolume();

  function loadState() {
    return parseJSON(safeRead(win.sessionStorage || {}, STORAGE_KEY)) || {};
  }

  function saveState() {
    if (!audio.dataset || !audio.dataset.track) return;
    const state = {
      track: audio.dataset.track,
      time: Number(audio.currentTime) || 0,
      savedAt: Date.now()
    };
    safeWrite(win.sessionStorage || {}, STORAGE_KEY, JSON.stringify(state));
  }

  function loadNext() {
    const payload = parseJSON(safeRead(win.sessionStorage || {}, NEXT_TRACK_KEY));
    if (!payload || !payload.track) return null;
    win.sessionStorage && win.sessionStorage.removeItem && win.sessionStorage.removeItem(NEXT_TRACK_KEY);
    return payload.track;
  }

  let resumeListenerBound = false;
  function bindResume() {
    if (resumeListenerBound) return;
    resumeListenerBound = true;
    const resume = () => {
      audio.play().catch(function(){ /* ignore */ });
      doc.removeEventListener('pointerdown', resume);
      doc.removeEventListener('touchstart', resume);
      doc.removeEventListener('keydown', resume);
      resumeListenerBound = false;
    };
    doc.addEventListener('pointerdown', resume, { once: true, passive: true });
    doc.addEventListener('touchstart', resume, { once: true, passive: true });
    doc.addEventListener('keydown', resume, { once: true });
  }

  function attemptPlay() {
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(bindResume);
    }
  }

  let pendingTime = null;
  function setTimeWhenReady() {
    if (pendingTime == null) return;
    const duration = audio.duration;
    let value = pendingTime;
    if (Number.isFinite(duration) && duration > 0) {
      value = value % duration;
      if (value < 0) value += duration;
    }
    try {
      audio.currentTime = value;
    } catch (err) {
      /* ignore set currentTime errors */
    }
    pendingTime = null;
  }

  audio.addEventListener('loadedmetadata', setTimeWhenReady);
  audio.addEventListener('timeupdate', () => {
    const now = Date.now();
    if (!audio.__lastSavedAt || now - audio.__lastSavedAt > 4000) {
      audio.__lastSavedAt = now;
      saveState();
    }
  });
  audio.addEventListener('volumechange', persistVolume);
  audio.addEventListener('pause', saveState);
  audio.addEventListener('ended', saveState);

  win.addEventListener('pagehide', saveState);
  win.addEventListener('beforeunload', saveState);
  win.addEventListener('pageshow', () => {
    appendAudio();
    applyAuto();
  });
  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) saveState();
  });

  function computeResumeTime(track) {
    const state = loadState();
    if (!state || state.track !== track) {
      return 0;
    }
    const savedAt = Number(state.savedAt) || Date.now();
    const elapsed = Math.max(0, (Date.now() - savedAt) / 1000);
    return (Number(state.time) || 0) + elapsed;
  }

  function setTrack(track, options) {
    if (!track) return Promise.resolve();
    const resolved = resolveTrack(track);
    if (!resolved) return Promise.resolve();

    const resumeTime = (options && options.resume === false) ? 0 : computeResumeTime(resolved);
    const shouldReload = audio.dataset.track !== resolved;
    audio.dataset.track = resolved;

    return new Promise(resolve => {
      function finalize() {
        pendingTime = resumeTime;
        setTimeWhenReady();
        attemptPlay();
        resolve();
      }

      if (shouldReload) {
        pendingTime = resumeTime;
        audio.src = resolved;
        try {
          audio.load();
        } catch (err) {
          /* ignore load errors */
        }
        if (audio.readyState >= 1) {
          finalize();
        } else {
          audio.addEventListener('loadedmetadata', function onMeta(){
            audio.removeEventListener('loadedmetadata', onMeta);
            finalize();
          });
        }
      } else {
        if (audio.readyState >= 1) {
          finalize();
        } else {
          audio.addEventListener('loadedmetadata', function onMeta(){
            audio.removeEventListener('loadedmetadata', onMeta);
            finalize();
          });
        }
      }
    });
  }

  function inferMode() {
    const body = doc.body;
    if (body && body.dataset) {
      const mode = body.dataset.calistungBgm;
      if (mode) return mode;
    }
    const path = (win.location && win.location.pathname) || '';
    if (!path || path.indexOf('calistung') === -1) return null;

    if (/\/elearn\/worlds\/calistung\/?$/.test(path) || /\/elearn\/worlds\/calistung\/index\.html$/.test(path)) {
      return 'theme';
    }
    if (/\/elearn\/worlds\/calistung\/[a-z0-9-]+\/index\.html$/i.test(path)) {
      return 'theme';
    }
    if (/\/elearn\/worlds\/calistung\//.test(path)) {
      return 'level';
    }
    if (/\/elearn\/calistung\//.test(path)) {
      return 'level';
    }
    return null;
  }

  function applyAuto(options) {
    const nextTrack = loadNext();
    const mode = (options && options.mode) || inferMode();
    let track = resolveTrack(options && options.track) || null;
    if (!track) {
      if (nextTrack) {
        track = nextTrack;
      } else if (mode) {
        track = resolveTrack(mode);
      }
    }
    if (!track) return;
    appendAudio();
    setTrack(track, options);
  }

  function prepareNext(track) {
    const resolved = resolveTrack(track);
    if (!resolved) return;
    safeWrite(win.sessionStorage || {}, NEXT_TRACK_KEY, JSON.stringify({ track: resolved, savedAt: Date.now() }));
  }

  const api = {
    __isSingleton: true,
    ensureTrack: (track, options) => {
      appendAudio();
      return setTrack(track, options);
    },
    ensureTheme: options => api.ensureTrack('theme', options),
    ensureLevel: options => api.ensureTrack('level', options),
    prepareNextTrack: prepareNext,
    applyAuto,
    getCurrentTrack: () => audio.dataset.track || '',
    getAudioElement: () => audio,
    setVolume: value => {
      if (!Number.isFinite(value)) return;
      audio.volume = Math.min(1, Math.max(0, value));
    }
  };

  win.CalistungMusic = api;

  if (doc.readyState === 'complete' || doc.readyState === 'interactive') {
    appendAudio();
    applyAuto();
  } else {
    doc.addEventListener('DOMContentLoaded', () => {
      appendAudio();
      applyAuto();
    }, { once: true });
  }
})();
