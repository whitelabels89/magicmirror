/*
 * Foam Explosion Animation (standalone JS)
 * ----------------------------------------
 * Pakai via: <script src="./foam.js"></script>
 * Lalu panggil: Foam.init({ imageSrc: 'Foam.png', canvas: myCanvas })
 */
(function () {
  const DEFAULTS = {
    imageSrc: 'Foam.png',   // path sprite
    frameCount: 9,          // jumlah frame horizontal
    fps: 16,
    scale: 1,
    angle: 0,
    framePadding: 0,
    backgroundClear: false,
    alpha: 0.7,
    composite: 'screen',
    // Hilangkan warna latar mint (kalau sprite tidak transparan)
    colorKey: { r: 199, g: 247, b: 231, tolerance: 28 },
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function _applyColorKeyToImage(img, key) {
    if (!key) return img;
    const off = document.createElement('canvas');
    off.width = img.width; off.height = img.height;
    const octx = off.getContext('2d');
    octx.drawImage(img, 0, 0);
    const imgData = octx.getImageData(0, 0, off.width, off.height);
    const d = imgData.data;
    const { r: kr, g: kg, b: kb, tolerance = 16 } = key;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i+1], b = d[i+2];
      if (Math.abs(r - kr) <= tolerance && Math.abs(g - kg) <= tolerance && Math.abs(b - kb) <= tolerance) {
        d[i+3] = 0; // transparan
      }
    }
    octx.putImageData(imgData, 0, 0);
    return off;
  }

  class SpriteSheet {
    constructor(img, frameCount, framePadding = 0) {
      this.img = img;
      this.frameCount = frameCount;
      this.framePadding = framePadding;
      const totalW = img.width;
      const totalGap = framePadding * (frameCount - 1);
      this.frameWidth = Math.floor((totalW - totalGap) / frameCount);
      this.frameHeight = img.height;
    }
    drawFrame(ctx, index, dx, dy, scale = 1, angle = 0) {
      const i = clamp(index | 0, 0, this.frameCount - 1);
      const sx = i * (this.frameWidth + this.framePadding);
      const sy = 0;
      const sw = this.frameWidth;
      const sh = this.frameHeight;
      const dw = Math.floor(sw * scale);
      const dh = Math.floor(sh * scale);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (angle) {
        const rad = (angle % 360) * Math.PI / 180;
        ctx.translate(dx + dw / 2, dy + dh / 2);
        ctx.rotate(rad);
        ctx.translate(-dw / 2, -dh / 2);
        dx = 0; dy = 0;
      }
      ctx.drawImage(this.img, sx, sy, sw, sh, dx, dy, dw, dh);
      ctx.restore();
    }
  }

  class FoamBurst {
    constructor(sheet) {
      this.sheet = sheet;
      this.active = false;
      this.x = 0; this.y = 0;
      this.scale = 1;
      this.angle = 0;
      this.fps = 16;
      this.frame = 0;
      this.elapsed = 0;
      this.loop = false; // explosion style
    }
    reset(x, y, { scale = 1, angle = 0, fps = 16 } = {}) {
      this.x = x; this.y = y;
      this.scale = scale; this.angle = angle;
      this.fps = fps;
      this.frame = 0; this.elapsed = 0;
      this.active = true;
    }
    update(dt) {
      if (!this.active) return;
      this.elapsed += dt;
      const frameTime = 1 / this.fps;
      while (this.elapsed >= frameTime) {
        this.elapsed -= frameTime;
        this.frame++;
        if (this.frame >= this.sheet.frameCount) {
          if (this.loop) this.frame = 0; else { this.active = false; break; }
        }
      }
    }
    draw(ctx) {
      if (!this.active) return;
      this.sheet.drawFrame(ctx, this.frame, this.x, this.y, this.scale, this.angle);
    }
  }

  class Pool {
    constructor(factory, size = 32) {
      this.factory = factory;
      this.items = Array.from({ length: size }, () => factory());
    }
    get() {
      for (const it of this.items) if (!it.active) return it;
      const extra = this.factory();
      this.items.push(extra);
      return extra;
    }
    forEachActive(fn) { for (const it of this.items) if (it.active) fn(it); }
  }

  const Foam = {
    _cfg: { ...DEFAULTS },
    _canvas: null,
    _ctx: null,
    _sheet: null,
    _pool: null,
    _raf: 0,
    _lastTs: 0,

    async init(opts = {}) {
      this._cfg = { ...DEFAULTS, ...opts };
      // Canvas target
      this._canvas = opts.canvas || document.getElementById('foam-canvas');
      if (!this._canvas) {
        this._canvas = document.createElement('canvas');
        this._canvas.id = 'foam-canvas';
        document.body.appendChild(this._canvas);
        this._autoResize();
        window.addEventListener('resize', () => this._autoResize());
      }
      this._ctx = this._canvas.getContext('2d');

      // Load + color-key
      const rawImg = await this._loadImage(this._cfg.imageSrc);
      const img = _applyColorKeyToImage(rawImg, this._cfg.colorKey);
      this._sheet = new SpriteSheet(img, this._cfg.frameCount, this._cfg.framePadding);
      this._pool = new Pool(() => new FoamBurst(this._sheet), 24);

      // Debug click spawn (optional)
      this._canvas.addEventListener('pointerdown', (e) => {
        const rect = this._canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) | 0;
        const y = (e.clientY - rect.top) | 0;
        const scl = this._cfg.scale;
        this.spawn(x - (this._sheet.frameWidth * scl) / 2,
                   y - (this._sheet.frameHeight * scl) / 2,
                   { scale: scl, angle: 0, fps: this._cfg.fps });
      });

      // Loop
      this._lastTs = performance.now();
      const loop = (ts) => {
        const dt = Math.min(0.033, (ts - this._lastTs) / 1000);
        this._lastTs = ts;
        this.update(dt);
        this.draw();
        this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
      return this;
    },

    destroy() {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
      if (this._canvas) this._canvas.replaceWith(this._canvas.cloneNode(false));
    },

    _autoResize() {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const w = window.innerWidth | 0;
      const h = window.innerHeight | 0;
      this._canvas.width = w * dpr;
      this._canvas.height = h * dpr;
      this._canvas.style.width = w + 'px';
      this._canvas.style.height = h + 'px';
      const ctx = this._canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },

    async _loadImage(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = src;
      });
    },

    spawn(x, y, { scale, angle, fps } = {}) {
      if (!this._sheet) return;
      const b = this._pool.get();
      b.reset(x | 0, y | 0, {
        scale: scale ?? this._cfg.scale,
        angle: angle ?? this._cfg.angle,
        fps: fps ?? this._cfg.fps,
      });
      return b;
    },

    // Polyline helper (opsional)
    spawnAlong(points, stepPx = 32, opts = {}) {
      if (!Array.isArray(points) || points.length < 2) return;
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        const nx = dx / len, ny = dy / len;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        for (let t = 0; t <= len; t += stepPx) {
          const x = a.x + nx * t;
          const y = a.y + ny * t;
          this.spawn(x, y, { angle, ...opts });
        }
      }
    },

    update(dt) { this._pool.forEachActive(b => b.update(dt)); },

    draw() {
      const ctx = this._ctx; if (!ctx) return;
      if (this._cfg.backgroundClear) ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
      const prevComp = ctx.globalCompositeOperation;
      const prevAlpha = ctx.globalAlpha;
      ctx.globalCompositeOperation = this._cfg.composite || 'screen';
      ctx.globalAlpha = this._cfg.alpha ?? 0.7;
      this._pool.forEachActive(b => b.draw(ctx));
      ctx.globalCompositeOperation = prevComp;
      ctx.globalAlpha = prevAlpha;
    },
  };

  window.Foam = Foam;
})();
