

/**
 * TerrainAtlas - tileset/atlas loader & drawer (Canvas 2D)
 * Works with terrain-atlas.json (variants, sets, indexing).
 *
 * Usage:
 *   await TerrainAtlas.load('/elearn/models/ts-fp/Terrain/atlas/terrain-atlas.json');
 *   TerrainAtlas.setVariant('color1'); // or 'color2', 'color3'
 *   const ctx = canvas.getContext('2d');
 *   TerrainAtlas.drawTile(ctx, { col: 3, row: 2 }, 64, 64, 1);
 *
 * Supports:
 *  - indexing.mode: 'grid' (preferred) or 'linear'
 *  - variants with identical layout (url differs)
 *  - margin/spacing
 *  - per-tile caching into offscreen canvas
 */
(function (global) {
  'use strict';

  const _state = {
    atlas: null,                // parsed JSON
    variantKey: null,           // e.g., 'color1'
    image: null,                // HTMLImageElement
    cfg: { tileSize: 64, spacing: 0, margin: 0 },
    layout: { cols: 0, rows: 0 },
    cache: new Map(),           // key: `${variantKey}:${index}` -> Offscreen canvas
    ready: false
  };

  function _ensure(condition, msg) {
    if (!condition) throw new Error(`[TerrainAtlas] ${msg}`);
  }

  function _img(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error(`[TerrainAtlas] Failed to load image: ${url}`));
      img.src = url;
    });
  }

  async function load(atlasUrl) {
    const res = await fetch(atlasUrl, { cache: 'no-cache' });
    _ensure(res.ok, `Cannot load atlas json: ${atlasUrl}`);
    const atlas = await res.json();

    _state.atlas = atlas;
    _state.cfg.tileSize = atlas.tileSize ?? 64;
    _state.cfg.spacing = atlas.spacing ?? 0;
    _state.cfg.margin = atlas.margin ?? 0;

    // Select default variant but do not load image until setVariant called
    _state.variantKey = atlas.defaultVariant || Object.keys(atlas.variants)[0];
    _state.image = null;
    _state.layout = { cols: 0, rows: 0 };
    _state.cache.clear();
    _state.ready = false;

    return atlas;
  }

  async function _loadVariantImage(variantKey) {
    const atlas = _state.atlas;
    _ensure(atlas, 'Atlas JSON not loaded. Call load() first.');

    const v = atlas.variants[variantKey];
    _ensure(v && v.url, `Variant not found: ${variantKey}`);

    const img = await _img(v.url);
    _state.image = img;

    // auto-detect cols/rows if not set in atlas
    const t = _state.cfg.tileSize;
    const spacing = _state.cfg.spacing;
    const margin = _state.cfg.margin;

    // If explicit cols/rows exist, use them; otherwise infer
    let cols = Number.isFinite(v.cols) ? v.cols : Math.floor((img.width - margin * 2 + spacing) / (t + spacing));
    let rows = Number.isFinite(v.rows) ? v.rows : Math.floor((img.height - margin * 2 + spacing) / (t + spacing));

    _ensure(cols > 0 && rows > 0, `Invalid grid size from image ${img.width}x${img.height}, tileSize=${t}`);

    _state.layout = { cols, rows };
  }

  async function setVariant(variantKey) {
    _ensure(_state.atlas, 'Atlas not loaded. Call load() first.');
    _ensure(_state.atlas.variants[variantKey], `Unknown variant '${variantKey}'`);
    _state.variantKey = variantKey;
    _state.cache.clear();
    await _loadVariantImage(variantKey);
    _state.ready = true;
  }

  function getVariant() {
    return _state.variantKey;
  }

  function getConfig() {
    return { ..._state.cfg, ..._state.layout };
  }

  function _toIndex(input) {
    // Accept {index} for linear, or {col,row} for grid.
    // Always return linear index for caching.
    const mode = _state.atlas?.indexing?.mode || 'grid';
    if (mode === 'linear') {
      _ensure(typeof input.index === 'number', 'Expected { index } for linear indexing');
      return input.index;
    } else {
      _ensure(Number.isFinite(input.col) && Number.isFinite(input.row), 'Expected { col, row } for grid indexing');
      const { cols } = _state.layout;
      return input.row * cols + input.col;
    }
  }

  function _rectFromIndex(index) {
    const { cols } = _state.layout;
    const col = index % cols;
    const row = Math.floor(index / cols);
    return _rectFromGrid(col, row);
  }

  function _rectFromGrid(col, row) {
    const { tileSize: t, spacing: s, margin: m } = _state.cfg;
    const sx = m + col * (t + s);
    const sy = m + row * (t + s);
    return { sx, sy, sw: t, sh: t };
  }

  function _getCacheCanvas(index) {
    const key = `${_state.variantKey}:${index}`;
    if (_state.cache.has(key)) return _state.cache.get(key);

    const { sx, sy, sw, sh } = _rectFromIndex(index);
    const off = document.createElement('canvas');
    off.width = sw;
    off.height = sh;
    const offctx = off.getContext('2d', { willReadFrequently: true });
    offctx.imageSmoothingEnabled = false;

    offctx.clearRect(0, 0, sw, sh);
    offctx.drawImage(_state.image, sx, sy, sw, sh, 0, 0, sw, sh);

    _state.cache.set(key, off);
    return off;
  }

  /**
   * Return an offscreen canvas of the requested tile.
   * input can be {index} (linear) or {col,row} (grid).
   */
  function getTile(input) {
    _ensure(_state.ready, 'Variant not ready. Call setVariant().');
    const index = _toIndex(input);
    _ensure(index >= 0 && index < _state.layout.cols * _state.layout.rows, `Index out of range: ${index}`);
    return _getCacheCanvas(index);
  }

  /**
   * Draw the tile to ctx at (dx,dy) with optional scale.
   * input can be {index} (linear) or {col,row} (grid).
   */
  function drawTile(ctx, input, dx, dy, scale = 1) {
    const tile = getTile(input);
    const w = tile.width * scale;
    const h = tile.height * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tile, 0, 0, tile.width, tile.height, dx, dy, w, h);
  }

  /**
   * Convenience helper: compute linear index from grid coords.
   */
  function indexOf(col, row) {
    const { cols } = _state.layout;
    return row * cols + col;
  }

  /**
   * Convenience helper: compute grid coords from linear index.
   */
  function coordsOf(index) {
    const { cols } = _state.layout;
    return { col: index % cols, row: Math.floor(index / cols) };
  }

  // Expose API
  const API = {
    load,
    setVariant,
    getVariant,
    getConfig,
    getTile,
    drawTile,
    indexOf,
    coordsOf
  };

  global.TerrainAtlas = API;

})(typeof window !== 'undefined' ? window : globalThis);