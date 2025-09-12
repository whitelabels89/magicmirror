import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// locate repo directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicRoot = path.join(__dirname, '../public');

// folders to scan (relative to public root)
const rootDirs = ['elearn/models/ts-fp', 'elearn/models/ts-up'];
const rootsForManifest = rootDirs.map(r => '/' + r + '/');

const args = process.argv.slice(2);
const isDry = args.includes('--dry');
const isPretty = args.includes('--pretty');

function slugifySegment(str) {
  return str.replace(/[^a-zA-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').toLowerCase();
}
function slugify(parts) {
  return parts.map(slugifySegment).filter(Boolean).join('_');
}
function prettyName(str) {
  return str.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function walk(dir) {
  const res = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const ent of res) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

function inferCategory(p) {
  const cats = ['terrain', 'decor', 'unit', 'building', 'faction', 'projectile', 'ui', 'effects'];
  const lower = p.toLowerCase();
  return cats.find(c => lower.includes(c)) || 'misc';
}

async function main() {
  const assets = [];
  const counts = {};

  for (const r of rootDirs) {
    const absRoot = path.join(publicRoot, r);
    const rootName = path.basename(r);
    const files = await walk(absRoot);
    const jsons = files.filter(f => f.endsWith('.json'));
    for (const jf of jsons) {
      const base = jf.slice(0, -5);
      const pngFile = base + '.png';
      try {
        await fs.access(pngFile);
      } catch {
        continue; // skip json without matching png
      }
      const relJson = '/' + path.posix.relative(publicRoot, jf).replace(/\\/g, '/');
      const relPng = '/' + path.posix.relative(publicRoot, pngFile).replace(/\\/g, '/');
      const relNoExt = path.posix.relative(absRoot, jf).replace(/\\/g, '/').replace(/\.json$/, '');
      const segs = relNoExt.split('/');
      const id = slugify([rootName, ...segs]);
      const name = prettyName(path.basename(jf, '.json'));
      const category = inferCategory(relJson);
      const tags = [rootName, ...segs.slice(0, -1).map(slugifySegment), category];
      assets.push({ id, name, category, png: relPng, json: relJson, tags });
      counts[category] = (counts[category] || 0) + 1;
    }
  }

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    roots: rootsForManifest,
    assets,
    indexByCategory: {}
  };

  for (const a of assets) {
    (manifest.indexByCategory[a.category] = manifest.indexByCategory[a.category] || []).push(a.id);
  }

  if (!isDry) {
    const outDir = path.join(publicRoot, 'elearn/assets');
    await fs.mkdir(outDir, { recursive: true });
    const json = isPretty ? JSON.stringify(manifest, null, 2) : JSON.stringify(manifest);
    await fs.writeFile(path.join(outDir, 'manifest.json'), json);
  }

  console.log('Asset counts by category:');
  for (const [cat, num] of Object.entries(counts)) {
    console.log(`  ${cat}: ${num}`);
  }
  console.log(`Total: ${assets.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
