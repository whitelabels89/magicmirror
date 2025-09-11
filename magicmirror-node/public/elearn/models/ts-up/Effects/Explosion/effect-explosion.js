/**
 * ExplosionEffect — reusable sprite-sheet explosion animator (Canvas 2D)
 *
 * Usage (plain HTML):
 *   <script src="/elearn/models/ts-up/Effects/Explosion/effect-explosion.js"></script>
 *   <script>
 *     const fx = new ExplosionEffect({
 *       canvas: document.getElementById('explosionCanvas'),
 *       spriteUrl: '/elearn/models/ts-up/Effects/Explosion/Explosions.png',
 *       totalFrames: 9,
 *       fps: 8,              // frames per second (default 8)
 *       scale: 1,            // render scale multiplier (default 1)
 *       centerMode: 'global' // 'global' (union bbox) or 'frame' (per-frame)
 *       // cols: 9, rows: 1, // set jika spritesheet tidak 1 baris
 *     });
 *     fx.start();
 *   </script>
 */
(function (global) {
  class ExplosionEffect {
    constructor(opts = {}) {
      this.canvas = opts.canvas || document.getElementById(opts.canvasId || 'explosionCanvas');
      if (!this.canvas) throw new Error('ExplosionEffect: canvas not found');
      this.ctx = this.canvas.getContext('2d');

      // Options
      this.spriteUrl = opts.spriteUrl || 'Explosions.png';
      this.totalFrames = Number.isFinite(opts.totalFrames) ? opts.totalFrames : 9;
      this.fps = opts.fps || 8;
      this.scale = opts.scale || 1;
      this.centerMode = opts.centerMode === 'frame' ? 'frame' : 'global';
      this.cols = opts.cols || this.totalFrames; // default 1 row (all frames in a row)
      this.rows = opts.rows || 1;

      // State
      this.image = new Image();
      this.image.src = this.spriteUrl;
      this.frameWidth = 0;
      this.frameHeight = 0;
      this.currentFrame = 0;
      this.timer = null;

      // Anchors
      this.globalCenter = { cx: 0, cy: 0 };
      this.frameCenters = null; // array per-frame when centerMode === 'frame'

      // Render target position (default center of canvas)
      this.posX = opts.x ?? this.canvas.width / 2;
      this.posY = opts.y ?? this.canvas.height / 2;

      // Quality
      this.ctx.imageSmoothingEnabled = false;

      this._onLoad = this._onLoad.bind(this);
      this.image.addEventListener('load', this._onLoad, { once: true });
    }

    _onLoad() {
      // Compute frame size from grid
      this.frameWidth = Math.floor(this.image.width / this.cols);
      this.frameHeight = Math.floor(this.image.height / this.rows);

      if (this.centerMode === 'frame') {
        this._computeFrameCenters();
      } else {
        this._computeGlobalCenter();
      }
    }

    _computeGlobalCenter() {
      const off = document.createElement('canvas');
      off.width = this.frameWidth;
      off.height = this.frameHeight;
      const offctx = off.getContext('2d', { willReadFrequently: true });

      let minXg = this.frameWidth, minYg = this.frameHeight, maxXg = -1, maxYg = -1;
      const alphaThreshold = 8; // tweak if needed (higher ignores faint glow)

      for (let i = 0; i < this.totalFrames; i++) {
        const col = i % this.cols;
        const row = Math.floor(i / this.cols);
        offctx.clearRect(0, 0, this.frameWidth, this.frameHeight);
        offctx.drawImage(
          this.image,
          col * this.frameWidth, row * this.frameHeight,
          this.frameWidth, this.frameHeight,
          0, 0,
          this.frameWidth, this.frameHeight
        );
        const imgData = offctx.getImageData(0, 0, this.frameWidth, this.frameHeight);
        // bbox scan
        let minX = this.frameWidth, minY = this.frameHeight, maxX = -1, maxY = -1;
        const { data, width, height } = imgData;
        for (let y = 0; y < height; y++) {
          let rowOff = y * width;
          for (let x = 0; x < width; x++) {
            const a = data[(rowOff + x) * 4 + 3];
            if (a > alphaThreshold) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX >= 0 && maxY >= 0) {
          if (minX < minXg) minXg = minX;
          if (minY < minYg) minYg = minY;
          if (maxX > maxXg) maxXg = maxX;
          if (maxY > maxYg) maxYg = maxY;
        }
      }

      if (maxXg < 0 || maxYg < 0) {
        this.globalCenter = { cx: this.frameWidth / 2, cy: this.frameHeight / 2 };
      } else {
        this.globalCenter = { cx: (minXg + maxXg) / 2, cy: (minYg + maxYg) / 2 };
      }
    }

    _computeFrameCenters() {
      const off = document.createElement('canvas');
      off.width = this.frameWidth;
      off.height = this.frameHeight;
      const offctx = off.getContext('2d', { willReadFrequently: true });
      this.frameCenters = new Array(this.totalFrames);
      const alphaThreshold = 8;

      for (let i = 0; i < this.totalFrames; i++) {
        const col = i % this.cols;
        const row = Math.floor(i / this.cols);
        offctx.clearRect(0, 0, this.frameWidth, this.frameHeight);
        offctx.drawImage(
          this.image,
          col * this.frameWidth, row * this.frameHeight,
          this.frameWidth, this.frameHeight,
          0, 0,
          this.frameWidth, this.frameHeight
        );
        const imgData = offctx.getImageData(0, 0, this.frameWidth, this.frameHeight);
        // bbox scan
        let minX = this.frameWidth, minY = this.frameHeight, maxX = -1, maxY = -1;
        const { data, width, height } = imgData;
        for (let y = 0; y < height; y++) {
          let rowOff = y * width;
          for (let x = 0; x < width; x++) {
            const a = data[(rowOff + x) * 4 + 3];
            if (a > alphaThreshold) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX < 0 || maxY < 0) {
          this.frameCenters[i] = { cx: this.frameWidth / 2, cy: this.frameHeight / 2 };
        } else {
          this.frameCenters[i] = { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
        }
      }
    }

    setPosition(x, y) { this.posX = x; this.posY = y; }
    setScale(s) { this.scale = s; }
    setFps(fps) {
      this.fps = fps;
      if (this.timer) { this.stop(); this.start(); }
    }

    start() {
      if (this.timer) return;
      const interval = Math.max(1, Math.floor(1000 / this.fps));
      this.timer = setInterval(() => this._tick(), interval);
    }

    stop() {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
    }

    _tick() {
      const { ctx, canvas } = this;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(this.posX, this.posY);

      const col = this.currentFrame % this.cols;
      const row = Math.floor(this.currentFrame / this.cols);
      const sx = col * this.frameWidth;
      const sy = row * this.frameHeight;

      const anchor = (this.centerMode === 'frame' && this.frameCenters)
        ? this.frameCenters[this.currentFrame]
        : this.globalCenter;

      const dx = -anchor.cx * this.scale;
      const dy = -anchor.cy * this.scale;
      const dw = this.frameWidth * this.scale;
      const dh = this.frameHeight * this.scale;

      this.ctx.drawImage(
        this.image,
        sx, sy,
        this.frameWidth, this.frameHeight,
        dx, dy,
        dw, dh
      );
      ctx.restore();

      this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
    }
  }

  global.ExplosionEffect = ExplosionEffect;
})(typeof window !== 'undefined' ? window : globalThis);
