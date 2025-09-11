/**
 * AutoTiler — simple blob-style auto-tiling (8-neighbor bitmask)
 *
 * Assumptions:
 * - Grid per layer: 2D array (row-major) with truthy = filled, falsy = empty.
 * - Atlas set config (from terrain-atlas.json) uses:
 *   {
 *     mode: "blob47",
 *     coords: {
 *       center: [c,r],
 *       edges: { N:[c,r], E:[c,r], S:[c,r], W:[c,r] },
 *       cornersIn:  { NE:[c,r], SE:[c,r], SW:[c,r], NW:[c,r] },
 *       cornersOut: { NE:[c,r], SE:[c,r], SW:[c,r], NW:[c,r] }
 *     }
 *   }
 * - neighbors bit order: N, NE, E, SE, S, SW, W, NW (bits 0..7)
 *
 * Exported API (global.AutoTiler):
 *   - neighborsMask(grid, x, y): number 0..255
 *   - chooseTileByMask(setCfg, mask): returns { col, row }
 *   - autoTile(grid, x, y, setCfg): convenience (mask + choose)
 *
 * Notes:
 * - This is a pragmatic subset of blob/47. It covers common cases:
 *   center, straight edges, outer corners, inner corners.
 * - If multiple conditions match (e.g., missing N and E and NE),
 *   priority is: outer-corner > edge > inner-corner > center.
 */
(function (global) {
  'use strict';

  const DIR = {
    N: 0, NE: 1, E: 2, SE: 3, S: 4, SW: 5, W: 6, NW: 7
  };

  function _at(grid, x, y) {
    if (y < 0 || y >= grid.length) return 0;
    if (x < 0 || x >= grid[0].length) return 0;
    return grid[y][x] ? 1 : 0;
  }

  /**
   * Compute 8-neighbor bitmask for cell (x,y).
   * Bit order: N, NE, E, SE, S, SW, W, NW (bits 0..7)
   */
  function neighborsMask(grid, x, y) {
    const n  = _at(grid, x,   y-1);
    const ne = _at(grid, x+1, y-1);
    const e  = _at(grid, x+1, y  );
    const se = _at(grid, x+1, y+1);
    const s  = _at(grid, x,   y+1);
    const sw = _at(grid, x-1, y+1);
    const w  = _at(grid, x-1, y  );
    const nw = _at(grid, x-1, y-1);
    return (n<<0) | (ne<<1) | (e<<2) | (se<<3) | (s<<4) | (sw<<5) | (w<<6) | (nw<<7);
  }

  function _isFilled(mask, dirBit) {
    return ((mask >> dirBit) & 1) === 1;
  }

  function _pick(coords, key, fallback) {
    const v = coords && coords[key];
    if (Array.isArray(v) && v.length === 2) return { col: v[0], row: v[1] };
    if (fallback && typeof fallback.col === 'number' && typeof fallback.row === 'number') return fallback;
    // final hard fallback
    return { col: 0, row: 0 };
  }

  /**
   * Given a set config (blob47 coords) and an 8-neighbor mask,
   * return the grid coords {col,row} to use.
   */
  function chooseTileByMask(setCfg, mask) {
    const c = setCfg?.coords || {};
    const edges = c.edges || {};
    const cin = c.cornersIn || {};
    const cout = c.cornersOut || {};

    const N  = _isFilled(mask, DIR.N);
    const E  = _isFilled(mask, DIR.E);
    const S  = _isFilled(mask, DIR.S);
    const W  = _isFilled(mask, DIR.W);
    const NE = _isFilled(mask, DIR.NE);
    const SE = _isFilled(mask, DIR.SE);
    const SW = _isFilled(mask, DIR.SW);
    const NW = _isFilled(mask, DIR.NW);

    // 1) Outer corners (two adjacent orthogonals missing)
    // Missing N + E -> choose outer NE, etc.
    if (!N && !E) return _pick(cout, 'NE', _pick(edges, 'N', _pick(edges, 'E', _pick(c, 'center', { col: 0, row: 0 }))));
    if (!E && !S) return _pick(cout, 'SE', _pick(edges, 'E', _pick(edges, 'S', _pick(c, 'center', { col: 0, row: 0 }))));
    if (!S && !W) return _pick(cout, 'SW', _pick(edges, 'S', _pick(edges, 'W', _pick(c, 'center', { col: 0, row: 0 }))));
    if (!W && !N) return _pick(cout, 'NW', _pick(edges, 'W', _pick(edges, 'N', _pick(c, 'center', { col: 0, row: 0 }))));

    // 2) Edges (one orthogonal missing)
    if (!N && (E || W || S)) return _pick(edges, 'N', _pick(c, 'center'));
    if (!E && (N || S || W)) return _pick(edges, 'E', _pick(c, 'center'));
    if (!S && (E || W || N)) return _pick(edges, 'S', _pick(c, 'center'));
    if (!W && (N || S || E)) return _pick(edges, 'W', _pick(c, 'center'));

    // 3) Inner corners: all orthogonals present, diagonal missing
    // Example: N & E present but NE missing -> innerCorner NE
    if (N && E && !NE) return _pick(cin, 'NE', _pick(c, 'center', { col: 0, row: 0 }));
    if (E && S && !SE) return _pick(cin, 'SE', _pick(c, 'center', { col: 0, row: 0 }));
    if (S && W && !SW) return _pick(cin, 'SW', _pick(c, 'center', { col: 0, row: 0 }));
    if (W && N && !NW) return _pick(cin, 'NW', _pick(c, 'center', { col: 0, row: 0 }));

    // 4) All orthogonals present -> center
    if (N && E && S && W) return _pick(c, 'center', { col: 0, row: 0 });

    // 5) Isolated or ambiguous -> center as safe default
    return _pick(c, 'center', { col: 0, row: 0 });
  }

  /**
   * Convenience: do both mask + choose.
   * grid: 2D array; setCfg: atlas sets entry (e.g., atlas.sets.ground)
   */
  function autoTile(grid, x, y, setCfg) {
    const mask = neighborsMask(grid, x, y);
    const tile = chooseTileByMask(setCfg, mask);
    return { mask, tile }; // { mask: number, tile: {col,row} }
  }

  const API = {
    neighborsMask,
    chooseTileByMask,
    autoTile
  };

  global.AutoTiler = API;

})(typeof window !== 'undefined' ? window : globalThis);