(function (global) {
  'use strict';

  class SpriteSheetPreviewer {
    constructor(options = {}) {
      this.canvas = options.canvas || document.getElementById(options.canvasId || 'previewCanvas');
      if (!this.canvas) {
        throw new Error('SpriteSheetPreviewer: canvas element not found');
      }

      this.ctx = this.canvas.getContext('2d');
      this.atlasUrl = options.atlasUrl;
      this.imageUrl = options.imageUrl;
      this.scale = options.scale || 2;
      this.speed = options.speed || 1;
      this.padding = options.padding ?? 24;
      this.background = options.background ?? '#0f131a';

      this.frames = [];
      this.maxFrameWidth = 0;
      this.maxFrameHeight = 0;
      this.atlas = null;
      this.image = null;

      this.tagMap = {};
      this.tagNames = [];
      this.defaultTagName = 'All Frames';
      this.activeSequence = null;
      this.activeSequenceName = null;
      this.sequenceIndex = 0;
      this.elapsed = 0;
      this.playing = true;

      this.viewportWidth = this.canvas.width;
      this.viewportHeight = this.canvas.height;
      this.dpr = Math.max(1, Math.min(global.devicePixelRatio || 1, 2));
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.ctx.imageSmoothingEnabled = false;

      this.prevTimestamp = null;
      this.needsRedraw = false;

      this._frameListener = null;
      this._tagListener = null;

      this._loop = this._loop.bind(this);
    }

    async init() {
      await this._loadResources();
      this.setScale(this.scale);
      if (this.tagNames.length) {
        this.setTag(this.defaultTagName || this.tagNames[0]);
      }
      this.needsRedraw = true;
      global.requestAnimationFrame(this._loop);
      return this;
    }

    async _loadResources() {
      if (!this.atlasUrl || !this.imageUrl) {
        throw new Error('SpriteSheetPreviewer: atlasUrl and imageUrl are required');
      }

      const res = await fetch(this.atlasUrl);
      if (!res.ok) {
        throw new Error(`SpriteSheetPreviewer: failed to load atlas ${this.atlasUrl} (${res.status})`);
      }
      const atlas = await res.json();
      this.atlas = atlas;

      const entries = Object.entries(atlas.frames || {});
      if (!entries.length) {
        throw new Error('SpriteSheetPreviewer: atlas contains no frames');
      }

      this.frames = entries.map(([name, data], index) => ({
        name,
        index,
        x: data.frame.x,
        y: data.frame.y,
        w: data.frame.w,
        h: data.frame.h,
        duration: data.duration || 100,
      }));
      this.maxFrameWidth = this.frames.reduce((m, f) => Math.max(m, f.w), 0);
      this.maxFrameHeight = this.frames.reduce((m, f) => Math.max(m, f.h), 0);

      this._buildSequences();

      const image = new Image();
      image.src = this.imageUrl;
      await new Promise((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error(`SpriteSheetPreviewer: failed to load image ${this.imageUrl}`));
      });
      this.image = image;
    }

    _buildSequences() {
      this.tagMap = {};
      this.tagNames = [];

      const frameTags = (this.atlas && this.atlas.meta && this.atlas.meta.frameTags) || [];
      if (Array.isArray(frameTags) && frameTags.length) {
        for (const tag of frameTags) {
          const from = Math.max(0, tag.from | 0);
          const to = Math.min(this.frames.length - 1, tag.to | 0);
          if (to >= from) {
            this.tagMap[tag.name] = this.frames.slice(from, to + 1);
            this.tagNames.push(tag.name);
          }
        }
        this.defaultTagName = frameTags[0] && frameTags[0].name ? frameTags[0].name : 'All Frames';
      } else {
        this.defaultTagName = 'All Frames';
      }

      this.tagMap['All Frames'] = this.frames;
      if (!this.tagNames.includes('All Frames')) {
        this.tagNames.push('All Frames');
      }
    }

    getTagNames() {
      return this.tagNames.slice();
    }

    getActiveTag() {
      return this.activeSequenceName;
    }

    setTag(tagName) {
      if (!tagName || !this.tagMap[tagName]) {
        tagName = 'All Frames';
      }
      const seq = this.tagMap[tagName];
      if (!seq || !seq.length) {
        return;
      }
      this.activeSequence = seq;
      this.activeSequenceName = tagName;
      this.sequenceIndex = 0;
      this.elapsed = 0;
      this.needsRedraw = true;
      if (this._tagListener) {
        this._tagListener({ tag: tagName, length: seq.length });
      }
      if (this._frameListener) {
        this._frameListener(this._buildFrameInfo(seq[0]));
      }
    }

    setScale(scale) {
      if (!Number.isFinite(scale) || scale <= 0) {
        return;
      }
      this.scale = scale;
      if (!this.frames.length) {
        return;
      }

      const padding = this.padding;
      const viewportWidth = Math.round(this.maxFrameWidth * scale + padding * 2);
      const viewportHeight = Math.round(this.maxFrameHeight * scale + padding * 2);
      const dpr = (this.dpr = Math.max(1, Math.min(global.devicePixelRatio || 1, 2)));

      this.canvas.width = viewportWidth * dpr;
      this.canvas.height = viewportHeight * dpr;
      this.canvas.style.width = viewportWidth + 'px';
      this.canvas.style.height = viewportHeight + 'px';

      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.imageSmoothingEnabled = false;

      this.viewportWidth = viewportWidth;
      this.viewportHeight = viewportHeight;
      this.needsRedraw = true;
    }

    setSpeed(speed) {
      if (!Number.isFinite(speed) || speed <= 0) {
        return;
      }
      this.speed = speed;
    }

    setPlaying(playing) {
      this.playing = !!playing;
      if (this.playing) {
        this.prevTimestamp = null;
      }
    }

    togglePlaying() {
      this.setPlaying(!this.playing);
      return this.playing;
    }

    step(step = 1) {
      if (!this.activeSequence || !this.activeSequence.length) {
        return;
      }
      const len = this.activeSequence.length;
      let next = (this.sequenceIndex + step) % len;
      if (next < 0) {
        next += len;
      }
      this.sequenceIndex = next;
      this.elapsed = 0;
      this.needsRedraw = true;
    }

    onFrameChange(callback) {
      this._frameListener = typeof callback === 'function' ? callback : null;
    }

    onTagChange(callback) {
      this._tagListener = typeof callback === 'function' ? callback : null;
    }

    _loop(timestamp) {
      if (this.prevTimestamp == null) {
        this.prevTimestamp = timestamp;
      }
      const dt = timestamp - this.prevTimestamp;
      this.prevTimestamp = timestamp;

      if (this.playing && this.activeSequence && this.activeSequence.length) {
        this.elapsed += dt * this.speed;
        let frame = this.activeSequence[this.sequenceIndex];
        let duration = Math.max(1, frame.duration || 1);
        while (this.elapsed >= duration) {
          this.elapsed -= duration;
          this.sequenceIndex = (this.sequenceIndex + 1) % this.activeSequence.length;
          frame = this.activeSequence[this.sequenceIndex];
          duration = Math.max(1, frame.duration || 1);
          this.needsRedraw = true;
        }
      }

      if (this.needsRedraw && this.activeSequence && this.activeSequence.length) {
        this._drawCurrentFrame();
        this.needsRedraw = false;
      }

      global.requestAnimationFrame(this._loop);
    }

    _drawCurrentFrame() {
      const frame = this.activeSequence[this.sequenceIndex];
      const ctx = this.ctx;

      ctx.save();
      ctx.clearRect(0, 0, this.viewportWidth, this.viewportHeight);
      if (this.background) {
        ctx.fillStyle = this.background;
        ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);
      }

      const dw = frame.w * this.scale;
      const dh = frame.h * this.scale;
      const dx = Math.round((this.viewportWidth - dw) / 2);
      const dy = Math.round((this.viewportHeight - dh) / 2);

      ctx.drawImage(this.image, frame.x, frame.y, frame.w, frame.h, dx, dy, dw, dh);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, this.viewportWidth - 1, this.viewportHeight - 1);
      ctx.restore();

      if (this._frameListener) {
        this._frameListener(this._buildFrameInfo(frame));
      }
    }

    _buildFrameInfo(frame) {
      return {
        tag: this.activeSequenceName,
        frameIndex: this.sequenceIndex,
        frameCount: this.activeSequence ? this.activeSequence.length : 0,
        name: frame.name,
        duration: frame.duration,
      };
    }

    getCurrentFrameInfo() {
      if (!this.activeSequence || !this.activeSequence.length) {
        return null;
      }
      return this._buildFrameInfo(this.activeSequence[this.sequenceIndex]);
    }
  }

  global.SpriteSheetPreviewer = SpriteSheetPreviewer;
})(typeof window !== 'undefined' ? window : globalThis);
