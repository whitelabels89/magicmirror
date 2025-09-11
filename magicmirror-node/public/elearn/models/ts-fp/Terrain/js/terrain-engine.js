/**
 * TerrainEngine — glue between TerrainAtlas, AutoTiler, and your canvas.
 *
 * Responsibilities:
 *  - Load atlas (JSON) + layers (JSON) + tileset variant (PNG)
 *  - Hold per-layer boolean grids (truthy=floor present)
 *  - For each filled cell, pick tile via AutoTiler + draw via TerrainAtlas
 *
 * Public API (global.TerrainEngine):
 *  - init({ atlasUrl, layersUrl, variant, canvas })
 *  - setGrid(layerId, grid2d)
 *  - getGrid(layerId)
 *  - setVariant(variantKey)
 *  - toggleLayer(layerId, visible)
 *  - render()  // draws all visible layers
 *  - createGrid(width, height, fill=false)
 */
(function (global) {
  'use strict';

  const _state = {
    atlasUrl: null,
    layersUrl: null,
    atlas: null,        // parsed atlas json (mirror of TerrainAtlas.load result)
    layers: [],         // [{id,set,visible,z,blend}, ...] sorted by z
    layerMap: new Map(),// id -> layer obj
    grids: new Map(),   // id -> 2D array [row][col]
    canvas: null,
    ctx: null,
    ready: false,
    overrides: new Map(), // layerId -> { coordsPatch?: {skirt,skirt_end}, options?: { skirtToBottom, skirtDepth } }
    waterTex: null,       // HTMLImageElement for background water
    waterPattern: null    // CanvasPattern for background fill
  };

  function _ensure(cond, msg) {
    if (!cond) throw new Error(`[TerrainEngine] ${msg}`);
  }

  async function init({ atlasUrl, layersUrl, variant = 'color1', canvas }) {
    _ensure(atlasUrl && layersUrl, 'atlasUrl & layersUrl wajib diisi');
    _ensure(canvas, 'Harus berikan canvas');

    _state.atlasUrl = atlasUrl;
    _state.layersUrl = layersUrl;
    _state.canvas = canvas;
    _state.ctx = canvas.getContext('2d');
    _state.ctx.imageSmoothingEnabled = false;

    // 1) Load atlas json
    const atlasJson = await TerrainAtlas.load(atlasUrl);
    _state.atlas = atlasJson;

    // 2) Load layers json
    const res = await fetch(layersUrl, { cache: 'no-cache' });
    _ensure(res.ok, `Tidak bisa load layers: ${layersUrl}`);
    const layerDoc = await res.json();

    const layers = Array.from(layerDoc.layers || []);
    layers.sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    _state.layers = layers;
    _state.layerMap.clear();
    for (const L of layers) _state.layerMap.set(L.id, L);

    // 3) Set variant tileset
    await TerrainAtlas.setVariant(variant || atlasJson.defaultVariant || 'color1');

    // 4) Create empty grids if missing
    const { tileSize } = TerrainAtlas.getConfig();
    const w = Math.floor(canvas.width / tileSize);
    const h = Math.floor(canvas.height / tileSize);
    for (const L of layers) {
      if (!_state.grids.has(L.id)) {
        _state.grids.set(L.id, createGrid(w, h, false));
      }
    }

    _state.ready = true;
    return { tileSize, cols: w, rows: h };
  }

  async function setWaterTexture(url) {
    if (!url) {
      _state.waterTex = null;
      _state.waterPattern = null;
      return;
    }
    const img = await new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('Failed to load water texture'));
      im.src = url;
    });
    _state.waterTex = img;
    const ctx = _state.ctx;
    _state.waterPattern = ctx.createPattern(img, 'repeat');
  }

  function setGrid(layerId, grid2d) {
    _ensure(_state.layerMap.has(layerId), `Layer tidak dikenal: ${layerId}`);
    _ensure(Array.isArray(grid2d) && Array.isArray(grid2d[0]), 'grid2d harus 2D array');
    _state.grids.set(layerId, grid2d);
  }

  function getGrid(layerId) {
    return _state.grids.get(layerId);
  }

  async function setVariant(variantKey) {
    _ensure(_state.atlas, 'init() belum dipanggil');
    await TerrainAtlas.setVariant(variantKey);
  }

  function toggleLayer(layerId, visible) {
    const L = _state.layerMap.get(layerId);
    _ensure(L, `Layer tidak dikenal: ${layerId}`);
    L.visible = !!visible;
  }

  // Debug/runtime: override layer options/coords without editing atlas JSON.
  // opts = { coordsPatch?: { skirt:[c,r], skirt_end:[c,r] }, options?: { skirtToBottom?:bool, skirtDepth?:number } }
  function overrideLayer(layerId, opts = {}) {
    _ensure(_state.layerMap.has(layerId), `Layer tidak dikenal: ${layerId}`);
    const cur = _state.overrides.get(layerId) || { coordsPatch: {}, options: {} };
    const next = {
      coordsPatch: { ...(cur.coordsPatch||{}), ...(opts.coordsPatch||{}) },
      options: { ...(cur.options||{}), ...(opts.options||{}) }
    };
    _state.overrides.set(layerId, next);
  }

  function createGrid(width, height, fill = false) {
    const row = new Array(width).fill(fill ? 1 : 0);
    const grid = new Array(height).fill(null).map(() => row.slice());
    return grid;
  }

  function _inBounds(grid, x, y) {
    if (!grid) return false;
    if (y < 0 || y >= grid.length) return false;
    if (x < 0 || x >= grid[0].length) return false;
    return true;
  }

  function paintCell(layerId, x, y, val, useAuto = true) {
    const L = _state.layerMap.get(layerId);
    if (!L) return false;
    const grid = _state.grids.get(layerId);
    if (!_inBounds(grid, x, y)) return false;

    // apply to target layer
    grid[y][x] = val ? 1 : 0;
    _state.grids.set(layerId, grid);

    if (!useAuto) return true;

    // read atlas auto directives for this layer's set
    const setCfg = _state.atlas?.sets?.[L.set];
    const auto = setCfg && setCfg.auto;
    if (auto && auto.companion) {
      const companions = Array.isArray(auto.companion) ? auto.companion : [auto.companion];
      for (const c of companions) {
        if (!c || !c.layer) continue;
        const compGrid = _state.grids.get(c.layer);
        const action = val ? c.onPaint : c.onErase;
        // support optional offset: [dx,dy]; default (0,0)
        const off = Array.isArray(c.offset) && c.offset.length === 2 ? c.offset : [0, 0];
        const tx = x + (off[0] | 0);
        const ty = y + (off[1] | 0);
        if (!_inBounds(compGrid, tx, ty)) continue;
        if (action === 'fillSameCell') {
          compGrid[ty][tx] = 1;
          _state.grids.set(c.layer, compGrid);
        } else if (action === 'eraseSameCell') {
          compGrid[ty][tx] = 0;
          _state.grids.set(c.layer, compGrid);
        }
      }
    }

    return true;
  }

  function _drawLayer(L) {
    if (!L.visible) return;
    const setCfg = _state.atlas?.sets?.[L.set];
    if (!setCfg) return; // layer tanpa set di atlas → skip

    // --- Special pattern helpers (single/vertical/horizontal) ---
    function get(grid, xx, yy) {
      return _inBounds(grid, xx, yy) ? !!grid[yy][xx] : false;
    }
    function neighbors(grid, xx, yy) {
      const N = get(grid, xx, yy-1), S = get(grid, xx, yy+1), W = get(grid, xx-1, yy), E = get(grid, xx+1, yy);
      const NW = get(grid, xx-1, yy-1), NE = get(grid, xx+1, yy-1), SW = get(grid, xx-1, yy+1), SE = get(grid, xx+1, yy+1);
      return { N,S,W,E,NW,NE,SW,SE };
    }
    function selectSpecialTile(grid, xx, yy, special) {
      if (!special) return null;
      const nb = neighbors(grid, xx, yy);
      const noAdj = !nb.N && !nb.S && !nb.W && !nb.E && !nb.NW && !nb.NE && !nb.SW && !nb.SE;

      // === PRIORITY 1: SINGLE ===
      if (noAdj && special.single && Array.isArray(special.single.center)) {
        const c = special.single.center; return { col: c[0], row: c[1], kind: 'single' };
      }

      // Helper: detect pure strokes vs. area
      const isVert = !nb.W && !nb.E && (nb.N || nb.S);
      const isHor  = !nb.N && !nb.S && (nb.W || nb.E);
      const hasHV  = (nb.N || nb.S) && (nb.W || nb.E); // has both horiz+vert neighbors → likely area

      // === PRIORITY 1.5: UNIVERSAL TOP CAP (only for area-like regions) ===
      // Apapun bentuknya, jika sisi utara kosong dan selatan terisi, gunakan cap rumput.
      // Ini menutupi kasus: horizontal 1-tinggi di atas kosong, U-shape, atau perpotongan + cabang.
      if (!nb.N && nb.S && hasHV) { // require area-like (has both horiz+vert neighbors)
        const area = special.area3x3 || {};
        const topRow = area.topRow || {};
        // choose left/mid/right secara sederhana berdasar W/E
        let cap = null;
        if (Array.isArray(topRow.centers)) {
          if (!nb.W && nb.E && topRow.centers[0]) cap = topRow.centers[0];
          else if (nb.W && nb.E && topRow.centers[1]) cap = topRow.centers[1];
          else if (nb.W && !nb.E && topRow.centers[2]) cap = topRow.centers[2];
        }
        // fallback ke edge-N dari coords bila tidak ada di special
        const edgeN = _state.atlas?.sets?.cliff_land?.coords?.edges?.N || [12,2];
        const use = Array.isArray(cap) ? cap : edgeN;
        return { col: use[0], row: use[1], kind: 'top-cap' };
      }

      // === PRIORITY 2: VERTICAL STROKE ===
      if (isVert && special.vertical && Array.isArray(special.vertical.centers)) {
        const arr = special.vertical.centers; // [top, mid, bot]
        if (!nb.N && nb.S && arr[0]) return { col: arr[0][0], row: arr[0][1], kind: 'v-top', idx: 0 };
        if ( nb.N &&  nb.S && arr[1]) return { col: arr[1][0], row: arr[1][1], kind: 'v-mid', idx: 1 };
        if ( nb.N && !nb.S && arr[2]) return { col: arr[2][0], row: arr[2][1], kind: 'v-bot', idx: 2 };
      }

      // === PRIORITY 3: HORIZONTAL STROKE ===
      if (isHor && special.horizontal && Array.isArray(special.horizontal.centers)) {
        const arr = special.horizontal.centers; // [left, mid, right]
        if (!nb.W &&  nb.E && arr[0]) return { col: arr[0][0], row: arr[0][1], kind: 'h-left', idx: 0 };
        if ( nb.W &&  nb.E && arr[1]) return { col: arr[1][0], row: arr[1][1], kind: 'h-mid', idx: 1 };
        if ( nb.W && !nb.E && arr[2]) return { col: arr[2][0], row: arr[2][1], kind: 'h-right', idx: 2 };
      }

      // === PRIORITY 4: AREA (requires both H and V neighbors so tidak nabrak stroke) ===
      const area = special.area3x3 || {};
      if (hasHV) {
        // New schema support: topRow/midRow/bottomRow with centers[] and optional skirt arrays
        const topRow    = area.topRow    || {};
        const midRow    = area.midRow    || {};
        const bottomRow = area.bottomRow || {};

        // Helper: choose left/mid/right based on side adjacency
        const chooseLMR = (arr) => {
          if (!Array.isArray(arr)) return null;
          if (!nb.W &&  nb.E && arr[0]) return arr[0]; // left
          if ( nb.W &&  nb.E && arr[1]) return arr[1]; // mid
          if ( nb.W && !nb.E && arr[2]) return arr[2]; // right
          return arr[1] || arr[0] || arr[2] || null;
        };

        // Bottom edge of area: no neighbor south → use cliff face row
        if (!nb.S) {
          const cliffTile = chooseLMR(bottomRow.centers);
          const use = Array.isArray(cliffTile) ? cliffTile : [12, 4];
          // return also which variant idx was implied (0/1/2) for potential overlays
          let idx = 1;
          if (!nb.W && nb.E) idx = 0; else if (nb.W && !nb.E) idx = 2;
          return { col: use[0], row: use[1], kind: 'area-bottom', idx };
      }

        // Top edge of area: no neighbor north
        if (!nb.N) {
          // Special case: area height == 2 (only one row below this top row)
          // In this case, do NOT draw a top cap; use plain grass so there is no extra horizontal band.
          const hasSecondBelow = get(grid, xx, yy + 2);
          if (nb.S && !hasSecondBelow) {
            const atlasGrass = _state.atlas?.sets?.ground?.coords?.center || [2,2];
            return { col: atlasGrass[0], row: atlasGrass[1], kind: 'area-top-flat' };
          }
          // Height >= 3 → use grass-cap for the true plateau top
          const cap = chooseLMR(topRow.centers);
          const use = Array.isArray(cap) ? cap
                   : Array.isArray(midRow.centers?.[1]) ? midRow.centers[1]
                   : [12, 2];
          return { col: use[0], row: use[1], kind: 'area-top' };
        }

        // Interior/middle rows → use midRow mapping (usually same as grass-cap)
        const mid = chooseLMR(midRow.centers);
        const useMid = Array.isArray(mid) ? mid : [12, 2];
        return { col: useMid[0], row: useMid[1], kind: 'area-mid' };
      }

      return null;
    }

    const grid = _state.grids.get(L.id);
    if (!grid) return;

    const cfg = TerrainAtlas.getConfig();
    const t = cfg.tileSize;
    const ctx = _state.ctx;

    // Set blend mode jika ada
    ctx.globalCompositeOperation = L.blend || 'source-over';

    const h = grid.length;
    const w = grid[0].length;

    // Resolve overlay grids once if needed
    const cliffLandGrid = (L.set === 'ground') ? _state.grids.get('cliff_land') : null;
    const cliffWaterGrid = (L.set === 'ground') ? _state.grids.get('cliff_water') : null;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!grid[y][x]) continue; // kosong → skip

        let tileCR;
        let chosenMeta = null;

        // Custom handling for slopes: choose left/right stairs depending on adjacent cliffs
        if (L.set === 'slopes') {
          const cliffLand = _state.grids.get('cliff_land');
          const cliffWater = _state.grids.get('cliff_water');
          const isCliff = (gg, xx, yy) => _inBounds(gg, xx, yy) && !!gg[yy][xx];
          const hasRight = (isCliff(cliffLand, x+1, y) || isCliff(cliffWater, x+1, y) || isCliff(cliffLand, x+1, y-1) || isCliff(cliffLand, x+1, y+1) || isCliff(cliffWater, x+1, y-1) || isCliff(cliffWater, x+1, y+1));
          const hasLeft  = (isCliff(cliffLand, x-1, y) || isCliff(cliffWater, x-1, y) || isCliff(cliffLand, x-1, y-1) || isCliff(cliffLand, x-1, y+1) || isCliff(cliffWater, x-1, y-1) || isCliff(cliffWater, x-1, y+1));
          const stairs = setCfg?.stairs || {};
          let use = null;
          if (hasRight && !hasLeft) use = stairs.right || [16,1];
          else if (hasLeft && !hasRight) use = stairs.left || [18,1];
          else {
            // fallback: prefer facing the nearest cliff column (right by default)
            use = ((x % 2) === 0 ? (stairs.right || [16,1]) : (stairs.left || [18,1]));
          }
          // optional alternation for visual variety by row parity
          if (Array.isArray(use) && stairs.right2 && (y % 2 === 1) && use === stairs.right) use = stairs.right2;
          if (Array.isArray(use) && stairs.left2  && (y % 2 === 1) && use === stairs.left)  use = stairs.left2;
          tileCR = { col: use[0], row: use[1] };
        }

        // If drawing ground, suppress edge/corner selection ON or JUST BELOW any cliff tiles
        // to avoid grass-cap lines appearing under cliff faces when top area is painted.
        if (L.set === 'ground') {
          const underCliffSame = !!((cliffLandGrid && cliffLandGrid[y]?.[x]) || (cliffWaterGrid && cliffWaterGrid[y]?.[x]));
          const cliffAbove = y > 0 && !!((cliffLandGrid && cliffLandGrid[y-1]?.[x]) || (cliffWaterGrid && cliffWaterGrid[y-1]?.[x]));
          // any cliff in 3x3 above neighborhood (NW,N,NE and W,E same row) also forces center
          const cliffNW = (y>0&&x>0) && !!((cliffLandGrid && cliffLandGrid[y-1]?.[x-1]) || (cliffWaterGrid && cliffWaterGrid[y-1]?.[x-1]));
          const cliffNE = (y>0&&x+1<w) && !!((cliffLandGrid && cliffLandGrid[y-1]?.[x+1]) || (cliffWaterGrid && cliffWaterGrid[y-1]?.[x+1]));
          const cliffW  = (x>0) && !!((cliffLandGrid && cliffLandGrid[y]?.[x-1]) || (cliffWaterGrid && cliffWaterGrid[y]?.[x-1]));
          const cliffE  = (x+1<w) && !!((cliffLandGrid && cliffLandGrid[y]?.[x+1]) || (cliffWaterGrid && cliffWaterGrid[y]?.[x+1]));
          if (underCliffSame || cliffAbove || cliffNW || cliffNE || cliffW || cliffE) {
            const center = _state.atlas?.sets?.ground?.coords?.center || [2,2];
            tileCR = { col: center[0], row: center[1] };
          }
        }

        // Try special mapping first (single / vertical / horizontal / area)
        if (setCfg && setCfg.special) {
          const chosen = selectSpecialTile(grid, x, y, setCfg.special);
          if (chosen) {
            tileCR = { col: chosen.col, row: chosen.row };
            chosenMeta = chosen;
          }
        }

        // Note: skirt (vertical cliff wall) is drawn in a separate overlay pass
        // after all layers to ensure visibility while painting.

        // Pilih tile via AutoTiler
        if (!tileCR && L.set === 'water' && _state.waterTex) {
          // Draw external water texture per cell
          try {
            ctx.drawImage(_state.waterTex, x * t, y * t, t, t);
          } catch (_) {}
          continue;
        } else if (!tileCR && setCfg.mode === 'blob47') {
          const { tile } = AutoTiler.autoTile(grid, x, y, setCfg);
          tileCR = tile; // {col,row}
        } else if (!tileCR && setCfg.mode === 'explicit') {
          // Untuk set explicit, sediakan grid value = string key (misal 'NE','SW',dst) atau number index
          const v = grid[y][x];
          if (typeof v === 'string') {
            const tri = setCfg.triangles || {};
            const coord = tri[v];
            if (!coord) continue;
            tileCR = { col: coord[0], row: coord[1] };
          } else if (typeof v === 'number') {
            // treat as linear index
            if (Number.isInteger(v) && v >= 0) {
              TerrainAtlas.drawTile(ctx, { index: v }, x * t, y * t, 1);
            }
            continue;
          } else {
            continue;
          }
        } else if (!tileCR) {
          // default fallback: center
          const center = setCfg.coords?.center;
          if (!center) continue;
          tileCR = { col: center[0], row: center[1] };
        }

        if (!tileCR || typeof tileCR.col !== 'number' || typeof tileCR.row !== 'number') {
          continue;
        }
        TerrainAtlas.drawTile(ctx, tileCR, x * t, y * t, 1);

        // No extra overlay for horizontal ridge; tile art already includes cap on top of rock.
      }
    }
    // reset blend
    ctx.globalCompositeOperation = 'source-over';
  }

  // Second pass: draw vertical skirts for cliff-like sets after all layers,
  // so cliffs remain visible even while painting overlapping ground/decor.
  function _drawSkirts(L) {
    if (!L.visible) return;
    const setCfg = _state.atlas?.sets?.[L.set];
    if (!setCfg) return;
    // Apply optional runtime coords override
    const ovr = _state.overrides.get(L.id);
    const coords = { ...(setCfg.coords||{}), ...(ovr?.coordsPatch||{}) };
    const special = setCfg.special || null;
    if (!Array.isArray(coords.skirt)) return; // only for sets defining skirt

    const grid = _state.grids.get(L.id);
    if (!grid) return;

    // Resolve ground layer grid for single-step skirt above ground
    const groundLayer = _state.layers.find(ll => ll && ll.set === 'ground');
    const groundGrid = groundLayer ? _state.grids.get(groundLayer.id) : null;

    const cfg = TerrainAtlas.getConfig();
    const t = cfg.tileSize;
    const maxCols = cfg.cols || 0;
    const maxRows = cfg.rows || 0;
    const ctx = _state.ctx;

    ctx.globalCompositeOperation = 'source-over';

    const h = grid.length;
    const w = grid[0].length;

    function inRangeColRow(c, r) {
      return Number.isFinite(c) && Number.isFinite(r) && c >= 0 && r >= 0 && c < maxCols && r < maxRows;
    }

    function drawTileSafe(cr, dx, dy) {
      if (!cr) return;
      const c = cr.col, r = cr.row;
      if (!inRangeColRow(c, r)) return; // ignore invalid override coords instead of throwing
      try {
        TerrainAtlas.drawTile(ctx, { col: c, row: r }, dx, dy, 1);
      } catch (_) {
        // ignore
      }
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!grid[y][x]) continue;

        const nbN = (y>0)&&grid[y-1][x];
        const nbS = (y+1<h)&&grid[y+1][x];
        const nbW = (x>0)&&grid[y][x-1];
        const nbE = (x+1<w)&&grid[y][x+1];
        const nbNW = (y>0&&x>0)&&grid[y-1][x-1];
        const nbNE = (y>0&&x+1<w)&&grid[y-1][x+1];
        const nbSW = (y+1<h&&x>0)&&grid[y+1][x-1];
        const nbSE = (y+1<h&&x+1<w)&&grid[y+1][x+1];

        // --- EARLY SKIP: do not draw skirts on the north edge/corners of an area when requested ---
        if (special && special.area3x3 && special.area3x3.northNoSkirt) {
          // top edge of a filled area: skip all north edge (including U-shape)
          if (!nbN && (nbW || nbE || nbS)) {
            continue;
          }
        }

        // Compute mask to know if south side is open relative to this layer
        const { mask } = AutoTiler.autoTile(grid, x, y, setCfg);
        const southFilled = ((mask >> 4) & 1) === 1;

        // Also treat out-of-bounds south as open for skirt
        const southOpen = !southFilled || (y + 1 >= h) || !grid[y + 1][x];
        if (!southOpen) continue;

        // prefer special skirt tiles
        let skirtCR = null;
        if (special) {
          const noAdj = !nbN && !nbS && !nbW && !nbE && !nbNW && !nbNE && !nbSW && !nbSE;
          if (noAdj && special.single && Array.isArray(special.single.skirt)) {
            skirtCR = { col: special.single.skirt[0], row: special.single.skirt[1] };
          } else if (!nbW && !nbE && (nbN || nbS) && special.vertical && Array.isArray(special.vertical.skirt)) {
            // vertical bottom skirt
            if (southOpen && !nbS) skirtCR = { col: special.vertical.skirt[0], row: special.vertical.skirt[1] };
          } else if (!nbN && !nbS && (nbW || nbE) && special.horizontal && Array.isArray(special.horizontal.skirtRow)) {
            const arr = special.horizontal.skirtRow; // [left, mid, right]
            if (!nbW && nbE && arr[0]) skirtCR = { col: arr[0][0], row: arr[0][1] };
            else if (nbW && nbE && arr[1]) skirtCR = { col: arr[1][0], row: arr[1][1] };
            else if (nbW && !nbE && arr[2]) skirtCR = { col: arr[2][0], row: arr[2][1] };
          } else if (special.area3x3 && special.area3x3.bottomRow && Array.isArray(special.area3x3.bottomRow.skirtRow)) {
            // bottom row of a 3-wide area (new schema): choose left/mid/right skirt
            if (southOpen && !nbS) {
              const arr = special.area3x3.bottomRow.skirtRow; // e.g., [[12,5],[12,5],[12,5]]
              if (!nbW && nbE && arr[0]) skirtCR = { col: arr[0][0], row: arr[0][1] };
              else if (nbW && nbE && arr[1]) skirtCR = { col: arr[1][0], row: arr[1][1] };
              else if (nbW && !nbE && arr[2]) skirtCR = { col: arr[2][0], row: arr[2][1] };
            }
          }
        }

        // Draw only a single-step skirt immediately below, regardless of what lies beneath (empty/water/ground).
        // No repetition to bottom and no end-caps.
        drawTileSafe(skirtCR || { col: coords.skirt[0], row: coords.skirt[1] }, x * t, (y + 1) * t);
        continue;
      }
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  function render() {
    _ensure(_state.ready, 'init() belum dipanggil');
    const ctx = _state.ctx;
    const { width, height } = _state.canvas;
    // Background: water texture if available, else clear
    if (_state.waterPattern) {
      ctx.save();
      ctx.fillStyle = _state.waterPattern;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    for (const L of _state.layers) {
      _drawLayer(L);
      // Draw ground skirts immediately after ground base so higher layers can cover them.
      const setCfg = _state.atlas?.sets?.[L.set];
      if (L.set === 'ground' && setCfg && setCfg.mode === 'blob47' && setCfg.coords && Array.isArray(setCfg.coords.skirt)) {
        _drawSkirts(L);
      }
    }

    // Overlay skirts for non-ground layers after base tiles to guarantee visibility for cliffs/decor
    for (const L of _state.layers) {
      const setCfg = _state.atlas?.sets?.[L.set];
      if (!setCfg) continue;
      if (L.set !== 'ground' && setCfg.mode === 'blob47' && setCfg.coords && Array.isArray(setCfg.coords.skirt)) {
        _drawSkirts(L);
      }
    }
  }

  // Expose API
  global.TerrainEngine = {
    init,
    setGrid,
    getGrid,
    setVariant,
    toggleLayer,
    render,
    createGrid,
    paintCell,
    setWaterTexture
  };

})(typeof window !== 'undefined' ? window : globalThis);
