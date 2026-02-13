const express = require('express');
const app = express();
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { google } = require('googleapis');
const uploadModulRouter = require('./uploadModul');
const admin = require('firebase-admin');
let PDFDocument = null;
try {
  PDFDocument = require('pdfkit');
} catch (err) {
  console.warn('[nainai] pdfkit belum terpasang. Fitur invoice PDF tidak aktif.');
}

const WORKSHEET_SHORTLINK_COLLECTION = process.env.WORKSHEET_SHORTLINK_COLLECTION || 'worksheet_shortlinks';
const REPLICATE_BASE_URL = (process.env.REPLICATE_PROXY_BASE_URL || 'https://api.replicate.com').replace(/\/+$/, '');
const REPLICATE_PROXY_SECRET =
  typeof process.env.REPLICATE_PROXY_SHARED_SECRET === 'string'
    ? process.env.REPLICATE_PROXY_SHARED_SECRET.trim()
    : '';
const REPLICATE_PROXY_USER_AGENT =
  (typeof process.env.REPLICATE_PROXY_USER_AGENT === 'string' && process.env.REPLICATE_PROXY_USER_AGENT.trim()) ||
  'magicmirror-replicate-proxy/1.0';
const REPLICATE_PROXY_TIMEOUT_MS = Number(process.env.REPLICATE_PROXY_TIMEOUT_MS || 120000);
const REPLICATE_PROXY_DEFAULT_TOKEN =
  (typeof process.env.REPLICATE_PROXY_API_TOKEN === 'string' && process.env.REPLICATE_PROXY_API_TOKEN.trim()) ||
  (typeof process.env.REPLICATE_API_TOKEN === 'string' && process.env.REPLICATE_API_TOKEN.trim()) ||
  (typeof process.env.REPLICATE_API_KEY === 'string' && process.env.REPLICATE_API_KEY.trim()) ||
  '';
const REPLICATE_PROXY_PREFIX = '/api/replicate-proxy';

// CORS (allow credentials; restrict origins via FRONTEND_ORIGINS env if provided)
const allowedOrigins = (process.env.FRONTEND_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.set('trust proxy', 1);
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // allow same-origin / curl
    if (allowedOrigins.length === 0) return cb(null, true); // allow all if not configured
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'), false);
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // handle large JSON bodies

// --- Minimal auth bootstrap for worksheet submit ---
// If DEV_ENABLE_FAKE_AUTH=1, we attach a fake user (for local/dev testing).
app.use((req, res, next) => {
  try {
    if (process.env.DEV_ENABLE_FAKE_AUTH === '1' && !req.user) {
      req.user = {
        uid: process.env.DEV_FAKE_UID || 'DEV_UID',
        role: process.env.DEV_FAKE_ROLE || 'moderator'
      };
    }
    // Also allow overriding via headers for quick testing
    const hdrUid = req.headers['x-uid'];
    const hdrRole = req.headers['x-role'];
    if ((hdrUid || hdrRole)) {
      req.user = {
        uid: String(hdrUid || (req.user && req.user.uid) || 'HDR_UID'),
        role: String(hdrRole || (req.user && req.user.role) || 'moderator')
      };
    }
  } catch (e) {
    // ignore
  }
  next();
});

app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    console.warn('[auth/me] no req.user, unauthorized');
    return res.status(401).json({ ok: false });
  }
  console.log('[auth/me] user:', { uid: req.user.uid, role: req.user.role });
  res.json({ ok: true, uid: req.user.uid, role: req.user.role });
});

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

// Tiny version/info endpoint for quick sanity checks
app.get('/api/version', (req, res) => {
  res.json({
    ok: true,
    name: 'magicmirror-node',
    env: {
      ENABLE_WORKSHEET_SUBMIT: process.env.ENABLE_WORKSHEET_SUBMIT === '1',
      DEV_ENABLE_FAKE_AUTH: process.env.DEV_ENABLE_FAKE_AUTH === '1'
    },
    time: Date.now()
  });
});

app.get('/ws/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim();
    if (!code) return res.status(404).send('Not found');
    if (!admin.apps.length) {
      console.warn('[worksheet shortlink] admin not initialized');
      return res.status(503).send('Service unavailable');
    }
    const snap = await admin.firestore().collection(WORKSHEET_SHORTLINK_COLLECTION).doc(code).get();
    if (!snap.exists) return res.status(404).send('Not found');
    const data = snap.data() || {};
    const target = data.storage_url || data.drive_url || data.target_url || '';
    if (!target) return res.status(404).send('Not found');
    return res.redirect(target);
  } catch (err) {
    console.error('worksheet shortlink redirect error', err);
    return res.status(500).send('Internal error');
  }
});

const replicateProxyAllowedMethods = new Set(['GET', 'POST']);
const hopByHopHeaders = new Set(['transfer-encoding', 'content-length', 'connection', 'keep-alive']);
const replicateBaseForUrl = `${REPLICATE_BASE_URL}/`;

const extractProxySecret = (req) => {
  const headerSecret = req.headers['x-proxy-secret'] || req.headers['x-replicate-proxy-secret'];
  if (headerSecret && typeof headerSecret === 'string') {
    return headerSecret.trim();
  }
  return '';
};

const resolveProxyTarget = (req) => {
  const original = req.originalUrl || '';
  if (!original.startsWith(REPLICATE_PROXY_PREFIX)) {
    return '';
  }
  let suffix = original.slice(REPLICATE_PROXY_PREFIX.length);
  if (!suffix) {
    return '';
  }
  const questionIndex = suffix.indexOf('?');
  const pathPart = questionIndex === -1 ? suffix : suffix.slice(0, questionIndex);
  const queryPart = questionIndex === -1 ? '' : suffix.slice(questionIndex);
  const normalizedPath = pathPart.startsWith('/') ? `/${pathPart.replace(/^\/+/, '')}` : `/${pathPart}`;
  return `${normalizedPath}${queryPart}`;
};

const resolveUpstreamToken = (req) => {
  const headerToken = req.headers['x-replicate-token'] || req.headers['x-replicate-api-token'];
  if (headerToken && typeof headerToken === 'string') {
    const trimmed = headerToken.trim();
    if (trimmed.toLowerCase().startsWith('token ')) {
      return trimmed.slice(6).trim();
    }
    return trimmed;
  }
  return REPLICATE_PROXY_DEFAULT_TOKEN;
};

app.use(REPLICATE_PROXY_PREFIX, async (req, res) => {
  const started = Date.now();
  try {
    if (REPLICATE_PROXY_SECRET) {
      const providedSecret = extractProxySecret(req);
      if (!providedSecret || providedSecret !== REPLICATE_PROXY_SECRET) {
        console.warn('[replicate-proxy] invalid secret', { ip: req.ip });
        return res.status(403).json({ ok: false, error: 'Replicate proxy forbidden' });
      }
    }

    const method = (req.method || 'POST').toUpperCase();
    if (!replicateProxyAllowedMethods.has(method)) {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const suffix = resolveProxyTarget(req);
    if (!suffix) {
      return res.status(400).json({ ok: false, error: 'Target path tidak valid' });
    }
    if (/^\w+:\/\//.test(suffix)) {
      return res.status(400).json({ ok: false, error: 'Target URL tidak diizinkan' });
    }

    let targetUrl;
    try {
      targetUrl = new URL(suffix, replicateBaseForUrl);
    } catch (err) {
      return res.status(400).json({ ok: false, error: 'Gagal membaca target URL' });
    }

    if (!targetUrl.pathname.startsWith('/v1/')) {
      return res.status(400).json({ ok: false, error: 'Path Replicate tidak diizinkan' });
    }

    const upstreamToken = resolveUpstreamToken(req);
    if (!upstreamToken) {
      return res.status(500).json({ ok: false, error: 'Replicate token belum dikonfigurasi di proxy' });
    }

    const headers = {
      Authorization: `Token ${upstreamToken}`,
      Accept: 'application/json',
      'User-Agent': REPLICATE_PROXY_USER_AGENT
    };
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }

    const axiosConfig = {
      method,
      url: targetUrl.toString(),
      headers,
      timeout: REPLICATE_PROXY_TIMEOUT_MS,
      validateStatus: () => true
    };
    if (method !== 'GET') {
      axiosConfig.data = req.body;
    }
    const upstreamResponse = await axios(axiosConfig);

    console.log('[replicate-proxy] forward', {
      path: targetUrl.pathname,
      method,
      status: upstreamResponse.status,
      ms: Date.now() - started
    });

    if (upstreamResponse.status >= 400) {
      console.warn('[replicate-proxy] upstream error body', {
        status: upstreamResponse.status,
        data: upstreamResponse.data
      });
    }

    Object.entries(upstreamResponse.headers || {}).forEach(([key, value]) => {
      if (!key) return;
      if (hopByHopHeaders.has(key.toLowerCase())) return;
      res.setHeader(key, value);
    });

    if (typeof upstreamResponse.data === 'object' && upstreamResponse.data !== null) {
      return res.status(upstreamResponse.status).json(upstreamResponse.data);
    }
    return res.status(upstreamResponse.status).send(upstreamResponse.data);
  } catch (error) {
    console.error('[replicate-proxy] error', {
      message: error?.message,
      ms: Date.now() - started
    });
    if (error?.response) {
      const { status, data } = error.response;
      if (typeof data === 'object' && data !== null) {
        return res.status(status).json(data);
      }
      return res.status(status).send(data);
    }
    return res.status(502).json({ ok: false, error: 'Replicate proxy gagal terhubung' });
  }
});

// === Hair Color API (hair recoloring endpoint bridging UI to Minimax/Replicate) ===
app.post('/api/hair-color', async (req, res) => {
  const started = Date.now();
  const { imageBase64, hex, strength } = req.body || {};
  const rawImage = typeof imageBase64 === 'string' ? imageBase64 : '';
  const sanitizedImage = rawImage.replace(/^data:image\/\w+;base64,/, '').replace(/[\r\n\s]+/g, '');
  let rawHex = typeof hex === 'string' ? hex.trim() : '';
  if (!rawHex.startsWith('#')) rawHex = `#${rawHex}`;
  const normalizedHex = rawHex.toUpperCase();
  const strengthValue = Math.max(0, Math.min(1, Number(strength) || 0));

  if (!sanitizedImage) {
    return res.status(400).json({ ok: false, error: 'imageBase64 wajib diisi' });
  }
  if (!/^#[0-9A-F]{6}$/.test(normalizedHex)) {
    return res.status(400).json({ ok: false, error: 'Format warna harus #RRGGBB' });
  }

  const logMeta = { color: normalizedHex, strength: strengthValue };
  let serviceUsed = 'replicate';
  const timeoutMs = Number(process.env.HAIR_COLOR_TIMEOUT_MS || 120000);

  try {
    console.log('[hair-color] start', logMeta);
    let imageOutBase64;
    const delegateUrl = process.env.HAIR_COLOR_SERVICE_URL;
    if (delegateUrl) {
      serviceUsed = 'delegate';
      const { data } = await axios.post(delegateUrl, {
        imageBase64: sanitizedImage,
        hex: normalizedHex,
        strength: strengthValue
      }, { timeout: timeoutMs });
      const remote = data && (data.imageOutBase64 || data.image_base64 || data.image || data.result);
      if (!remote) {
        throw new Error('Layanan hair color tidak mengembalikan field imageOutBase64');
      }
      imageOutBase64 = String(remote).replace(/^data:image\/\w+;base64,/, '').replace(/[\r\n\s]+/g, '');
    } else {
      imageOutBase64 = await runHairColorViaReplicate(sanitizedImage, normalizedHex, strengthValue);
    }
    console.log('[hair-color] success', { ...logMeta, service: serviceUsed, ms: Date.now() - started });
    res.json({ ok: true, imageOutBase64 });
  } catch (err) {
    const message = err && err.message ? err.message : 'Hair color processing failed';
    console.error('[hair-color] error', { ...logMeta, service: serviceUsed, ms: Date.now() - started, error: message });
    res.status(500).json({ ok: false, error: message });
  }
});

async function postToGAS(tabName, dataArray) {
  const GAS_URL = process.env.WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbynFv8gTnczc7abTL5Olq_sKmf1e0y6w9z_KBTKETK8i6NaGd941Cna4QVnoujoCsMdvA/exec';
  if (!GAS_URL.startsWith('http')) {
    throw new Error('Invalid WEB_APP_URL. Must be absolute URL.');
  }
  console.log(`Mirroring ${tabName} to ${GAS_URL}`);
  const res = await fetch(`${GAS_URL}?action=mirrorData`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tab: tabName, data: dataArray })
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('GAS response is not valid JSON:', text);
    throw new Error('GAS did not return valid JSON');
  }
}

async function postAllToGAS(datasets) {
  const GAS_URL = process.env.WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbynFv8gTnczc7abTL5Olq_sKmf1e0y6w9z_KBTKETK8i6NaGd941Cna4QVnoujoCsMdvA/exec';
  if (!GAS_URL.startsWith('http')) throw new Error('Invalid GAS URL');

  const res = await fetch(`${GAS_URL}?action=mirrorAllData`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ datasets })
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error('Invalid JSON from GAS:', text);
    throw new Error('GAS did not return valid JSON');
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runHairColorViaReplicate(imageBase64, targetHex, strength = 1) {
  const replicateToken = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY;
  if (!replicateToken) {
    throw new Error('REPLICATE_API_TOKEN belum dikonfigurasi');
  }

  const modelSlug = process.env.REPLICATE_HAIR_MODEL || 'minimax/image-01';
  const modelVersion = process.env.REPLICATE_HAIR_VERSION || null;
  const normalizedStrength = Math.max(0, Math.min(1, Number(strength) || 0));
  const guidance = 7.5 + normalizedStrength * 3.5;
  const steps = Math.max(25, Math.round(35 + normalizedStrength * 15));
  const prompt = `Edit this photo: change only the hair color of the person. Do not modify the face, skin, eyes, or background. Target hair color: ${targetHex}. Keep hairstyle, face shape, lighting, and hair texture natural. Ensure realistic blending with highlights and shadows.`;

  const inputPayload = {
    prompt,
    subject_prompt: 'same person, identical facial features, ultra realistic portrait, same background, full head visible',
    subject_reference: `data:image/jpeg;base64,${imageBase64}`,
    negative_prompt: 'different person, changed skin tone, background change, distorted face, text, watermark, artifacts',
    guidance_scale: Number(guidance.toFixed(2)),
    num_inference_steps: steps,
    width: 1024,
    height: 1024
  };

  const headers = {
    Authorization: `Token ${replicateToken}`,
    'Content-Type': 'application/json'
  };

  let prediction;
  if (modelVersion) {
    const { data } = await axios.post('https://api.replicate.com/v1/predictions', {
      version: modelVersion,
      input: inputPayload
    }, { headers, timeout: 120000 });
    prediction = data;
  } else {
    const { data } = await axios.post(`https://api.replicate.com/v1/models/${modelSlug}/predictions`, {
      input: inputPayload
    }, { headers, timeout: 120000 });
    prediction = data;
  }

  const pollUrl = (prediction.urls && prediction.urls.get) || (prediction.id ? `https://api.replicate.com/v1/predictions/${prediction.id}` : null);

  async function downloadOutput(outputList) {
    if (!Array.isArray(outputList) || !outputList.length) {
      throw new Error('Model tidak mengembalikan gambar.');
    }
    const lastUrl = outputList[outputList.length - 1];
    const imgResp = await axios.get(lastUrl, { responseType: 'arraybuffer', timeout: 60000 });
    return Buffer.from(imgResp.data).toString('base64');
  }

  if (prediction.status === 'succeeded') {
    return downloadOutput(prediction.output);
  }

  if (!pollUrl) {
    throw new Error('URL polling Replicate tidak tersedia.');
  }

  let attempts = 0;
  const maxAttempts = 30; // ~60s polling (2s interval)
  while (attempts < maxAttempts) {
    await sleep(2000);
    attempts += 1;
    const { data: pollData } = await axios.get(pollUrl, { headers: { Authorization: `Token ${replicateToken}` }, timeout: 60000 });
    if (pollData.status === 'succeeded') {
      return downloadOutput(pollData.output);
    }
    if (pollData.status === 'failed' || pollData.status === 'canceled') {
      throw new Error(pollData.error || `Replicate gagal dengan status ${pollData.status}`);
    }
    if (pollData.error) {
      throw new Error(typeof pollData.error === 'string' ? pollData.error : JSON.stringify(pollData.error));
    }
  }
  throw new Error('Replicate timeout menunggu hasil hair color.');
}

// POST /api/assign-murid-ke-kelas - assign murid ke kelas/lesson
app.post('/api/assign-murid-ke-kelas', async (req, res) => {
  // Safely extract body fields in case body parsing fails
  const { uid, kelas_id } = req.body || {};
  if (!uid || !kelas_id) {
    return res.status(400).json({ success: false, error: 'Data tidak lengkap' });
  }
  try {
    let targetUid = uid;
    let muridRef = db.collection('murid').doc(targetUid);
    let muridSnap = await muridRef.get();
    // Jika tidak ditemukan, coba cari berdasarkan field cid
    if (!muridSnap.exists) {
      const byCid = await db.collection('murid').where('cid', '==', uid).limit(1).get();
      if (byCid.empty) {
        return res.status(404).json({ success: false, error: 'Murid tidak ditemukan' });
      }
      muridSnap = byCid.docs[0];
      targetUid = muridSnap.id;
      muridRef = db.collection('murid').doc(targetUid);
    }

    // Tambahkan kelas_id ke array akses_lesson murid
    await muridRef.set({
      akses_lesson: admin.firestore.FieldValue.arrayUnion(kelas_id),
      kelas_id
    }, { merge: true });

    // Tambahkan UID ke array murid di kelas
    const kelasRef = db.collection('kelas').doc(kelas_id);
    await kelasRef.set({ kelas_id }, { merge: true });
    await kelasRef.update({
      murid: admin.firestore.FieldValue.arrayUnion(targetUid)
    });

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error assign murid:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

function loadServiceAccountFromEnv() {
  const directJsonCandidates = [
    ['GOOGLE_SERVICE_ACCOUNT_KEY', process.env.GOOGLE_SERVICE_ACCOUNT_KEY],
    ['GOOGLE_SERVICE_ACCOUNT_JSON', process.env.GOOGLE_SERVICE_ACCOUNT_JSON],
    ['SERVICE_ACCOUNT_KEY', process.env.SERVICE_ACCOUNT_KEY],
    ['SERVICE_ACCOUNT_JSON', process.env.SERVICE_ACCOUNT_JSON],
    ['FIREBASE_SERVICE_ACCOUNT_KEY', process.env.FIREBASE_SERVICE_ACCOUNT_KEY],
    ['FIREBASE_SERVICE_ACCOUNT_JSON', process.env.FIREBASE_SERVICE_ACCOUNT_JSON],
    ['FIREBASE_SERVICE_ACCOUNT', process.env.FIREBASE_SERVICE_ACCOUNT]
  ].filter(([, value]) => typeof value === 'string' && value.trim());

  const base64Candidates = [
    ['GOOGLE_SERVICE_ACCOUNT_KEY_BASE64', process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64],
    ['SERVICE_ACCOUNT_KEY_BASE64', process.env.SERVICE_ACCOUNT_KEY_BASE64],
    ['FIREBASE_SERVICE_ACCOUNT_BASE64', process.env.FIREBASE_SERVICE_ACCOUNT_BASE64]
  ].filter(([, value]) => typeof value === 'string' && value.trim());

  const fileCandidates = [
    ['GOOGLE_APPLICATION_CREDENTIALS', process.env.GOOGLE_APPLICATION_CREDENTIALS],
    ['FIREBASE_SERVICE_ACCOUNT_FILE', process.env.FIREBASE_SERVICE_ACCOUNT_FILE],
    ['GOOGLE_SERVICE_ACCOUNT_KEY_PATH', process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH]
  ].filter(([, value]) => typeof value === 'string' && value.trim());

  const attemptedSources = new Set();

  const tryParseJson = (value) => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (_) {
      return null;
    }
  };

  const tryParseBase64Json = (value) => {
    if (!value) return null;
    try {
      const decoded = Buffer.from(value, 'base64').toString('utf8');
      return tryParseJson(decoded.trim());
    } catch (_) {
      return null;
    }
  };

  const normalize = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    const normalized = { ...obj };
    if (typeof normalized.private_key === 'string') {
      normalized.private_key = normalized.private_key
        .replace(/\\n/g, '\n')
        .replace(/\r\n/g, '\n');
    }
    return normalized;
  };

  for (const [name, raw] of directJsonCandidates) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    attemptedSources.add(name);
    let parsed = tryParseJson(trimmed);
    if (!parsed) parsed = tryParseBase64Json(trimmed);
    if (parsed) return normalize(parsed);
  }

  for (const [name, raw] of base64Candidates) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    attemptedSources.add(name);
    const parsed = tryParseBase64Json(trimmed);
    if (parsed) return normalize(parsed);
  }

  for (const [name, raw] of fileCandidates) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    attemptedSources.add(name);
    try {
      if (!fs.existsSync(trimmed)) {
        console.warn(`[admin-init] Service account file path not found for ${name}: ${trimmed}`);
        continue;
      }
      const content = fs.readFileSync(trimmed, 'utf8');
      const parsed = tryParseJson(content);
      if (parsed) return normalize(parsed);
      console.warn(`[admin-init] Service account file from ${name} is not valid JSON`);
    } catch (err) {
      console.error(`[admin-init] Failed reading service account file from ${name}:`, err.message);
    }
  }

  if (attemptedSources.size) {
    console.warn('[admin-init] Service account credentials detected but parsing failed. Checked env:', [...attemptedSources].join(', '));
  }

  return null;
}

// Init Firebase Admin (support GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 or SERVICE_ACCOUNT_KEY_BASE64)
if (!admin.apps.length) {
  try {
    const serviceAccount = loadServiceAccountFromEnv();
    if (serviceAccount) {
      const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id;
      const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.appspot.com` : undefined);
      const initOptions = {
        credential: admin.credential.cert(serviceAccount)
      };
      if (projectId) initOptions.projectId = projectId;
      if (storageBucket) initOptions.storageBucket = storageBucket;

      admin.initializeApp(initOptions);
      console.log('[admin-init] OK project_id=', projectId || '(none)', ' bucket=', storageBucket || '(none)');
      // Quick verify that the bucket exists to avoid "The specified bucket does not exist"
      if (storageBucket) {
        setImmediate(async () => {
          try {
            const b = admin.storage().bucket();
            const [meta] = await b.getMetadata();
            console.log('[storage] bucket verified:', meta.id || meta.name || storageBucket);
          } catch (e) {
            console.error('[storage] verify failed. Check FIREBASE_STORAGE_BUCKET. Expected:', storageBucket, 'Error:', e.message);
          }
        });
      }
    } else {
      console.warn('[admin-init] No SA key provided; initializing with default credentials');
      admin.initializeApp();
    }
  } catch (e) {
    console.error('[admin-init] FAILED:', e.message);
    try { admin.initializeApp(); } catch (_) {}
  }
}

const db = admin.firestore();
// --- BEGIN: Firebase Auth middleware (populate req.user from ID token) ---
async function attachUserFromAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // no bearer token; continue (routes with requireAuth will 401)
      return next();
    }
    const idToken = authHeader.substring('Bearer '.length).trim();
    const decoded = await admin.auth().verifyIdToken(idToken);
    // Attach minimal info consumed by routes
    req.user = Object.assign({}, req.user, {
      uid: decoded.uid,
      email: decoded.email || (decoded.user_id ? undefined : undefined),
      role: (decoded.role) || (decoded.claims && decoded.claims.role) || decoded['role'] || (req.user && req.user.role) || null
    });
    return next();
  } catch (err) {
    // Token invalid/expired => proceed; protected routes will reject
    return next();
  }
}
app.use(attachUserFromAuth);
// --- END: Firebase Auth middleware ---
// ===== Helpers for dashboard overview =====
function startOfDay(ts){ const d = new Date(ts); d.setHours(0,0,0,0); return d.getTime(); }
function daysAgo(n){ const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-n); return d.getTime(); }
function toNumber(x, def=0){ const n = Number(x); return Number.isFinite(n)?n:def; }

app.get('/api/storage-info', async (req, res) => {
  try {
    const bucket = admin.storage().bucket();
    let meta = null;
    try {
      const [m] = await bucket.getMetadata();
      meta = { id: m.id || m.name, location: m.location, storageClass: m.storageClass };
    } catch (e) {
      meta = { error: e.message };
    }
    res.json({
      project_id: admin.app().options.projectId,
      bucket: bucket.name,
      meta
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;

const NAINAI_ADMIN_WA_DEFAULT = '6288972681212';
const NAINAI_DATA_DIR = process.env.NAINAI_DATA_DIR
  ? path.resolve(process.env.NAINAI_DATA_DIR)
  : path.join(__dirname, 'data');
const NAINAI_LEADS_FILE = path.join(NAINAI_DATA_DIR, 'nainai-leads.json');
const NAINAI_CONFIG_FILE = path.join(NAINAI_DATA_DIR, 'nainai-config.json');
const NAINAI_AUTH_FILE = path.join(NAINAI_DATA_DIR, 'nainai-auth.json');
const NAINAI_INVOICES_FILE = path.join(NAINAI_DATA_DIR, 'nainai-invoices.json');
const NAINAI_SHORTLINKS_FILE = path.join(NAINAI_DATA_DIR, 'nainai-shortlinks.json');
const NAINAI_ASSET_DIR = path.join(__dirname, 'public', 'products', 'class', 'cake-bakery-class');
const NAINAI_INVOICE_DIR = path.join(NAINAI_ASSET_DIR, 'invoices');
const NAINAI_LOGO_FILE = path.join(NAINAI_ASSET_DIR, 'logonainai.png');
const NAINAI_PAYMENT_TRANSFER_BANK = 'BCA';
const NAINAI_PAYMENT_TRANSFER_ACCOUNT = '6600419186';
const NAINAI_PAYMENT_TRANSFER_NAME = 'William Susanto';
const NAINAI_PAYMENT_SHOPEE_LINK = 'https://id.shp.ee/JzFf5AA';
const NAINAI_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
const NAINAI_ALLOWED_UPLOAD_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const NAINAI_DEFAULT_CONFIG = {
  heroTitle: 'Rasa rumah, dalam setiap lapis.',
  heroSubtitle: 'Ada Lapis dan Nastar hangat dari dapur Nai Nai, cocok untuk momen keluarga dan hampers.',
  announcement: 'Hari ini open pre-order, bisa request jadwal kirim.',
  adminWhatsapp: NAINAI_ADMIN_WA_DEFAULT,
  lapisSizes: ['10 x 10', '10 x 20', '20 x 20'],
  seasonalLabel: 'Seasonal / Event',
  updatedAt: null
};
const NAINAI_DEFAULT_AUTH = {
  adminPinHash: '',
  adminPinSalt: '',
  adminPinUpdatedAt: null,
  updatedAt: null
};

const NAINAI_ADMIN_PIN_MIN = 4;
const NAINAI_ADMIN_PIN_MAX = 8;
const NAINAI_ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const nainaiAdminSessions = new Map();

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonFileIfValid(filePath, quietMissing = false) {
  try {
    if (!fs.existsSync(filePath)) return { ok: false, reason: 'missing' };
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw || !raw.trim()) return { ok: false, reason: 'empty' };
    const parsed = JSON.parse(raw);
    return { ok: true, value: parsed };
  } catch (err) {
    if (!(quietMissing && err && err.code === 'ENOENT')) {
      console.warn('[nainai] failed reading json', filePath, err.message);
    }
    return { ok: false, reason: 'invalid' };
  }
}

function readJsonSafely(filePath, fallbackValue) {
  const primary = readJsonFileIfValid(filePath);
  if (primary.ok) return primary.value;

  const backupPath = `${filePath}.bak`;
  const backup = readJsonFileIfValid(backupPath, true);
  if (backup.ok) {
    console.warn('[nainai] using backup json file', backupPath);
    return backup.value;
  }
  return fallbackValue;
}

function writeJsonSafely(filePath, value) {
  ensureDirSync(path.dirname(filePath));
  const content = JSON.stringify(value, null, 2);
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempPath, content, 'utf8');
  fs.renameSync(tempPath, filePath);
  try {
    fs.writeFileSync(`${filePath}.bak`, content, 'utf8');
  } catch (err) {
    console.warn('[nainai] failed writing backup json', filePath, err.message);
  }
}

function ensureJsonFile(filePath, defaultValue) {
  if (fs.existsSync(filePath)) return;
  const backupPath = `${filePath}.bak`;
  if (fs.existsSync(backupPath)) {
    try {
      fs.copyFileSync(backupPath, filePath);
      return;
    } catch (err) {
      console.warn('[nainai] failed restoring from backup', backupPath, err.message);
    }
  }
  writeJsonSafely(filePath, defaultValue);
}

function normalizePhone62(rawPhone) {
  let value = String(rawPhone || '').trim().replace(/[^0-9+]/g, '');
  if (!value) return '';
  if (value.startsWith('+')) value = value.slice(1);
  if (value.startsWith('08')) value = `62${value.slice(1)}`;
  else if (value.startsWith('8')) value = `62${value}`;
  else if (!value.startsWith('62')) value = `62${value}`;
  return value;
}

function sanitizeText(value, maxLen = 240) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function sanitizeHex(value, maxLen = 128) {
  const text = String(value || '').trim().toLowerCase();
  if (!/^[a-f0-9]+$/.test(text)) return '';
  return text.slice(0, maxLen);
}

function sanitizeHttpUrl(value, maxLen = 1200) {
  const raw = String(value || '').trim().slice(0, maxLen);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch (_) {
    return '';
  }
}

function nowIso() {
  return new Date().toISOString();
}

function generateNainaiId(prefix = 'nn') {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}

function loadNainaiConfig() {
  const stored = readJsonSafely(NAINAI_CONFIG_FILE, null);
  if (!stored || typeof stored !== 'object') return { ...NAINAI_DEFAULT_CONFIG };
  const cleanStored = { ...stored };
  delete cleanStored.adminPinHash;
  delete cleanStored.adminPinSalt;
  delete cleanStored.adminPinUpdatedAt;
  const lapisSizes = Array.isArray(cleanStored.lapisSizes)
    ? cleanStored.lapisSizes.map((item) => sanitizeText(item, 40)).filter(Boolean)
    : [...NAINAI_DEFAULT_CONFIG.lapisSizes];
  return {
    ...NAINAI_DEFAULT_CONFIG,
    ...cleanStored,
    heroTitle: sanitizeText(cleanStored.heroTitle || NAINAI_DEFAULT_CONFIG.heroTitle, 120),
    heroSubtitle: sanitizeText(cleanStored.heroSubtitle || NAINAI_DEFAULT_CONFIG.heroSubtitle, 420),
    announcement: sanitizeText(cleanStored.announcement || NAINAI_DEFAULT_CONFIG.announcement, 180),
    seasonalLabel: sanitizeText(cleanStored.seasonalLabel || NAINAI_DEFAULT_CONFIG.seasonalLabel, 80),
    adminWhatsapp: normalizePhone62(cleanStored.adminWhatsapp || NAINAI_DEFAULT_CONFIG.adminWhatsapp) || NAINAI_ADMIN_WA_DEFAULT,
    lapisSizes: lapisSizes.length ? lapisSizes : [...NAINAI_DEFAULT_CONFIG.lapisSizes]
  };
}

function saveNainaiConfig(nextConfig) {
  const merged = {
    ...loadNainaiConfig(),
    ...nextConfig,
    updatedAt: nowIso()
  };
  merged.heroTitle = sanitizeText(merged.heroTitle, 120);
  merged.heroSubtitle = sanitizeText(merged.heroSubtitle, 420);
  merged.announcement = sanitizeText(merged.announcement, 180);
  merged.seasonalLabel = sanitizeText(merged.seasonalLabel, 80);
  merged.adminWhatsapp = normalizePhone62(merged.adminWhatsapp) || NAINAI_ADMIN_WA_DEFAULT;
  merged.lapisSizes = Array.isArray(merged.lapisSizes)
    ? merged.lapisSizes.map((item) => sanitizeText(item, 40)).filter(Boolean)
    : [...NAINAI_DEFAULT_CONFIG.lapisSizes];
  if (!merged.lapisSizes.length) merged.lapisSizes = [...NAINAI_DEFAULT_CONFIG.lapisSizes];
  delete merged.adminPinHash;
  delete merged.adminPinSalt;
  delete merged.adminPinUpdatedAt;
  writeJsonSafely(NAINAI_CONFIG_FILE, merged);
  return merged;
}

function normalizeNainaiAuth(rawAuth) {
  const source = rawAuth && typeof rawAuth === 'object' ? rawAuth : {};
  return {
    ...NAINAI_DEFAULT_AUTH,
    adminPinHash: sanitizeHex(source.adminPinHash, 128),
    adminPinSalt: sanitizeHex(source.adminPinSalt, 128),
    adminPinUpdatedAt: source.adminPinUpdatedAt ? String(source.adminPinUpdatedAt).slice(0, 80) : null,
    updatedAt: source.updatedAt ? String(source.updatedAt).slice(0, 80) : null
  };
}

function migrateLegacyNainaiPinFromConfig() {
  const configRaw = readJsonSafely(NAINAI_CONFIG_FILE, null);
  if (!configRaw || typeof configRaw !== 'object') return null;

  const legacyHash = sanitizeHex(configRaw.adminPinHash, 128);
  const legacySalt = sanitizeHex(configRaw.adminPinSalt, 128);
  if (!legacyHash || !legacySalt) return null;

  const migrated = normalizeNainaiAuth({
    adminPinHash: legacyHash,
    adminPinSalt: legacySalt,
    adminPinUpdatedAt: configRaw.adminPinUpdatedAt || nowIso(),
    updatedAt: nowIso()
  });
  writeJsonSafely(NAINAI_AUTH_FILE, migrated);

  const cleanedConfig = { ...configRaw };
  delete cleanedConfig.adminPinHash;
  delete cleanedConfig.adminPinSalt;
  delete cleanedConfig.adminPinUpdatedAt;
  writeJsonSafely(NAINAI_CONFIG_FILE, cleanedConfig);
  return migrated;
}

function loadNainaiAuth() {
  const stored = readJsonSafely(NAINAI_AUTH_FILE, null);
  if (stored && typeof stored === 'object') return normalizeNainaiAuth(stored);
  const migrated = migrateLegacyNainaiPinFromConfig();
  if (migrated) return migrated;
  return { ...NAINAI_DEFAULT_AUTH };
}

function saveNainaiAuth(nextAuth) {
  const merged = {
    ...loadNainaiAuth(),
    ...(nextAuth && typeof nextAuth === 'object' ? nextAuth : {}),
    updatedAt: nowIso()
  };
  const safe = normalizeNainaiAuth(merged);
  safe.updatedAt = merged.updatedAt;
  writeJsonSafely(NAINAI_AUTH_FILE, safe);
  return safe;
}

function loadNainaiLeads() {
  const rows = readJsonSafely(NAINAI_LEADS_FILE, []);
  if (!Array.isArray(rows)) return [];
  return rows;
}

function saveNainaiLeads(rows) {
  const maxRows = 2000;
  const safeRows = Array.isArray(rows) ? rows.slice(-maxRows) : [];
  writeJsonSafely(NAINAI_LEADS_FILE, safeRows);
  return safeRows;
}

function sanitizeMoney(value, max = 1000000000) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(max, Math.round(parsed)));
}

function formatRupiah(value) {
  return `Rp ${sanitizeMoney(value).toLocaleString('id-ID')}`;
}

function buildNainaiAdminInvoiceWhatsappUrl(adminWhatsapp, invoice) {
  const waAdmin = normalizePhone62(adminWhatsapp || '') || NAINAI_ADMIN_WA_DEFAULT;
  const safeInvoice = invoice && typeof invoice === 'object' ? invoice : {};
  const message = [
    'Halo Admin Nai Nai Lapis,',
    'mohon bantu forward invoice ini ke customer:',
    '',
    `Nama Customer: ${sanitizeText(safeInvoice.customerName, 120) || '-'}`,
    `WA Customer: ${normalizePhone62(safeInvoice.customerWhatsapp || '') || '-'}`,
    `No Invoice: ${sanitizeText(safeInvoice.invoiceNumber, 60) || '-'}`,
    `Total: ${formatRupiah(safeInvoice.total || 0)}`,
    '',
    'Pembayaran Transfer:',
    NAINAI_PAYMENT_TRANSFER_BANK,
    `${NAINAI_PAYMENT_TRANSFER_ACCOUNT} (${NAINAI_PAYMENT_TRANSFER_NAME})`,
    `Shopee: ${NAINAI_PAYMENT_SHOPEE_LINK}`,
    '',
    'Preview Invoice: (akan ditambahkan dari dashboard admin)',
    'Terima kasih.'
  ].join('\n');
  return `https://wa.me/${encodeURIComponent(waAdmin)}?text=${encodeURIComponent(message)}`;
}

function sanitizeIsoDate(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
  const time = Date.parse(`${raw}T00:00:00Z`);
  if (Number.isNaN(time)) return '';
  return raw;
}

function loadNainaiInvoices() {
  const rows = readJsonSafely(NAINAI_INVOICES_FILE, []);
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const id = sanitizeText(row.id, 80);
      const invoiceNumber = sanitizeText(row.invoiceNumber, 60);
      const customerName = sanitizeText(row.customerName, 120);
      const customerWhatsapp = normalizePhone62(row.customerWhatsapp || '');
      const customerAddress = sanitizeText(row.customerAddress, 220);
      const orderDate = sanitizeIsoDate(row.orderDate || '');
      const notes = sanitizeText(row.notes, 500);
      const items = normalizeInvoiceItems(row.items);
      const pdfUrl = sanitizeHttpUrl(row.pdfUrl, 1200) || sanitizeText(row.pdfPath, 240);
      if (!id || !invoiceNumber || !customerName || !customerWhatsapp || !pdfUrl) return null;
      return {
        ...row,
        id,
        invoiceNumber,
        customerName,
        customerWhatsapp,
        customerAddress,
        orderDate,
        dueDate: sanitizeIsoDate(row.dueDate || ''),
        notes,
        items,
        pdfUrl,
        subtotal: sanitizeMoney(row.subtotal),
        discount: sanitizeMoney(row.discount),
        shipping: sanitizeMoney(row.shipping),
        total: sanitizeMoney(row.total),
        createdAt: row.createdAt ? String(row.createdAt) : nowIso(),
        updatedAt: row.updatedAt ? String(row.updatedAt) : null
      };
    })
    .filter(Boolean);
}

function saveNainaiInvoices(rows) {
  const maxRows = 5000;
  const safeRows = Array.isArray(rows) ? rows.slice(-maxRows) : [];
  writeJsonSafely(NAINAI_INVOICES_FILE, safeRows);
  return safeRows;
}

function buildNainaiInvoiceNumber(existingRows, date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const prefix = `NNL-${year}${month}${day}-`;
  let maxSeq = 0;

  (existingRows || []).forEach((row) => {
    const value = String((row && row.invoiceNumber) || '');
    if (!value.startsWith(prefix)) return;
    const seq = Number(value.slice(prefix.length));
    if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
  });

  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

function normalizeInvoiceItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map((raw) => {
      const product = sanitizeText(raw && raw.product, 60);
      const size = sanitizeText(raw && raw.size, 40);
      const notes = sanitizeText(raw && raw.notes, 140);
      const qtyRaw = Math.round(toNumber(raw && raw.qty, 0));
      const qty = Math.max(1, Math.min(999, qtyRaw));
      const unitPrice = sanitizeMoney(raw && raw.unitPrice);
      if (!product) return null;
      if (!Number.isFinite(qty) || qty <= 0) return null;
      if (!Number.isFinite(unitPrice) || unitPrice < 0) return null;
      return {
        product,
        size,
        notes,
        qty,
        unitPrice,
        lineTotal: sanitizeMoney(qty * unitPrice)
      };
    })
    .filter(Boolean)
    .slice(0, 40);
}

function createNainaiInvoicePdf(invoice, absPath) {
  return new Promise((resolve, reject) => {
    if (!PDFDocument) {
      reject(new Error('Dependency pdfkit belum terpasang di server.'));
      return;
    }

    ensureDirSync(path.dirname(absPath));
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const out = fs.createWriteStream(absPath);
    let finished = false;

    const fail = (err) => {
      if (finished) return;
      finished = true;
      reject(err);
    };

    out.on('finish', () => {
      if (finished) return;
      finished = true;
      resolve();
    });
    out.on('error', fail);
    doc.on('error', fail);
    doc.pipe(out);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const tableX = 40;
    const tableW = pageWidth - 80;
    const dueDate = sanitizeIsoDate(invoice.dueDate || '');

    const cols = {
      item: { x: tableX + 12, w: 220 },
      qty: { x: tableX + 240, w: 52 },
      price: { x: tableX + 298, w: 98 },
      subtotal: { x: tableX + 402, w: 142 }
    };

    const drawPageBackground = () => {
      doc.save();
      doc.rect(0, 0, pageWidth, pageHeight).fill('#fff9f2');
      doc.restore();
    };

    const drawFooter = () => {
      doc.fillColor('#5a3425').font('Helvetica-Oblique').fontSize(10).text(
        'Terima kasih sudah order di Nai Nai Lapis. Semoga setiap lapisan membawa cerita manis untuk harimu.',
        40,
        pageHeight - 66,
        { width: tableW, align: 'center' }
      );
    };

    const drawTableHeader = (yPos) => {
      doc.roundedRect(tableX, yPos, tableW, 30, 10).fill('#f2ddbb');
      doc.fillColor('#4b2e21').font('Helvetica-Bold').fontSize(10).text('Item', cols.item.x, yPos + 10, { width: cols.item.w });
      doc.text('Qty', cols.qty.x, yPos + 10, { width: cols.qty.w, align: 'center' });
      doc.text('Harga', cols.price.x, yPos + 10, { width: cols.price.w, align: 'right' });
      doc.text('Subtotal', cols.subtotal.x, yPos + 10, { width: cols.subtotal.w, align: 'right' });
      return yPos + 38;
    };

    drawPageBackground();
    doc.rect(0, 0, pageWidth, 164).fill('#2b1b14');
    doc.rect(0, 156, pageWidth, 8).fill('#c98b2b');

    if (fs.existsSync(NAINAI_LOGO_FILE)) {
      try {
        const logoBox = { x: 36, y: 24, w: 98, h: 98 };
        const openedLogo = doc.openImage(NAINAI_LOGO_FILE);
        if (openedLogo && openedLogo.width && openedLogo.height) {
          const ratio = openedLogo.width / openedLogo.height;
          let drawW = logoBox.w;
          let drawH = drawW / ratio;
          if (drawH > logoBox.h) {
            drawH = logoBox.h;
            drawW = drawH * ratio;
          }
          const drawX = logoBox.x + ((logoBox.w - drawW) / 2);
          const drawY = logoBox.y + ((logoBox.h - drawH) / 2);
          doc.image(NAINAI_LOGO_FILE, drawX, drawY, { width: drawW, height: drawH });
        } else {
          doc.image(NAINAI_LOGO_FILE, logoBox.x, logoBox.y, { fit: [logoBox.w, logoBox.h], align: 'center', valign: 'center' });
        }
      } catch (_) {
        // ignore logo draw errors
      }
    }

    doc.fillColor('#fff3e6').font('Helvetica-Bold').fontSize(31).text('INVOICE', 150, 36);
    doc.font('Helvetica').fontSize(11).text('Nai Nai Lapis', 150, 76);
    doc.fontSize(10).text('Lapis & Nastar Premium', 150, 92);

    let metaY = 38;
    doc.fillColor('#fff3e6').font('Helvetica-Bold').fontSize(10).text(`No Invoice: ${invoice.invoiceNumber}`, 320, metaY, { width: 236, align: 'right' });
    metaY += 18;
    doc.font('Helvetica').text(`Tanggal: ${invoice.orderDate || '-'}`, 320, metaY, { width: 236, align: 'right' });
    metaY += 18;
    if (dueDate) {
      doc.text(`Jatuh Tempo: ${dueDate}`, 320, metaY, { width: 236, align: 'right' });
      metaY += 18;
    }
    doc.text(`WhatsApp: ${invoice.customerWhatsapp}`, 320, metaY, { width: 236, align: 'right' });

    // Customer card
    doc.roundedRect(40, 184, 250, 128, 12).fill('#fff3df');
    doc.strokeColor('#d8b98a').lineWidth(1).roundedRect(40, 184, 250, 128, 12).stroke();
    doc.fillColor('#5a3425').font('Helvetica-Bold').fontSize(11).text('Invoice Untuk', 56, 200);
    doc.fillColor('#2b1b14').font('Helvetica-Bold').fontSize(15).text(invoice.customerName, 56, 218, { width: 220 });
    doc.font('Helvetica').fontSize(10).fillColor('#3d2a1f').text(invoice.customerWhatsapp, 56, 242, { width: 220 });
    doc.text(invoice.customerAddress || '-', 56, 258, { width: 220, lineGap: 2, height: 50 });

    // Merchant card
    doc.roundedRect(305, 184, 250, 128, 12).fill('#fffef9');
    doc.strokeColor('#d8b98a').lineWidth(1).roundedRect(305, 184, 250, 128, 12).stroke();
    doc.fillColor('#5a3425').font('Helvetica-Bold').fontSize(11).text('Dari', 321, 200);
    doc.fillColor('#2b1b14').font('Helvetica-Bold').fontSize(14).text('Nai Nai Lapis', 321, 218);
    doc.font('Helvetica').fontSize(10).fillColor('#3d2a1f').text('Kue Lapis & Nastar', 321, 238);
    doc.text('Terima kasih sudah mempercayakan momen manismu kepada kami.', 321, 254, { width: 220, lineGap: 2 });

    let y = drawTableHeader(332);
    doc.strokeColor('#e1caa2').lineWidth(1);

    const ensureSpace = (neededHeight) => {
      if (y + neededHeight <= pageHeight - 180) return;
      drawFooter();
      doc.addPage();
      drawPageBackground();
      doc.fillColor('#2b1b14').font('Helvetica-Bold').fontSize(14).text(`Invoice ${invoice.invoiceNumber} (Lanjutan)`, tableX, 28);
      y = drawTableHeader(56);
    };

    (invoice.items || []).forEach((item, idx) => {
      const title = item.size ? `${item.product} (${item.size})` : item.product;
      const notes = item.notes ? `Catatan: ${item.notes}` : '';

      doc.font('Helvetica-Bold').fontSize(9);
      const titleHeight = doc.heightOfString(title, { width: cols.item.w, align: 'left' });
      let notesHeight = 0;
      if (notes) {
        doc.font('Helvetica').fontSize(8);
        notesHeight = doc.heightOfString(notes, { width: cols.item.w, align: 'left' });
      }

      const rowHeight = Math.max(30, Math.ceil(8 + titleHeight + (notes ? notesHeight + 4 : 0) + 8));
      ensureSpace(rowHeight + 8);

      const bg = idx % 2 === 0 ? '#fffef9' : '#fff8ec';
      doc.rect(tableX, y, tableW, rowHeight).fill(bg);
      doc.strokeColor('#efddc0').rect(tableX, y, tableW, rowHeight).stroke();

      doc.fillColor('#2f1f17').font('Helvetica-Bold').fontSize(9).text(title, cols.item.x, y + 7, { width: cols.item.w, lineGap: 1 });
      if (notes) {
        doc.font('Helvetica').fontSize(8).fillColor('#6a4b3a').text(notes, cols.item.x, y + 10 + titleHeight, { width: cols.item.w, lineGap: 1 });
      }

      const centerY = y + Math.max(8, (rowHeight - 12) / 2);
      doc.fillColor('#2f1f17').font('Helvetica').fontSize(9).text(String(item.qty), cols.qty.x, centerY, { width: cols.qty.w, align: 'center' });
      doc.text(formatRupiah(item.unitPrice), cols.price.x, centerY, { width: cols.price.w, align: 'right' });
      doc.font('Helvetica-Bold').text(formatRupiah(item.lineTotal), cols.subtotal.x, centerY, { width: cols.subtotal.w, align: 'right' });

      y += rowHeight;
    });

    y += 18;
    const summaryW = 240;
    const summaryH = 124;
    const summaryX = tableX + tableW - summaryW;
    if (y + summaryH > pageHeight - 170) {
      drawFooter();
      doc.addPage();
      drawPageBackground();
      y = 56;
    }

    doc.roundedRect(summaryX, y, summaryW, summaryH, 12).fill('#fff3df');
    doc.strokeColor('#d8b98a').lineWidth(1).roundedRect(summaryX, y, summaryW, summaryH, 12).stroke();

    const summaryLabelX = summaryX + 14;
    const summaryValueW = summaryW - 28;
    doc.fillColor('#5a3425').font('Helvetica').fontSize(10).text('Subtotal', summaryLabelX, y + 18);
    doc.text(formatRupiah(invoice.subtotal), summaryLabelX, y + 18, { width: summaryValueW, align: 'right' });
    doc.text('Diskon', summaryLabelX, y + 40);
    doc.text(`- ${formatRupiah(invoice.discount)}`, summaryLabelX, y + 40, { width: summaryValueW, align: 'right' });
    doc.text('Ongkir', summaryLabelX, y + 62);
    doc.text(formatRupiah(invoice.shipping), summaryLabelX, y + 62, { width: summaryValueW, align: 'right' });
    doc.moveTo(summaryLabelX, y + 86).lineTo(summaryX + summaryW - 14, y + 86).strokeColor('#c89b54').lineWidth(1).stroke();
    doc.fillColor('#2b1b14').font('Helvetica-Bold').fontSize(12).text('Total', summaryLabelX, y + 94);
    doc.text(formatRupiah(invoice.total), summaryLabelX, y + 94, { width: summaryValueW, align: 'right' });

    const paymentBoxH = 118;
    let sectionY = y + summaryH + 16;
    if (sectionY + paymentBoxH > pageHeight - 120) {
      drawFooter();
      doc.addPage();
      drawPageBackground();
      sectionY = 56;
    }

    doc.roundedRect(40, sectionY, tableW, paymentBoxH, 10).fill('#fffef9');
    doc.strokeColor('#e6d2ae').lineWidth(1).roundedRect(40, sectionY, tableW, paymentBoxH, 10).stroke();
    doc.fillColor('#5a3425').font('Helvetica-Bold').fontSize(10).text('Pembayaran', 52, sectionY + 12);
    doc.fillColor('#2b1b14').font('Helvetica-Bold').fontSize(10).text('Transfer Bank', 52, sectionY + 30);
    doc.fillColor('#4a3125').font('Helvetica').fontSize(9).text(`Bank: ${NAINAI_PAYMENT_TRANSFER_BANK}`, 52, sectionY + 46);
    doc.text(`No. Rekening: ${NAINAI_PAYMENT_TRANSFER_ACCOUNT}`, 52, sectionY + 61);
    doc.text(`Atas Nama: ${NAINAI_PAYMENT_TRANSFER_NAME}`, 52, sectionY + 76);
    doc.fillColor('#2b1b14').font('Helvetica-Bold').text('Shopee', 330, sectionY + 30);
    doc.fillColor('#8b4f31').font('Helvetica').text(NAINAI_PAYMENT_SHOPEE_LINK, 330, sectionY + 46, {
      width: 240,
      underline: true,
      link: NAINAI_PAYMENT_SHOPEE_LINK
    });

    if (invoice.notes) {
      const notesWidth = tableW - 24;
      doc.font('Helvetica').fontSize(9);
      const notesBodyH = doc.heightOfString(invoice.notes, { width: notesWidth, lineGap: 2 });
      const notesBoxH = Math.min(160, Math.max(76, notesBodyH + 36));
      let notesY = sectionY + paymentBoxH + 16;
      if (notesY + notesBoxH > pageHeight - 120) {
        drawFooter();
        doc.addPage();
        drawPageBackground();
        notesY = 56;
      }
      doc.roundedRect(40, notesY, tableW, notesBoxH, 10).fill('#fffef9');
      doc.strokeColor('#e6d2ae').lineWidth(1).roundedRect(40, notesY, tableW, notesBoxH, 10).stroke();
      doc.fillColor('#5a3425').font('Helvetica-Bold').fontSize(10).text('Catatan Order', 52, notesY + 12);
      doc.font('Helvetica').fontSize(9).fillColor('#4a3125').text(invoice.notes, 52, notesY + 28, { width: notesWidth, lineGap: 2 });
    }

    drawFooter();

    doc.end();
  });
}

function sanitizeShortCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}

function loadNainaiShortlinks() {
  const rows = readJsonSafely(NAINAI_SHORTLINKS_FILE, []);
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const safeCode = sanitizeShortCode(row && row.code);
      const safeTarget = sanitizeHttpUrl(row && row.targetUrl);
      if (!safeCode || !safeTarget) return null;
      return {
        code: safeCode,
        targetUrl: safeTarget,
        createdAt: row && row.createdAt ? String(row.createdAt) : nowIso(),
        createdBy: sanitizeText((row && row.createdBy) || 'nainai-admin', 80),
        updatedAt: row && row.updatedAt ? String(row.updatedAt) : undefined
      };
    })
    .filter(Boolean);
}

function saveNainaiShortlinks(rows) {
  const maxRows = 5000;
  const safeRows = Array.isArray(rows) ? rows.slice(-maxRows) : [];
  writeJsonSafely(NAINAI_SHORTLINKS_FILE, safeRows);
  return safeRows;
}

function pickUniqueNainaiShortCode(existingCodeSet) {
  for (let i = 0; i < 16; i += 1) {
    const code = sanitizeShortCode(`nn${crypto.randomBytes(3).toString('hex')}`);
    if (code && !existingCodeSet.has(code)) return code;
  }
  return '';
}

function buildPublicBaseUrl(req) {
  const host = (req.get && req.get('host')) || req.headers.host || '';
  const forwarded = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwarded || req.protocol || 'https';
  if (!host) return '';
  return `${proto}://${host}`;
}

function toNainaiShortlinkPayload(entry, req) {
  const baseUrl = buildPublicBaseUrl(req);
  const code = sanitizeShortCode(entry && entry.code);
  return {
    code,
    targetUrl: sanitizeHttpUrl(entry && entry.targetUrl),
    shortUrl: baseUrl ? `${baseUrl}/nl/${encodeURIComponent(code)}` : `/nl/${encodeURIComponent(code)}`,
    createdAt: entry && entry.createdAt ? String(entry.createdAt) : null,
    createdBy: sanitizeText((entry && entry.createdBy) || 'nainai-admin', 80),
    updatedAt: entry && entry.updatedAt ? String(entry.updatedAt) : null
  };
}

function toPublicNainaiConfig(config) {
  const safe = { ...(config || {}) };
  delete safe.adminPinHash;
  delete safe.adminPinSalt;
  return safe;
}

function isNainaiPinInitialized(config) {
  const current = config || loadNainaiAuth();
  return Boolean(current && current.adminPinHash && current.adminPinSalt);
}

function isValidNainaiPin(pin) {
  return /^[0-9]+$/.test(String(pin || '')) &&
    String(pin).length >= NAINAI_ADMIN_PIN_MIN &&
    String(pin).length <= NAINAI_ADMIN_PIN_MAX;
}

function hashNainaiPin(pin, salt) {
  return crypto.pbkdf2Sync(String(pin), String(salt), 120000, 32, 'sha256').toString('hex');
}

function verifyNainaiPin(pin, config) {
  const current = config || loadNainaiAuth();
  if (!isNainaiPinInitialized(current)) return false;
  const hashed = hashNainaiPin(pin, current.adminPinSalt);
  return hashed === current.adminPinHash;
}

function setNainaiPin(nextPin) {
  const pin = String(nextPin || '').trim();
  if (!isValidNainaiPin(pin)) {
    throw new Error(`PIN harus ${NAINAI_ADMIN_PIN_MIN}-${NAINAI_ADMIN_PIN_MAX} digit angka`);
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashNainaiPin(pin, salt);
  const auth = saveNainaiAuth({
    adminPinHash: hash,
    adminPinSalt: salt,
    adminPinUpdatedAt: nowIso()
  });
  nainaiAdminSessions.clear();
  return auth;
}

function cleanupNainaiAdminSessions() {
  const now = Date.now();
  for (const [token, value] of nainaiAdminSessions.entries()) {
    if (!value || !value.expiresAt || value.expiresAt <= now) {
      nainaiAdminSessions.delete(token);
    }
  }
}

function createNainaiAdminSession(meta = {}) {
  cleanupNainaiAdminSessions();
  const now = Date.now();
  const token = crypto.randomBytes(24).toString('hex');
  const session = {
    token,
    createdAt: now,
    expiresAt: now + NAINAI_ADMIN_SESSION_TTL_MS,
    ...meta
  };
  nainaiAdminSessions.set(token, session);
  return session;
}

function getNainaiAdminTokenFromRequest(req) {
  const headerToken = req.headers['x-nainai-admin-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) return headerToken.trim();
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return '';
}

function requireNainaiAdmin(req, res, next) {
  cleanupNainaiAdminSessions();
  const token = getNainaiAdminTokenFromRequest(req);
  if (!token) return res.status(401).json({ ok: false, error: 'PIN admin diperlukan' });
  const session = nainaiAdminSessions.get(token);
  if (!session || !session.expiresAt || session.expiresAt <= Date.now()) {
    if (token) nainaiAdminSessions.delete(token);
    return res.status(401).json({ ok: false, error: 'Sesi admin tidak valid atau kadaluarsa' });
  }
  req.nainaiAdminSession = session;
  req.nainaiAdminToken = token;
  return next();
}

function listNainaiAssets() {
  ensureDirSync(NAINAI_ASSET_DIR);
  return fs.readdirSync(NAINAI_ASSET_DIR)
    .filter((name) => NAINAI_ALLOWED_UPLOAD_EXT.has(path.extname(name).toLowerCase()))
    .map((name) => {
      const abs = path.join(NAINAI_ASSET_DIR, name);
      const stat = fs.statSync(abs);
      return {
        name,
        size: stat.size,
        updatedAt: stat.mtime.toISOString(),
        url: `/products/class/cake-bakery-class/${encodeURIComponent(name)}`
      };
    })
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function resolveNainaiAssetPath(rawName) {
  let decoded = String(rawName || '').trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch (_) {
    // keep raw input
  }
  const baseName = path.basename(decoded).trim();
  const ext = path.extname(baseName).toLowerCase();
  if (!baseName) return null;
  if (!NAINAI_ALLOWED_UPLOAD_EXT.has(ext)) return null;
  return {
    name: baseName,
    absPath: path.join(NAINAI_ASSET_DIR, baseName)
  };
}

function resolveNainaiInvoicePdfPath(rawPathOrUrl, fallbackInvoiceNumber = 'invoice') {
  let raw = String(rawPathOrUrl || '').trim();
  if (raw) {
    try {
      const parsed = new URL(raw);
      raw = parsed.pathname || '';
    } catch (_) {
      // keep original input
    }
    try {
      raw = decodeURIComponent(raw);
    } catch (_) {
      // keep raw input
    }
    const baseName = path.basename(raw).trim();
    if (baseName && path.extname(baseName).toLowerCase() === '.pdf') {
      return {
        name: baseName,
        absPath: path.join(NAINAI_INVOICE_DIR, baseName),
        urlPath: `/products/class/cake-bakery-class/invoices/${encodeURIComponent(baseName)}`
      };
    }
  }

  const slug = sanitizeText(fallbackInvoiceNumber, 60)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'invoice';
  const fallbackName = `${slug}.pdf`;
  return {
    name: fallbackName,
    absPath: path.join(NAINAI_INVOICE_DIR, fallbackName),
    urlPath: `/products/class/cake-bakery-class/invoices/${encodeURIComponent(fallbackName)}`
  };
}

function bootstrapNainaiStorage() {
  ensureDirSync(NAINAI_DATA_DIR);
  ensureDirSync(NAINAI_ASSET_DIR);
  ensureDirSync(NAINAI_INVOICE_DIR);
  ensureJsonFile(NAINAI_CONFIG_FILE, { ...NAINAI_DEFAULT_CONFIG, updatedAt: nowIso() });
  ensureJsonFile(NAINAI_LEADS_FILE, []);
  ensureJsonFile(NAINAI_INVOICES_FILE, []);
  ensureJsonFile(NAINAI_SHORTLINKS_FILE, []);

  if (!fs.existsSync(NAINAI_AUTH_FILE)) {
    const migratedAuth = migrateLegacyNainaiPinFromConfig();
    if (!migratedAuth) {
      ensureJsonFile(NAINAI_AUTH_FILE, { ...NAINAI_DEFAULT_AUTH, updatedAt: nowIso() });
    }
  }
}

bootstrapNainaiStorage();
setInterval(cleanupNainaiAdminSessions, 60 * 1000);

const nainaiMulterStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureDirSync(NAINAI_ASSET_DIR);
    cb(null, NAINAI_ASSET_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const rawBase = path.basename(file.originalname || 'asset', ext);
    const safeBase = sanitizeText(rawBase.replace(/[^a-zA-Z0-9 _-]/g, ''), 60)
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'asset';
    cb(null, `${safeBase}${ext}`);
  }
});

const nainaiUpload = multer({
  storage: nainaiMulterStorage,
  limits: { fileSize: NAINAI_UPLOAD_MAX_BYTES },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!NAINAI_ALLOWED_UPLOAD_EXT.has(ext)) {
      return cb(new Error('Format file tidak didukung. Gunakan PNG/JPG/JPEG/WEBP.'));
    }
    return cb(null, true);
  }
});

async function getClassList() {
  const snap = await db.collection('kelas').get();
  if (snap.empty) return [];
  return snap.docs.map(d => {
    const val = d.data();
    return {
      kelas_id: val.kelas_id || d.id,
      nama_kelas: val.nama_kelas || '',
      guru_id: val.guru_id || '',
      jumlah_murid: Array.isArray(val.murid) ? val.murid.length : 0
    };
  });
}

async function getLessonsList() {
  const snap = await db.collection('lessons').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getProgressMurid() {
  const muridSnap = await db.collection('progress_murid').get();
  const hasil = [];
  for (const doc of muridSnap.docs) {
    const cid = doc.id;
    const profilSnap = await db.collection('murid').doc(cid).get();
    const nama = profilSnap.exists ? (profilSnap.data().nama || '') : '';
    const kelas_id = profilSnap.exists ? (profilSnap.data().kelas_id || '-') : '-';

    const lessonsSnap = await db.collection('progress_murid').doc(cid).collection('lessons').get();
    const total = lessonsSnap.size;
    const selesai = lessonsSnap.docs.filter(l => l.data().status === 'selesai').length;
    const status = total === 0 ? 'Belum mulai' : (selesai === total ? 'Selesai semua' : 'Aktif');
    const percent = total > 0 ? Math.round((selesai / total) * 100) : 0;

    hasil.push({ cid, nama, kelas_id, total_lesson: total, progress_percent: percent, status });
  }
  return hasil;
}

async function getAllStudentWorks() {
  const hasilGabung = [];
  const quizSnap = await db.collection('lesson_results').get();

  for (const doc of quizSnap.docs) {
    const data = doc.data();
    const cid = data.cid;
    const lesson = data.lesson;
    const nama = data.nama || '';
    const quiz_teori = data.quiz_teori ?? '-';
    const quiz_praktek = data.quiz_praktek ?? '-';
    const timestamp = data.timestamp ?? null;

    let judul = '-', link = '-', tipe = '-', status = '-';
    try {
      const karyaRef = await db.collection('karya_anak').doc(cid).collection('lesson').doc(lesson).get();
      if (karyaRef.exists) {
        const karyaData = karyaRef.data();
        judul = karyaData.judul || '-';
        link = karyaData.link || '-';
        tipe = karyaData.tipe || '-';
        status = karyaData.status || '-';
      }
    } catch (e) {
      console.warn(`❗ Tidak ada karya untuk ${cid} - ${lesson}`);
    }

    hasilGabung.push({ cid, nama, lesson, judul, link, tipe, quiz_teori, quiz_praktek, timestamp, status });
  }

  return hasilGabung;
}

async function getActivityReports() {
  const snap = await db.collection('activity_logs').get();
  return snap.docs.map(d => {
    const val = d.data();
    return {
      cid: val.cid || '',
      nama: val.nama || '',
      lesson: val.lesson || '',
      timestamp: val.timestamp || null,
      aktivitas: val.aktivitas || '',
      quiz_score: val.quiz_score ?? null,
      link: val.link || ''
    };
  });
}

async function getBadges() {
  const snap = await db.collection('badges').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getRewardHistory() {
  const snap = await db.collection('reward_history').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Static assets and additional routers
app.use('/generated_lessons', express.static(path.join(__dirname, '..', 'generated_lessons')));
app.use(uploadModulRouter);
app.use('/api/worksheet', require('./server/worksheet/submit'));
app.use('/api/worksheet', require('./server/worksheet/log'));


// Points system routes
const pointsRoutes = require('./routes/points');
app.use('/api/points', pointsRoutes);
app.use('/api/mod/points', pointsRoutes.modRouter);

// Auto cache-bust for worksheet-submit.js without editing all HTML pages
app.get('/elearn/common/worksheet-submit.js', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'public', 'elearn', 'common', 'worksheet-submit.js');
    // If no version param, redirect to versioned URL using file mtime
    if (!('v' in req.query)) {
      const st = fs.statSync(filePath);
      const ver = Math.floor(st.mtimeMs || Date.now());
      return res.redirect(302, `/elearn/common/worksheet-submit.js?v=${ver}`);
    }
    // Serve the actual file with strong no-cache headers
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.sendFile(filePath);
  } catch (e) {
    console.error('serve worksheet-submit.js failed', e);
    res.status(500).send('// failed to serve worksheet-submit.js');
  }
});

app.get('/api/mirror-all', async (req, res) => {
  try {
    const datasets = [];
    datasets.push({ tab: 'EL_CLASS_LIST', data: await getClassList() });
    datasets.push({ tab: 'EL_LESSONS_LIST', data: await getLessonsList() });
    datasets.push({ tab: 'EL_STUDENT_PROGRESS', data: await getProgressMurid() });
    datasets.push({ tab: 'EL_STUDENT_WORKS', data: await getAllStudentWorks() });
    datasets.push({ tab: 'EL_ACTIVITY_REPORTS', data: await getActivityReports() });
    datasets.push({ tab: 'EL_BADGES', data: await getBadges() });
    datasets.push({ tab: 'EL_REWARD_HISTORY', data: await getRewardHistory() });

    const result = await postAllToGAS(datasets);
    res.json(result);
  } catch (err) {
    console.error('Mirror all data failed:', err);
    res.status(500).json({ error: 'Mirror all data failed', message: err.message });
  }
});

app.get('/api/mirror-login-data', async (req, res) => {
  try {
    const snapshot = await db.collection('akun').get();
    const dataArray = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      dataArray.push({
        cid: data.cid || '',
        uid: doc.id,
        nama: data.nama || '',
        email: data.email || '',
        kelas_id: data.kelas_id || '',
        role: data.role || ''
      });
    });
    const result = await postToGAS('EL_MASTER_USER', dataArray);
    res.json(result);
  } catch (err) {
    console.error('Mirror login data gagal:', err);
    res.status(500).json({ error: 'Mirror login data gagal', message: err.message });
  }
});

async function verifyRecaptcha(req, res, next) {
  const token = req.body["g-recaptcha-response"];
  if (!token || token.length < 20) {
    return res.status(403).json({ success: false, error: "Token CAPTCHA tidak valid" });
  }
  try {
    const secret = process.env.RECAPTCHA_SECRET;
    const gRes = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      { params: { secret, response: token } }
    );
    if (gRes.data.success && gRes.data.score >= 0.5) {
      return next();
    }
    return res.status(403).json({ success: false, error: "Verifikasi CAPTCHA gagal atau skor terlalu rendah" });
  } catch (err) {
    console.error("reCAPTCHA verify error:", err?.response?.data || err.message);
    return res.status(403).json({ success: false, error: "Verifikasi CAPTCHA gagal" });
  }
}

// Endpoint: Sinkronisasi data Form Responses 1 ke PROFILE_ANAK berdasarkan CID
app.get("/sync-profile-anak", async (req, res) => {
  const { google } = require("googleapis");
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });
  const spreadsheetId = process.env.SPREADSHEET_ID;

  try {
    // Ambil semua data dari Form Responses 1
    const formDataRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Form Responses 1!A1:Z",
    });
    const formRows = formDataRes.data.values;
    const formHeaders = formRows[0];
    const formData = formRows.slice(1);

    const cidCol = formHeaders.findIndex(h => h.toLowerCase().includes("cid"));
    const namaCol = formHeaders.findIndex(h => h.toLowerCase().includes("nama anak"));
    const usiaCol = formHeaders.findIndex(h => h.toLowerCase().includes("usia"));
    const waCol = formHeaders.findIndex(h => h.toLowerCase().includes("wa"));

    if (cidCol === -1 || namaCol === -1 || usiaCol === -1 || waCol === -1) {
      return res.status(400).json({ success: false, message: "Header tidak lengkap di Form Responses 1" });
    }

    const profileRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "PROFILE_ANAK!A1:Z",
    });
    const profileRows = profileRes.data.values;
    const profileHeaders = profileRows[0];
    const existingCIDs = new Set(profileRows.slice(1).map(row => row[0]));

    const newRows = [];

    formData.forEach(row => {
      const cid = row[cidCol];
      if (cid && !existingCIDs.has(cid)) {
        const nama = row[namaCol];
        const usia = row[usiaCol];
        const wa = row[waCol];
        newRows.push([cid, nama, usia, "", wa, "cerdas123"]); // foto: kosong, password default
      }
    });

    if (newRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "PROFILE_ANAK!A1",
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: newRows },
      });
    }

    res.json({ success: true, inserted: newRows.length });
  } catch (err) {
    console.error("❌ Sync error:", err);
    res.status(500).json({ success: false, message: "Sync error." });
  }
});
// Endpoint: kirim link reset password ke WhatsApp via Whacenter
app.get("/reset-password", async (req, res) => {
  const { whatsapp } = req.query;
  if (!whatsapp) return res.status(400).json({ success: false, message: "Nomor WhatsApp kosong." });

  try {
    const sheetData = await getProfileAnakData();
    const user = sheetData.find(row => row.whatsapp.replace(/\s+/g, '') === whatsapp);

    if (!user || !user.cid) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan." });
    }

    const cid = user.cid;
    const message = `📌 Halo! Ini link untuk reset password dashboard anak Anda:\n\nhttps://queensacademy.id/login.html?cid=${cid}\n\nGunakan password default: *cerdas123* untuk login kembali, lalu segera ubah password Anda.`;

    await axios.post("https://app.whacenter.com/api/send", {
      device_id: process.env.WHACENTER_DEVICE,
      phone: "62" + whatsapp.replace(/^0/, ""), // ubah 08xxx → 628xxx
      message
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Gagal kirim reset password:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});
// Endpoint: ganti password user
app.post("/ganti-password", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password || password.length < 6) {
    return res.status(400).json({ success: false, message: "Data tidak valid." });
  }

  try {
    // Ambil data sheet
    const sheetData = await getProfileAnakData();

    // Temukan index dari user yang cocok
    const userIndex = sheetData.findIndex(row =>
      row.whatsapp.replace(/\s+/g, '') === username
    );

    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan." });
    }

    // Update password ke Google Sheet
    await updateCustomerPassword(username, password);
    console.log(`🔐 Password untuk user ${username} berhasil diperbarui di Google Sheet.`);

    return res.json({ success: true });
  } catch (error) {
    console.error("❌ Error saat ganti password:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

// Endpoint login user menggunakan Firebase Authentication & Firestore
app.post("/login", verifyRecaptcha, async (req, res) => {
  const { uid } = req.body;
  if (!uid) {
    return res.status(400).json({ success: false, error: "uid kosong" });
  }
  try {
    const doc = await db.collection("akun").doc(uid).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "User tidak ditemukan" });
    }
    const data = doc.data();
    res.json({
      success: true,
      uid,
      cid: data.cid || "",
      nama: data.nama || "",
      role: data.role || "",
      kelas_id: data.kelas_id || "",
      email: data.email || ""
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Fungsi untuk update password user di Google Sheet PROFILE_ANAK
async function updateCustomerPassword(username, newPassword) {
  const { google } = require('googleapis');
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const spreadsheetId = process.env.SPREADSHEET_ID;
  const sheetName = "PROFILE_ANAK";

  // Ambil data sheet (termasuk header)
  const getResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:Z`,
  });

  const rows = getResponse.data.values;
  if (!rows || rows.length === 0) {
    throw new Error("Sheet kosong.");
  }
  // Cari kolom whatsapp dan password dari baris header
  const header = rows[0];
  const whatsappCol = header.findIndex(col => col.toLowerCase() === "whatsapp");
  const passwordCol = header.findIndex(col => col.toLowerCase() === "password");

  if (whatsappCol === -1 || passwordCol === -1) {
    throw new Error("Kolom whatsapp atau password tidak ditemukan.");
  }

  // Cari baris user (mulai dari rows[1])
  const rowIndex = rows.findIndex((row, idx) =>
    idx > 0 && (row[whatsappCol] || "").replace(/\s+/g, '') === username
  );

  if (rowIndex === -1) throw new Error("User tidak ditemukan di sheet.");

  // Kolom ke-0 = A, ke-1 = B, dst
  const updateRange = `${sheetName}!${String.fromCharCode(65 + passwordCol)}${rowIndex + 1}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: updateRange,
    valueInputOption: "RAW",
    requestBody: {
      values: [[newPassword]]
    }
  });
}

async function getProfileAnakData() {
  const { google } = require("googleapis");
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "PROFILE_ANAK!A1:Z",
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) return [];

  const headers = rows[0];
  return rows.slice(1).map(row => {
    const rowObj = {};
    headers.forEach((header, i) => {
      rowObj[header.trim().toLowerCase()] = (row[i] || "").trim();
    });
    return rowObj;
  });
}

// GET /api/lesson-aktif - ambil daftar murid yang sedang aktif mengerjakan lesson
app.get('/api/lesson-aktif', async (req, res) => {
  try {
    const muridSnap = await db.collection('progress_murid').get();
    const hasil = [];

    for (const doc of muridSnap.docs) {
      const cid = doc.id;
      const namaSnap = await db.collection('murid').doc(cid).get();
      const nama = namaSnap.exists ? (namaSnap.data().nama || '') : '';

      const lessonSnap = await db.collection('progress_murid').doc(cid).collection('lessons').get();
      for (const l of lessonSnap.docs) {
        const data = l.data();
        if (data.status === 'berlangsung') {
          hasil.push({
            cid,
            nama_murid: nama,
            lesson_kode: l.id,
            lesson_nama: data.nama || '',
            status: data.status || '',
            start: new Date(data.start_at || Date.now()).toLocaleString(),
            end: data.end_at ? new Date(data.end_at).toLocaleString() : '-'
          });
        }
      }
    }

    res.json(hasil);
  } catch (err) {
    console.error('❌ Error ambil lesson aktif:', err);
    res.status(500).json([]);
  }
});

// GET /api/log-lesson/:cid/:lesson - ambil log aktivitas lesson dari progress_murid
app.get('/api/log-lesson/:cid/:lesson', async (req, res) => {
  const { cid, lesson } = req.params;
  try {
    const snap = await db
      .collection('progress_murid')
      .doc(cid)
      .collection('lessons')
      .doc(lesson)
      .collection('log')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const log = snap.docs.map(d => {
      const data = d.data();
      return {
        waktu: new Date(data.timestamp || Date.now()).toLocaleString(),
        kegiatan: data.kegiatan || '',
        user: data.user || ''
      };
    });

    res.json(log);
  } catch (err) {
    console.error('❌ Error ambil log lesson:', err);
    res.status(500).json([]);
  }
});

// GET /api/akses-murid/:uid - ambil daftar lesson yang bisa diakses murid
app.get('/api/akses-murid/:uid', async (req, res) => {
  const uid = req.params.uid;
  if (!uid) return res.status(400).json({ akses_lesson: [] });
  try {
    const doc = await db.collection('murid').doc(uid).get();
    if (!doc.exists) {
      return res.status(404).json({ akses_lesson: [] });
    }
    const data = doc.data();
    const akses = Array.isArray(data.akses_lesson) ? data.akses_lesson : [];
    res.json({ akses_lesson: akses });
  } catch (err) {
    console.error('❌ Error get akses murid:', err);
    res.status(500).json({ akses_lesson: [] });
  }
});

// GET /api/lessons - ambil semua lesson
app.get('/api/lessons', async (req, res) => {
  try {
    const snap = await db.collection('lessons').get();
    const data = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json({ success: true, lessons: data });
    try {
      await postToGAS('EL_LESSONS_LIST', data);
    } catch (err) {
      console.error('Mirror LESSONS_LIST gagal:', err);
    }
  } catch (err) {
    console.error('❌ Error ambil daftar lessons:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/lessons - tambah lesson baru
app.post('/api/lessons', async (req, res) => {
  const { lesson_id, title, module, status, kelas_id } = req.body;
  if (!lesson_id || !title || !module) {
    return res.status(400).json({ success: false, error: 'Data tidak lengkap' });
  }

  try {
    const ref = db.collection('lessons').doc(lesson_id);
    const exist = await ref.get();
    if (exist.exists) {
      return res.status(400).json({ success: false, error: 'lesson_id sudah ada' });
    }

    await ref.set({
      lesson_id,
      title,
      module,
      kelas_id: kelas_id || '',
      status: status || 'active',
      created: Date.now()
    });

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error add lesson:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PATCH: GET /api/semua-murid - return juga field cid untuk dropdown!
app.get('/api/semua-murid', async (req, res) => {
  try {
    const snap = await db.collection('murid').get();
    const data = snap.docs.map(d => {
      const val = d.data();
      return {
        uid: d.id,
        cid: val.cid || '',
        nama: val.nama || '',
        email: val.email || '',
        kelas_id: val.kelas_id || '',
        role: val.role || ''
      };
    });
    res.json({ data });
  } catch (err) {
    console.error('❌ Error get semua murid:', err);
    res.status(500).json({ data: [] });
  }
});

// GET /api/guru - daftar semua guru
app.get('/api/guru', async (req, res) => {
  try {
    const snap = await db.collection('guru').get();
    const data = snap.docs.map(d => {
      const val = d.data();
      return {
        uid: d.id,
        name: val.nama || '',
        email: val.email || '',
        type: val.tipe || val.role || '',
        status: val.status || '',
        totalClasses: Array.isArray(val.kelas_id) ? val.kelas_id.length : val.jumlah_kelas || 0,
        lastLogin: val.terakhir_login || ''
      };
    });
    res.json(data);
  } catch (err) {
    console.error('❌ Error get semua guru:', err);
    res.status(500).json([]);
  }
});

// GET /api/orangtua - daftar semua orangtua
app.get('/api/orangtua', async (req, res) => {
  try {
    const snap = await db.collection('orangtua').get();
    const data = snap.docs.map(d => {
      const val = d.data();
      return {
        uid: d.id,
        name: val.nama || '',
        email: val.email || '',
        phone: val.phone || val.wa || '',
        linkedStudents: val.students || val.murid_id || [],
        status: val.status || '',
        lastLogin: val.terakhir_login || ''
      };
    });
    res.json(data);
  } catch (err) {
    console.error('❌ Error get semua orangtua:', err);
    res.status(500).json([]);
  }
});

// GET /api/kelas - daftar semua kelas
app.get('/api/kelas', async (req, res) => {
  try {
    const snap = await db.collection('kelas').get();
    if (snap.empty) {
      return res.json({ success: true, data: [] });
    }
    const data = snap.docs.map(d => {
      const val = d.data();
      return {
        kelas_id: val.kelas_id || d.id,
        nama_kelas: val.nama_kelas || '',
        guru_id: val.guru_id || '',
        jumlah_murid: Array.isArray(val.murid) ? val.murid.length : 0
      };
    });
    res.json({ success: true, data });
    try {
      await postToGAS('EL_CLASS_LIST', data);
    } catch (err) {
      console.error('Mirror CLASS_LIST gagal:', err);
    }
  } catch (err) {
    console.error('❌ Error get kelas:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/kelas/:kelas_id - daftar murid dalam kelas
app.get('/api/kelas/:id', async (req, res) => {
  try {
    const kelasId = req.params.id;
    const doc = await db.collection('kelas').doc(kelasId).get();
    if (!doc.exists) return res.status(404).json([]);
    const muridIds = doc.data().murid || [];
    const snapshots = await Promise.all(muridIds.map(cid => db.collection('murid').doc(cid).get()));
    const murid = snapshots.filter(s => s.exists).map(s => ({ cid: s.id, ...s.data() }));
    res.json(murid);
  } catch (err) {
    console.error('❌ Error get murid kelas:', err);
    res.status(500).json([]);
  }
});

// DELETE /api/kelas/:id - hapus kelas
app.delete('/api/kelas/:id', async (req, res) => {
  try {
    const kelasId = req.params.id;
    const ref = db.collection('kelas').doc(kelasId);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Kelas tidak ditemukan' });
    }
    await ref.delete();
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error delete kelas:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/kelas - tambah kelas baru
app.post('/api/kelas', async (req, res) => {
  const { kelas_id, nama_kelas, guru_id } = req.body;
  if (!kelas_id || !nama_kelas) {
    return res.status(400).json({ success: false, error: 'Data tidak lengkap' });
  }
  try {
    const ref = db.collection('kelas').doc(kelas_id);
    const exist = await ref.get();
    if (exist.exists) {
      return res.status(400).json({ success: false, error: 'kelas_id sudah ada' });
    }
    await ref.set({
      kelas_id,
      nama_kelas,
      guru_id: guru_id || null,
      murid: []
    });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error add kelas:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/daftar-akun-baru - tambah akun murid/guru/moderator
app.post('/api/daftar-akun-baru', async (req, res) => {
  let { nama, email, password, kelas_id, role } = req.body;

  if (!nama || !email || !password || !role || (role === 'student' || role === 'murid') && !kelas_id) {
    return res.status(400).json({ success: false, error: 'Data tidak lengkap' });
  }

  const normalizedRole = (role || '').toLowerCase();
  const mappedRole = normalizedRole === 'teacher' ? 'guru'
                   : normalizedRole === 'student' ? 'murid'
                   : normalizedRole === 'parent' ? 'orangtua'
                   : normalizedRole;
  try {
    const cid = 'QAC' + Date.now();
    const authUser = await admin.auth().createUser({
      email,
      password,
      displayName: nama,
    });
    const uid = authUser.uid;

    const akunData = { cid, uid, nama, email, kelas_id, role: mappedRole };
    await db.collection('akun').doc(uid).set(akunData);

    if (mappedRole === 'murid') {
      await db.collection('murid').doc(uid).set(akunData);
      await db.collection('kelas').doc(kelas_id).set({ kelas_id }, { merge: true });
      await db.collection('kelas').doc(kelas_id).update({
        murid: admin.firestore.FieldValue.arrayUnion(cid)
      });
    } else if (mappedRole === 'guru') {
      // Use UID as document ID for teachers
      await db.collection('guru').doc(uid).set(akunData);
    } else if (mappedRole === 'orangtua') {
      // Use UID as document ID for parents
      await db.collection('orangtua').doc(uid).set(akunData);
    } else if (mappedRole === 'moderator') {
      await db.collection('moderator').doc(uid).set(akunData);
    }

    // Mirror akun baru ke Google Sheet EL_MASTER_USER
    try {
      // Format: array of 1 object sesuai header EL_MASTER_USER (mis: cid, uid, nama, email, kelas_id, role)
      const sheetData = [{
        cid,
        uid,
        nama,
        email,
        kelas_id: kelas_id || '',
        role: mappedRole
      }];
      await postToGAS('EL_MASTER_USER', sheetData);
    } catch (err) {
      console.error('❌ Mirror EL_MASTER_USER gagal:', err);
    }

    res.json({ success: true, cid, uid });
  } catch (err) {
    console.error('❌ Error daftar akun baru:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Endpoint: simpan metadata karya ke Google Sheet
app.post('/api/save-karya', async (req, res) => {
  const { cid, judul, id_karya, link, timestamp } = req.body;
  if (!cid || !judul) return res.status(400).json({ success: false, message: 'Data kurang' });
  try {
    const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = process.env.SPREADSHEET_ID;
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'KARYA_ANAK!A1',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [[cid, judul, id_karya, link, timestamp]] }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error save karya:', err?.response?.data || err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Endpoint: AI chat untuk frontend Guru AI Assistant
app.post('/ai-chat', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Pesan kosong.' });
  }
  try {
    const aiRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: message }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );
    const reply = aiRes.data.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error('❌ Error /ai-chat:', err?.response?.data || err.message);
    res.status(500).json({ reply: 'Maaf, ada masalah di server AI.' });
  }
});

// === OpenAI Chat Proxy ===
const chatHistory = new Map();

app.post('/chat', express.json(), async (req, res) => {
  const { session_id, message } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }
  try {
    const sid = session_id || 'default';
    if (!chatHistory.has(sid)) chatHistory.set(sid, []);
    const history = chatHistory.get(sid);
    history.push({ role: 'user', content: message });
    if (history.length > 8) history.shift();

    const reply = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful AI beauty stylist assistant for a magic mirror.' },
          ...history
        ],
        temperature: 0.7
      })
    }).then(r => r.json());

    const text = reply?.choices?.[0]?.message?.content?.trim() || 'Maaf, aku tidak bisa menjawab sekarang.';
    history.push({ role: 'assistant', content: text });
    if (history.length > 8) history.shift();

    // broadcast to socket if available
    if (io && session_id) {
      io.to(session_id).emit('ai_result', { reply: text });
    }

    res.json({ reply: text });
  } catch (err) {
    console.error('Chat error', err);
    res.status(500).json({ error: 'Server error' });
  }
});
// Endpoint: proxy OpenAI untuk Lab Co-Pilot

// GET /api/overview?range=7d|30d|90d
app.get('/api/overview', async (req, res) => {
  const range = String(req.query.range || '30d');
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  try {
    const [muridSnap, guruSnap, lessonsSnap] = await Promise.all([
      db.collection('murid').get(),
      db.collection('guru').get(),
      db.collection('lessons').get()
    ]);
    const totalUsers = (muridSnap.size || 0) + (guruSnap.size || 0);

    let activeSessions = 0;
    try {
      const aktifKelas = await db.collection('kelas').where('status','in',['aktif','berlangsung']).get();
      activeSessions = aktifKelas.size || 0;
    } catch(_) {}

    let activeToday = 0;
    try {
      const since = startOfDay(Date.now());
      const logSnap = await db.collection('activity_logs').where('timestamp','>=', since).get();
      const u = new Set();
      logSnap.forEach(d=>{ const v=d.data(); if (v.cid) u.add(v.cid); else if (v.user) u.add(v.user); });
      activeToday = u.size;
    } catch(_) {}

    const dau = [];
    try {
      const since = daysAgo(days-1);
      const logSnap = await db.collection('activity_logs').where('timestamp','>=', since).orderBy('timestamp','asc').get();
      const bucket = new Map();
      logSnap.forEach(doc => {
        const v = doc.data();
        const t = startOfDay(v.timestamp || Date.now());
        const key = new Date(t).toISOString().slice(0,10);
        const uid = v.cid || v.user || 'anon';
        if (!bucket.has(key)) bucket.set(key, new Set());
        bucket.get(key).add(uid);
      });
      for (let i=days-1;i>=0;i--){
        const t = daysAgo(i);
        const key = new Date(t).toISOString().slice(0,10);
        dau.push({ date: key, value: (bucket.get(key)?.size || 0) });
      }
    } catch(_) {}

    res.json({
      totals: {
        users: totalUsers,
        activeToday,
        lessons: lessonsSnap.size || 0,
        sessions: activeSessions,
        revenue: 0,
        errorRate: 0
      },
      trends: { users: 0, active: 0, lessons: 0, revenue: 0, error: 0 },
      dau,
      revenue: []
    });
  } catch (err) {
    console.error('❌ /api/overview error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/recent-activity?limit=20
app.get('/api/recent-activity', async (req, res) => {
  const limit = toNumber(req.query.limit, 20);
  try {
    const snap = await db.collection('activity_logs').orderBy('timestamp','desc').limit(limit).get();
    const data = snap.docs.map(d => {
      const v = d.data();
      return {
        time: v.timestamp ? new Date(v.timestamp).toLocaleString() : '-',
        user: v.cid || v.user || '-',
        action: v.aktivitas || v.action || v.event || '-',
        detail: v.detail || v.lesson || v.description || ''
      };
    });
    res.json(data);
  } catch (err) {
    console.error('❌ /api/recent-activity error:', err);
    res.status(500).json([]);
  }
});

// GET /api/top-classes?limit=10
app.get('/api/top-classes', async (req, res) => {
  const limit = toNumber(req.query.limit, 10);
  try {
    const snap = await db.collection('kelas').get();
    const rows = snap.docs.map(d => {
      const v = d.data();
      return {
        name: v.nama_kelas || v.kelas_id || d.id,
        teacher: v.nama_guru || v.guru_id || '-',
        active: Array.isArray(v.murid) ? v.murid.length : (v.jumlah_murid || 0),
        lessons: v.lessons || v.jumlah_modul || '-'
      };
    }).sort((a,b)=> (b.active||0) - (a.active||0)).slice(0, limit);
    res.json(rows);
  } catch (err) {
    console.error('❌ /api/top-classes error:', err);
    res.status(500).json([]);
  }
});

// GET /api/recent-signups?limit=10
app.get('/api/recent-signups', async (req, res) => {
  const limit = toNumber(req.query.limit, 10);
  try {
    let query = db.collection('akun');
    try { query = query.orderBy('created','desc'); } catch(_) {}
    const snap = await query.limit(limit).get();
    const data = snap.docs.map(d => {
      const v = d.data();
      return {
        when: v.created ? new Date(v.created).toLocaleString() : '-',
        name: v.nama || '-',
        email: v.email || '-',
        role: v.role || '-'
      };
    });
    res.json(data);
  } catch (err) {
    console.error('❌ /api/recent-signups error:', err);
    res.status(500).json([]);
  }
});

// GET /api/stats/dau?range=30d
app.get('/api/stats/dau', async (req, res) => {
  const range = String(req.query.range || '30d');
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  try {
    const since = daysAgo(days-1);
    const logSnap = await db.collection('activity_logs').where('timestamp','>=', since).orderBy('timestamp','asc').get();
    const bucket = new Map();
    logSnap.forEach(doc => {
      const v = doc.data();
      const t = startOfDay(v.timestamp || Date.now());
      const key = new Date(t).toISOString().slice(0,10);
      const uid = v.cid || v.user || 'anon';
      if (!bucket.has(key)) bucket.set(key, new Set());
      bucket.get(key).add(uid);
    });
    const out = [];
    for (let i=days-1;i>=0;i--){
      const t = daysAgo(i);
      const key = new Date(t).toISOString().slice(0,10);
      out.push({ date:key, value: (bucket.get(key)?.size || 0) });
    }
    res.json(out);
  } catch (err) {
    console.error('❌ /api/stats/dau error:', err);
    res.status(500).json([]);
  }
});

// GET /api/revenue/monthly?months=12 (placeholder)
app.get('/api/revenue/monthly', async (req, res) => {
  try { res.json([]); }
  catch (err) { console.error('❌ /api/revenue/monthly error:', err); res.status(500).json([]); }
});

// ===== Nai Nai Lapis: lightweight CMS + leads monitoring =====
app.get('/api/nainai/admin/auth/state', (req, res) => {
  try {
    const auth = loadNainaiAuth();
    return res.json({
      ok: true,
      initialized: isNainaiPinInitialized(auth),
      pinMin: NAINAI_ADMIN_PIN_MIN,
      pinMax: NAINAI_ADMIN_PIN_MAX
    });
  } catch (err) {
    console.error('❌ /api/nainai/admin/auth/state error:', err);
    return res.status(500).json({ ok: false, error: 'Gagal membaca status PIN admin' });
  }
});

app.post('/api/nainai/admin/auth/bootstrap', (req, res) => {
  try {
    const body = req.body || {};
    const pin = String(body.pin || '').trim();
    const confirmPin = String(body.confirmPin || '').trim();
    const auth = loadNainaiAuth();

    if (isNainaiPinInitialized(auth)) {
      return res.status(409).json({ ok: false, error: 'PIN admin sudah pernah diaktifkan' });
    }
    if (!isValidNainaiPin(pin)) {
      return res.status(400).json({ ok: false, error: `PIN harus ${NAINAI_ADMIN_PIN_MIN}-${NAINAI_ADMIN_PIN_MAX} digit angka` });
    }
    if (pin !== confirmPin) {
      return res.status(400).json({ ok: false, error: 'Konfirmasi PIN tidak cocok' });
    }

    setNainaiPin(pin);
    const nextConfig = loadNainaiConfig();
    const session = createNainaiAdminSession({ uid: 'nainai-admin' });
    return res.json({
      ok: true,
      token: session.token,
      expiresAt: new Date(session.expiresAt).toISOString(),
      config: toPublicNainaiConfig(nextConfig)
    });
  } catch (err) {
    console.error('❌ /api/nainai/admin/auth/bootstrap error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Gagal aktivasi PIN admin' });
  }
});

app.post('/api/nainai/admin/auth/login', (req, res) => {
  try {
    const body = req.body || {};
    const pin = String(body.pin || '').trim();
    const auth = loadNainaiAuth();

    if (!isNainaiPinInitialized(auth)) {
      return res.status(409).json({ ok: false, error: 'PIN admin belum diaktifkan. Lakukan aktivasi awal.' });
    }
    if (!verifyNainaiPin(pin, auth)) {
      return res.status(401).json({ ok: false, error: 'PIN salah' });
    }

    const session = createNainaiAdminSession({ uid: 'nainai-admin' });
    return res.json({
      ok: true,
      token: session.token,
      expiresAt: new Date(session.expiresAt).toISOString()
    });
  } catch (err) {
    console.error('❌ /api/nainai/admin/auth/login error:', err);
    return res.status(500).json({ ok: false, error: 'Gagal login admin' });
  }
});

app.get('/api/nainai/admin/auth/me', requireNainaiAdmin, (req, res) => {
  const session = req.nainaiAdminSession || {};
  return res.json({
    ok: true,
    uid: session.uid || 'nainai-admin',
    expiresAt: session.expiresAt ? new Date(session.expiresAt).toISOString() : null
  });
});

app.post('/api/nainai/admin/auth/logout', requireNainaiAdmin, (req, res) => {
  try {
    if (req.nainaiAdminToken) nainaiAdminSessions.delete(req.nainaiAdminToken);
    return res.json({ ok: true });
  } catch (err) {
    console.error('❌ /api/nainai/admin/auth/logout error:', err);
    return res.status(500).json({ ok: false, error: 'Gagal logout admin' });
  }
});

app.post('/api/nainai/admin/auth/change-pin', requireNainaiAdmin, (req, res) => {
  try {
    const body = req.body || {};
    const oldPin = String(body.oldPin || '').trim();
    const newPin = String(body.newPin || '').trim();
    const confirmPin = String(body.confirmPin || '').trim();
    const auth = loadNainaiAuth();

    if (!isNainaiPinInitialized(auth)) {
      return res.status(409).json({ ok: false, error: 'PIN admin belum diaktifkan' });
    }
    if (!verifyNainaiPin(oldPin, auth)) {
      return res.status(401).json({ ok: false, error: 'PIN lama tidak sesuai' });
    }
    if (!isValidNainaiPin(newPin)) {
      return res.status(400).json({ ok: false, error: `PIN baru harus ${NAINAI_ADMIN_PIN_MIN}-${NAINAI_ADMIN_PIN_MAX} digit angka` });
    }
    if (newPin !== confirmPin) {
      return res.status(400).json({ ok: false, error: 'Konfirmasi PIN baru tidak cocok' });
    }
    if (oldPin === newPin) {
      return res.status(400).json({ ok: false, error: 'PIN baru harus berbeda dari PIN lama' });
    }

    setNainaiPin(newPin);
    const session = createNainaiAdminSession({ uid: 'nainai-admin' });
    return res.json({
      ok: true,
      token: session.token,
      expiresAt: new Date(session.expiresAt).toISOString()
    });
  } catch (err) {
    console.error('❌ /api/nainai/admin/auth/change-pin error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Gagal ganti PIN' });
  }
});

app.get('/api/nainai/config', (req, res) => {
  try {
    const config = loadNainaiConfig();
    return res.json({
      ok: true,
      config: toPublicNainaiConfig(config),
      assets: listNainaiAssets()
    });
  } catch (err) {
    console.error('❌ /api/nainai/config error:', err);
    return res.status(500).json({ ok: false, error: 'Gagal memuat config' });
  }
});

app.put('/api/nainai/config', requireNainaiAdmin, (req, res) => {
  try {
    const body = req.body || {};
    const next = {};
    if ('heroTitle' in body) next.heroTitle = body.heroTitle;
    if ('heroSubtitle' in body) next.heroSubtitle = body.heroSubtitle;
    if ('announcement' in body) next.announcement = body.announcement;
    if ('adminWhatsapp' in body) next.adminWhatsapp = body.adminWhatsapp;
    if ('seasonalLabel' in body) next.seasonalLabel = body.seasonalLabel;
    if ('lapisSizes' in body) {
      if (Array.isArray(body.lapisSizes)) {
        next.lapisSizes = body.lapisSizes;
      } else if (typeof body.lapisSizes === 'string') {
        next.lapisSizes = body.lapisSizes.split(',').map((item) => item.trim());
      }
    }

    const config = saveNainaiConfig(next);
    return res.json({ ok: true, config });
  } catch (err) {
    console.error('❌ /api/nainai/config update error:', err);
    return res.status(500).json({ ok: false, error: 'Gagal menyimpan config' });
  }
});

app.get('/api/nainai/assets', requireNainaiAdmin, (req, res) => {
  try {
    return res.json({ ok: true, assets: listNainaiAssets() });
  } catch (err) {
    console.error('❌ /api/nainai/assets error:', err);
    return res.status(500).json({ ok: false, error: 'Gagal membaca assets' });
  }
});

app.post('/api/nainai/upload-asset', requireNainaiAdmin, (req, res) => {
  nainaiUpload.single('asset')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ ok: false, error: err.message || 'Upload gagal' });
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'File belum dipilih' });
    }
    return res.json({
      ok: true,
      file: {
        name: req.file.filename,
        size: req.file.size,
        url: `/products/class/cake-bakery-class/${encodeURIComponent(req.file.filename)}`
      }
    });
  });
});

app.delete('/api/nainai/assets/:name', requireNainaiAdmin, (req, res) => {
  try {
    const resolved = resolveNainaiAssetPath(req.params.name);
    if (!resolved) {
      return res.status(400).json({ ok: false, error: 'Nama file tidak valid' });
    }
    if (!fs.existsSync(resolved.absPath)) {
      return res.status(404).json({ ok: false, error: 'File tidak ditemukan' });
    }
    fs.unlinkSync(resolved.absPath);
    return res.json({ ok: true, deleted: resolved.name });
  } catch (err) {
    console.error('❌ /api/nainai/assets/:name delete error:', err);
    return res.status(500).json({ ok: false, error: 'Gagal menghapus file asset' });
  }
});

app.post('/api/nainai/shortlinks', requireNainaiAdmin, (req, res) => {
  try {
    const body = req.body || {};
    const targetUrl = sanitizeHttpUrl(body.targetUrl, 1200);
    let requestedCode = sanitizeShortCode(body.code || '');
    const createdBy = sanitizeText((req.nainaiAdminSession && req.nainaiAdminSession.uid) || 'nainai-admin', 80);

    if (!targetUrl) {
      return res.status(400).json({ ok: false, error: 'Target URL harus format http/https yang valid' });
    }
    if (requestedCode && (requestedCode.length < 4 || requestedCode.length > 32)) {
      return res.status(400).json({ ok: false, error: 'Kode shortlink harus 4-32 karakter (a-z, 0-9, -)' });
    }

    const rows = loadNainaiShortlinks();
    const codes = new Set(rows.map((row) => row.code));

    if (!requestedCode) {
      requestedCode = pickUniqueNainaiShortCode(codes);
      if (!requestedCode) {
        return res.status(500).json({ ok: false, error: 'Gagal membuat shortlink. Coba ulangi lagi.' });
      }
    } else if (codes.has(requestedCode)) {
      return res.status(409).json({ ok: false, error: 'Kode shortlink sudah dipakai. Gunakan kode lain.' });
    }

    const entry = {
      code: requestedCode,
      targetUrl,
      createdAt: nowIso(),
      createdBy
    };

    rows.push(entry);
    saveNainaiShortlinks(rows);

    return res.json({
      ok: true,
      shortlink: toNainaiShortlinkPayload(entry, req)
    });
  } catch (err) {
    console.error('❌ /api/nainai/shortlinks error:', err);
    return res.status(500).json({ ok: false, error: 'Gagal membuat shortlink' });
  }
});

app.get('/nl/:code', (req, res) => {
  try {
    const code = sanitizeShortCode(req.params.code || '');
    if (!code) return res.status(404).send('Not found');

    const rows = loadNainaiShortlinks();
    const entry = rows.find((row) => row && row.code === code);
    if (!entry || !entry.targetUrl) return res.status(404).send('Not found');

    return res.redirect(entry.targetUrl);
  } catch (err) {
    console.error('❌ /nl/:code redirect error:', err);
    return res.status(500).send('Internal error');
  }
});

app.get('/api/nainai/invoices', requireNainaiAdmin, (req, res) => {
  try {
    const limit = Math.max(1, Math.min(500, toNumber(req.query.limit, 100)));
    const q = sanitizeText(req.query.q || '', 120).toLowerCase();
    let rows = loadNainaiInvoices()
      .slice()
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    if (q) {
      rows = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
    }

    return res.json({
      ok: true,
      total: rows.length,
      data: rows.slice(0, limit)
    });
  } catch (err) {
    console.error('❌ /api/nainai/invoices error:', err);
    return res.status(500).json({ ok: false, error: 'Gagal memuat data invoice' });
  }
});

app.post('/api/nainai/invoices', requireNainaiAdmin, async (req, res) => {
  try {
    if (!PDFDocument) {
      return res.status(500).json({ ok: false, error: 'Fitur PDF belum aktif. Jalankan npm install agar pdfkit terpasang.' });
    }

    const body = req.body || {};
    const customerName = sanitizeText(body.customerName, 120);
    const customerWhatsapp = normalizePhone62(body.customerWhatsapp || '');
    const customerAddress = sanitizeText(body.customerAddress, 220);
    const orderDate = sanitizeIsoDate(body.orderDate) || new Date().toISOString().slice(0, 10);
    const dueDate = sanitizeIsoDate(body.dueDate);
    const notes = sanitizeText(body.notes, 500);
    const items = normalizeInvoiceItems(body.items);
    const shipping = sanitizeMoney(body.shipping);
    const discountRaw = sanitizeMoney(body.discount);

    if (!customerName || !customerWhatsapp) {
      return res.status(400).json({ ok: false, error: 'Nama customer dan WhatsApp customer wajib diisi' });
    }
    if (!items.length) {
      return res.status(400).json({ ok: false, error: 'Minimal isi 1 item invoice' });
    }

    const subtotal = sanitizeMoney(items.reduce((sum, item) => sum + sanitizeMoney(item.lineTotal), 0));
    const discount = Math.min(discountRaw, subtotal);
    const total = sanitizeMoney(subtotal - discount + shipping);

    const rows = loadNainaiInvoices();
    const invoiceNumber = buildNainaiInvoiceNumber(rows);
    const id = generateNainaiId('inv');
    const fileName = `${invoiceNumber.toLowerCase()}.pdf`;
    const filePath = path.join(NAINAI_INVOICE_DIR, fileName);
    const fileUrlPath = `/products/class/cake-bakery-class/invoices/${encodeURIComponent(fileName)}`;
    const baseUrl = buildPublicBaseUrl(req);
    const fileUrl = baseUrl ? `${baseUrl}${fileUrlPath}` : fileUrlPath;
    const createdAt = nowIso();

    const invoicePayload = {
      id,
      invoiceNumber,
      customerName,
      customerWhatsapp,
      customerAddress,
      orderDate,
      dueDate: dueDate || '',
      notes,
      items,
      subtotal,
      discount,
      shipping,
      total,
      createdAt,
      createdBy: sanitizeText((req.nainaiAdminSession && req.nainaiAdminSession.uid) || 'nainai-admin', 80),
      pdfPath: fileUrlPath,
      pdfUrl: fileUrl
    };

    await createNainaiInvoicePdf(invoicePayload, filePath);

    rows.push(invoicePayload);
    saveNainaiInvoices(rows);
    const config = loadNainaiConfig();
    const adminWhatsapp = config.adminWhatsapp || NAINAI_ADMIN_WA_DEFAULT;
    const whatsappUrl = buildNainaiAdminInvoiceWhatsappUrl(adminWhatsapp, invoicePayload);

    return res.json({
      ok: true,
      invoice: invoicePayload,
      whatsappUrl
    });
  } catch (err) {
    console.error('❌ /api/nainai/invoices create error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Gagal membuat invoice PDF' });
  }
});

app.patch('/api/nainai/invoices/:id', requireNainaiAdmin, async (req, res) => {
  try {
    if (!PDFDocument) {
      return res.status(500).json({ ok: false, error: 'Fitur PDF belum aktif. Jalankan npm install agar pdfkit terpasang.' });
    }

    const id = sanitizeText(req.params.id, 80);
    if (!id) return res.status(400).json({ ok: false, error: 'ID invoice tidak valid' });

    const rows = loadNainaiInvoices();
    const index = rows.findIndex((row) => row && row.id === id);
    if (index < 0) return res.status(404).json({ ok: false, error: 'Invoice tidak ditemukan' });

    const existing = rows[index] || {};
    const body = req.body || {};
    const customerName = sanitizeText(body.customerName, 120);
    const customerWhatsapp = normalizePhone62(body.customerWhatsapp || '');
    const customerAddress = sanitizeText(body.customerAddress, 220);
    const orderDate = sanitizeIsoDate(body.orderDate) || new Date().toISOString().slice(0, 10);
    const dueDate = sanitizeIsoDate(body.dueDate);
    const notes = sanitizeText(body.notes, 500);
    const items = normalizeInvoiceItems(body.items);
    const shipping = sanitizeMoney(body.shipping);
    const discountRaw = sanitizeMoney(body.discount);

    if (!customerName || !customerWhatsapp) {
      return res.status(400).json({ ok: false, error: 'Nama customer dan WhatsApp customer wajib diisi' });
    }
    if (!items.length) {
      return res.status(400).json({ ok: false, error: 'Minimal isi 1 item invoice' });
    }

    const subtotal = sanitizeMoney(items.reduce((sum, item) => sum + sanitizeMoney(item.lineTotal), 0));
    const discount = Math.min(discountRaw, subtotal);
    const total = sanitizeMoney(subtotal - discount + shipping);
    const invoiceNumber = sanitizeText(existing.invoiceNumber, 60) || buildNainaiInvoiceNumber(rows);
    const resolvedPdf = resolveNainaiInvoicePdfPath(existing.pdfPath || existing.pdfUrl, invoiceNumber);
    const filePath = resolvedPdf.absPath;
    const fileUrlPath = resolvedPdf.urlPath;
    const baseUrl = buildPublicBaseUrl(req);
    const fileUrl = baseUrl ? `${baseUrl}${fileUrlPath}` : fileUrlPath;
    const updatedAt = nowIso();

    const invoicePayload = {
      ...existing,
      id,
      invoiceNumber,
      customerName,
      customerWhatsapp,
      customerAddress,
      orderDate,
      dueDate: dueDate || '',
      notes,
      items,
      subtotal,
      discount,
      shipping,
      total,
      createdAt: existing.createdAt || updatedAt,
      createdBy: sanitizeText(existing.createdBy || (req.nainaiAdminSession && req.nainaiAdminSession.uid) || 'nainai-admin', 80),
      updatedAt,
      updatedBy: sanitizeText((req.nainaiAdminSession && req.nainaiAdminSession.uid) || 'nainai-admin', 80),
      pdfPath: fileUrlPath,
      pdfUrl: fileUrl
    };

    await createNainaiInvoicePdf(invoicePayload, filePath);
    rows[index] = invoicePayload;
    saveNainaiInvoices(rows);

    const config = loadNainaiConfig();
    const adminWhatsapp = config.adminWhatsapp || NAINAI_ADMIN_WA_DEFAULT;
    const whatsappUrl = buildNainaiAdminInvoiceWhatsappUrl(adminWhatsapp, invoicePayload);

    return res.json({
      ok: true,
      invoice: invoicePayload,
      whatsappUrl
    });
  } catch (err) {
    console.error('❌ /api/nainai/invoices/:id update error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Gagal update invoice PDF' });
  }
});

app.delete('/api/nainai/invoices/:id', requireNainaiAdmin, (req, res) => {
  try {
    const id = sanitizeText(req.params.id, 80);
    if (!id) return res.status(400).json({ ok: false, error: 'ID invoice tidak valid' });

    const rows = loadNainaiInvoices();
    const index = rows.findIndex((row) => row && row.id === id);
    if (index < 0) return res.status(404).json({ ok: false, error: 'Invoice tidak ditemukan' });

    const removed = rows[index] || {};
    rows.splice(index, 1);
    saveNainaiInvoices(rows);

    const resolvedPdf = resolveNainaiInvoicePdfPath(removed.pdfPath || removed.pdfUrl, removed.invoiceNumber || id);
    if (resolvedPdf && fs.existsSync(resolvedPdf.absPath)) {
      try {
        fs.unlinkSync(resolvedPdf.absPath);
      } catch (err) {
        console.warn('[nainai] gagal menghapus file invoice', resolvedPdf.absPath, err.message);
      }
    }

    return res.json({
      ok: true,
      deleted: {
        id,
        invoiceNumber: sanitizeText(removed.invoiceNumber, 60) || '-'
      }
    });
  } catch (err) {
    console.error('❌ /api/nainai/invoices/:id delete error:', err);
    return res.status(500).json({ ok: false, error: 'Gagal menghapus invoice' });
  }
});

app.get('/api/nainai/orders', requireNainaiAdmin, (req, res) => {
  try {
    const limit = Math.max(1, Math.min(1000, toNumber(req.query.limit, 200)));
    const kind = sanitizeText(req.query.kind || '', 20).toLowerCase();
    const status = sanitizeText(req.query.status || '', 20).toLowerCase();
    const q = sanitizeText(req.query.q || '', 80).toLowerCase();

    let rows = loadNainaiLeads();
    rows = rows.slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    if (kind) rows = rows.filter((row) => String(row.kind || '').toLowerCase() === kind);
    if (status) rows = rows.filter((row) => String(row.status || '').toLowerCase() === status);
    if (q) {
      rows = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
    }

    return res.json({
      ok: true,
      total: rows.length,
      data: rows.slice(0, limit)
    });
  } catch (err) {
    console.error('❌ /api/nainai/orders error:', err);
    return res.status(500).json({ ok: false, error: 'Gagal mengambil data order/event' });
  }
});

app.post('/api/nainai/events', (req, res) => {
  try {
    const body = req.body || {};
    const eventType = sanitizeText(body.eventType, 40) || 'click';
    const label = sanitizeText(body.label, 120);
    const sourcePage = sanitizeText(body.sourcePage, 200);
    const product = sanitizeText(body.product, 80);
    const size = sanitizeText(body.size, 40);
    const meta = body.meta && typeof body.meta === 'object' ? body.meta : {};

    const entry = {
      id: generateNainaiId('evt'),
      kind: 'event',
      status: 'new',
      eventType,
      label,
      sourcePage,
      product,
      size,
      meta,
      createdAt: nowIso()
    };
    const rows = loadNainaiLeads();
    rows.push(entry);
    saveNainaiLeads(rows);
    return res.json({ ok: true, entry });
  } catch (err) {
    console.error('❌ /api/nainai/events error:', err);
    return res.status(500).json({ ok: false, error: 'Gagal mencatat event' });
  }
});

app.post('/api/nainai/order', (req, res) => {
  try {
    const body = req.body || {};
    const name = sanitizeText(body.name, 100);
    const whatsappRaw = sanitizeText(body.whatsapp, 40);
    const whatsapp = normalizePhone62(whatsappRaw);
    const product = sanitizeText(body.product, 80);
    const size = sanitizeText(body.size, 40);
    const notes = sanitizeText(body.notes, 600);
    const sourcePage = sanitizeText(body.sourcePage, 200);

    if (!name || !whatsapp || !product) {
      return res.status(400).json({ ok: false, error: 'Nama, WhatsApp, dan produk wajib diisi' });
    }

    const entry = {
      id: generateNainaiId('ord'),
      kind: 'order',
      status: 'new',
      name,
      whatsapp,
      product,
      size,
      notes,
      sourcePage,
      createdAt: nowIso()
    };

    const rows = loadNainaiLeads();
    rows.push(entry);
    saveNainaiLeads(rows);

    const config = loadNainaiConfig();
    return res.json({
      ok: true,
      order: entry,
      adminWhatsapp: config.adminWhatsapp || NAINAI_ADMIN_WA_DEFAULT
    });
  } catch (err) {
    console.error('❌ /api/nainai/order error:', err);
    return res.status(500).json({ ok: false, error: 'Gagal menyimpan order' });
  }
});

app.patch('/api/nainai/orders/:id', requireNainaiAdmin, (req, res) => {
  try {
    const id = sanitizeText(req.params.id, 80);
    const body = req.body || {};
    const status = sanitizeText(body.status, 24).toLowerCase();
    const adminNote = sanitizeText(body.adminNote, 400);
    const validStatuses = new Set(['new', 'in_progress', 'done', 'cancelled']);

    if (!id) return res.status(400).json({ ok: false, error: 'ID tidak valid' });
    if (status && !validStatuses.has(status)) {
      return res.status(400).json({ ok: false, error: 'Status tidak valid' });
    }

    const rows = loadNainaiLeads();
    const idx = rows.findIndex((row) => row && row.id === id);
    if (idx < 0) return res.status(404).json({ ok: false, error: 'Data tidak ditemukan' });

    const current = rows[idx] || {};
    const next = {
      ...current,
      updatedAt: nowIso()
    };
    if (status) next.status = status;
    if ('adminNote' in body) next.adminNote = adminNote;

    rows[idx] = next;
    saveNainaiLeads(rows);
    return res.json({ ok: true, entry: next });
  } catch (err) {
    console.error('❌ /api/nainai/orders/:id error:', err);
    return res.status(500).json({ ok: false, error: 'Gagal update status order/event' });
  }
});

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));
// Endpoint: proxy OpenAI untuk Lab Co-Pilot
app.post('/openai-api', async (req, res) => {
  const { prompt } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API Key tidak tersedia.' });
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      { model: 'gpt-4o', messages: [{ role: 'user', content: prompt }] },
      { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` } }
    );
    const code = response.data.choices[0].message?.content || '';
    res.json({ code });
  } catch (err) {
    console.error('❌ OpenAI API error:', err?.response?.data || err.message);
    res.status(500).json({ error: 'Gagal generate kode.' });
  }
});

// Endpoint: menerima foto base64 dari alat
app.post('/upload_photo', (req, res) => {
    const { photoBase64 } = req.body;
    if (photoBase64) {
        console.log('📷 Foto user diterima dari alat.');
        io.emit('user_photo', { photoBase64 });
        res.status(200).send({ success: true });
    } else {
        res.status(400).send({ error: 'No photo received.' });
    }
});

// Endpoint: menerima hasil AI recommendation dari alat
app.post('/upload_ai_result', (req, res) => {
    const { recommendationText } = req.body;
    if (recommendationText) {
        console.log('🧠 Hasil AI Stylist diterima dari alat.');
        io.emit('ai_result', { recommendationText });
        res.status(200).send({ success: true });
    } else {
        res.status(400).send({ error: 'No recommendation received.' });
    }
});

// === Step 2: Relay hasil analisa ke WhatsApp via Whacenter ===
// Body: { number: '62812xxxx', message: 'text' }
app.post('/send-whatsapp', async (req, res) => {
  try {
    const body = req.body || {};
    let { number, message, deviceId: overrideDeviceId } = body;
    if (!number || !message) {
      return res.status(400).json({ ok: false, error: 'missing number/message' });
    }

    // Normalisasi nomor ke format 62
    function normalize(num) {
      num = String(num || '').replace(/[^0-9+]/g, '');
      if (num.startsWith('+')) num = num.slice(1);
      if (num.startsWith('08')) num = '62' + num.slice(1);
      if (num.startsWith('8'))  num = '62' + num;
      if (!num.startsWith('62')) num = '62' + num;
      return num;
    }
    number = normalize(number);

    // Ambil cred dari ENV (dukung dua nama var yang sudah dipakai di proyekmu)
    const deviceId = (typeof overrideDeviceId === 'string' && overrideDeviceId.trim())
      ? overrideDeviceId.trim()
      : (process.env.WHACENTER_DEVICE || process.env.WHA_DEVICE_ID);
    const apiKey   = process.env.WHACENTER_KEY   || process.env.WHA_API_KEY; // opsional

    if (!deviceId) {
      return res.status(500).json({ ok: false, error: 'server not configured (device id missing)' });
    }

    // Coba payload JSON (beberapa akun menerima field `number`)
    const attemptJson = await fetch('https://app.whacenter.com/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: deviceId,
        number,
        message,
        ...(apiKey ? { key: apiKey } : {})
      })
    });
    const jsonResp = await attemptJson.json().catch(() => ({}));
    let ok = !!(jsonResp && (jsonResp.status === true || jsonResp.success === true));
    let lastProvider = jsonResp;

    // Fallback: beberapa akun memakai field `phone` alih-alih `number`
    if (!ok) {
      const attemptJsonAlt = await fetch('https://app.whacenter.com/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          phone: number,
          message,
          ...(apiKey ? { key: apiKey } : {})
        })
      });
      const altResp = await attemptJsonAlt.json().catch(() => ({}));
      ok = !!(altResp && (altResp.status === true || altResp.success === true));
      lastProvider = altResp;
    }

    return res.status(ok ? 200 : 502).json({ ok, provider: lastProvider });
  } catch (err) {
    console.error('send-whatsapp error', err);
    return res.status(500).json({ ok: false, error: 'internal error' });
  }
});

// Endpoint: fallback push generated_faces dari Python jika WebSocket gagal
app.post('/push_faces_to_frontend', (req, res) => {
    const { faces, face_shape, skin_tone } = req.body;
    if (faces && faces.length > 0) {
        console.log(`🖼️ [Fallback] ${faces.length} generated faces diterima dari Python.`);
        io.emit('generated_faces', { faces, face_shape, skin_tone });
        res.status(200).send({ success: true });
    } else {
        res.status(400).send({ error: 'No faces received.' });
    }
});

// Endpoint: Generate cerita dari form anak
app.post("/api/generate-story", async (req, res) => {
  const { namaAnak, usia, dream: impian, hero: pahlawan, fear: problem, mostLoved: disayang, recipient } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) return res.status(500).json({ success: false, message: "API key tidak tersedia." });

  const prompt = `
  Buatkan cerita pendek untuk anak usia ${usia} tahun, dengan tokoh utama bernama ${namaAnak}.
  Ia memiliki impian menjadi ${impian}, dan sangat mengagumi ${pahlawan} sebagai pahlawan hidupnya.
  Cerita terjadi di tempat yang menyenangkan. Suatu hari, dia menghadapi ketakutan terbesarnya: ${problem}.
  Untungnya, dengan semangat dan dukungan dari ${disayang}, dia belajar menghadapi rasa takutnya.
  Cerita ini dipersembahkan untuk ${recipient}.
  Cerita harus ringan, menyenangkan, dan menyentuh hati, dalam 3–5 paragraf pendek, maksimal 300 kata.
  Gunakan bahasa Indonesia yang mudah dimengerti anak-anak, dan membuat orang tua tersenyum saat membacanya.
  `;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        }
      }
    );

    const story = response.data.choices[0].message.content;
    res.json({ success: true, story });
  } catch (error) {
    console.error("❌ Gagal generate cerita:", error?.response?.data || error.message);
    res.status(500).json({ success: false, message: "Gagal generate cerita." });
  }
});

// Endpoint: Generate cerita dan gambar ilustrasi dari form anak
app.post("/api/generate-story-with-images", async (req, res) => {
  const { namaAnak, usia, dream: impian, hero: pahlawan, fear: problem, mostLoved: disayang, recipient } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) return res.status(500).json({ success: false, message: "API key tidak tersedia." });

  const storyPrompt = `
  Buatkan cerita pendek untuk anak usia ${usia} tahun, dengan tokoh utama bernama ${namaAnak}.
  Ia memiliki impian menjadi ${impian}, dan sangat mengagumi ${pahlawan} sebagai pahlawan hidupnya.
  Cerita terjadi di tempat yang menyenangkan. Suatu hari, dia menghadapi ketakutan terbesarnya: ${problem}.
  Untungnya, dengan semangat dan dukungan dari ${disayang}, dia belajar menghadapi rasa takutnya.
  Cerita ini dipersembahkan untuk ${recipient}.
  Cerita harus ringan, menyenangkan, dan menyentuh hati, dalam 3–5 paragraf pendek, maksimal 300 kata.
  Gunakan bahasa Indonesia yang mudah dimengerti anak-anak, dan membuat orang tua tersenyum saat membacanya.
  `;

  try {
    // Generate story
    const gptResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [{ role: "user", content: storyPrompt }],
        temperature: 0.8
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        }
      }
    );

    const story = gptResponse.data.choices[0].message.content;

    // Ekstrak 2–3 adegan deskriptif untuk ilustrasi
    const highlightPrompt = `
    Dari cerita berikut, ambil 2–3 adegan penting yang cocok dijadikan gambar ilustrasi buku anak. 
    Buat dalam format list deskriptif pendek berbahasa Inggris, masing-masing satu kalimat.
    Cerita: """${story}"""
    `;

    const highlightsResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [{ role: "user", content: highlightPrompt }],
        temperature: 0.7
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        }
      }
    );

    const highlightsText = highlightsResponse.data.choices[0].message.content;
    const highlightLines = highlightsText.split("\n").filter(line => line.trim().length > 0).slice(0, 3);
    
    const images = [];

    for (const desc of highlightLines) {
      const imageRes = await axios.post(
        "https://api.openai.com/v1/images/generations",
        {
          model: "dall-e-3",
          prompt: desc.replace(/^\d+[\.\)]\s*/, '') + ", in colorful children’s storybook illustration style, cartoon style, no photorealistic faces",
          size: "1024x1024",
          n: 1
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          }
        }
      );
      images.push(imageRes.data.data[0].url);
    }

    res.json({ success: true, story, images });
  } catch (error) {
    console.error("❌ Gagal generate story with images:", error?.response?.data || error.message);
    res.status(500).json({ success: false, message: "Gagal generate story & image." });
  }
});

// Endpoint: generate gambar Kody dari prompt anak (struktur & style sama dengan generate-story-with-images)
app.post("/api/generate-kody-image", async (req, res) => {
  const { description } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!description || description.length < 3) {
    return res.status(400).json({ success: false, message: "Deskripsi terlalu pendek." });
  }
  if (!apiKey) {
    return res.status(500).json({ success: false, message: "API Key tidak tersedia." });
  }

  try {
    const prompt = `${description}, in colorful children’s storybook illustration style, cartoon style, no photorealistic faces, 3D clay-style mascot`;

    const dalleRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        size: "1024x1024",
        n: 1
      })
    });

    const data = await dalleRes.json();
    if (!data?.data || !data.data[0]?.url) {
      throw new Error("Tidak ada URL gambar dalam respons.");
    }

    const imageUrl = data.data[0].url;
    res.json({ success: true, imageUrl });
  } catch (error) {
    console.error("❌ Gagal generate gambar Kody:", error.message || error);
    res.status(500).json({ success: false, message: "Gagal generate gambar Kody." });
  }
});

// WebSocket logic
io.on('connection', (socket) => {
    console.log('✅ User connected via WebSocket');

    socket.on('join', ({ session_id }) => {
        socket.join(session_id);
        console.log(`👥 User bergabung ke session: ${session_id}`);
    });

    socket.on('user_photo', (data) => {
        console.log('📷 Foto user diterima dari browser, broadcast ke Python server...');
        socket.broadcast.emit('user_photo', data);
    });

    socket.on('send_ai_result', (data) => {
        console.log('🧠 Hasil AI Stylist dari Python, broadcast ke semua client...');
        io.emit('ai_result', { recommendationText: data.recommendation });
    });

    socket.on('generated_faces', (data) => {
        console.log(`🖼️ ${data.faces?.length || 0} generated faces diterima dari Python untuk sesi ${data.session_id}`);
        if (data.session_id) {
            io.to(data.session_id).emit('generated_faces', data);
        }
    });

    socket.on('request_capture', () => {
        console.log('📸 Browser minta capture foto.');
        io.emit('request_capture');
    });

    socket.on('disconnect', () => {
        console.log('⚡ User disconnected');
    });
});

// GET /api/kelas-aktif - daftar kelas yang sedang aktif
app.get('/api/kelas-aktif', async (req, res) => {
  try {
    const snap = await db.collection('kelas').get();
    const kelasAktif = [];

    for (const doc of snap.docs) {
      const data = doc.data();
      if (data.status === 'aktif' || data.status === 'berlangsung') {
        kelasAktif.push({
          kelas_id: data.kelas_id || doc.id,
          nama_kelas: data.nama_kelas || '',
          nama_guru: data.nama_guru || '',
          jadwal: data.jadwal || '',
          jumlah_murid: Array.isArray(data.murid) ? data.murid.length : 0,
          status: data.status || 'aktif'
        });
      }
    }

    res.json(kelasAktif);
  } catch (err) {
    console.error('❌ Error get kelas aktif:', err);
    res.status(500).json([]);
  }
});

// GET /api/log-kelas/:kelas_id - ambil log aktivitas per kelas
app.get('/api/log-kelas/:kelas_id', async (req, res) => {
  const kelasId = req.params.kelas_id;
  try {
    const snap = await db
      .collection('kelas')
      .doc(kelasId)
      .collection('log')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const log = snap.docs.map(d => {
      const data = d.data();
      return {
        waktu: new Date(data.timestamp || Date.now()).toLocaleString(),
        kegiatan: data.kegiatan || '',
        user: data.user || ''
      };
    });

    res.json(log);
  } catch (err) {
    console.error('❌ Error get log kelas:', err);
    res.status(500).json([]);
  }
});

// GET /api/murid/:cid - ambil data profil murid berdasarkan CID
app.get('/api/murid/:cid', async (req, res) => {
  const cid = req.params.cid;
  if (!cid) return res.status(400).json({ success: false, error: 'CID kosong' });

  try {
    const doc = await db.collection('murid').doc(cid).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Murid tidak ditemukan' });
    }

    res.json({ success: true, data: doc.data() });
  } catch (err) {
    console.error('❌ Error ambil profil murid:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/guru/:uid - ambil data profil guru berdasarkan UID
app.get('/api/guru/:uid', async (req, res) => {
  const uid = req.params.uid;
  if (!uid) return res.status(400).json({ success: false, error: 'UID kosong' });

  try {
    const doc = await db.collection('guru').doc(uid).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Guru tidak ditemukan' });
    }

    res.json({ success: true, data: doc.data() });
  } catch (err) {
    console.error('❌ Error ambil profil guru:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/orangtua/:uid - ambil data profil orangtua berdasarkan UID
app.get('/api/orangtua/:uid', async (req, res) => {
  const uid = req.params.uid;
  if (!uid) return res.status(400).json({ success: false, error: 'UID kosong' });

  try {
    const doc = await db.collection('orangtua').doc(uid).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Orangtua tidak ditemukan' });
    }

    res.json({ success: true, data: doc.data() });
  } catch (err) {
    console.error('❌ Error ambil profil orangtua:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/progress-murid - ringkasan progres semua murid
app.get('/api/progress-murid', async (req, res) => {
  try {
    const muridSnap = await db.collection('progress_murid').get();
    const hasil = [];

    for (const doc of muridSnap.docs) {
      const cid = doc.id;
      const profilSnap = await db.collection('murid').doc(cid).get();
      const nama = profilSnap.exists ? (profilSnap.data().nama || '') : '';
      const kelas_id = profilSnap.exists ? (profilSnap.data().kelas_id || '-') : '-';

      const lessonsSnap = await db.collection('progress_murid').doc(cid).collection('lessons').get();
      const total = lessonsSnap.size;
      const selesai = lessonsSnap.docs.filter(l => l.data().status === 'selesai').length;
      const status = total === 0 ? 'Belum mulai' : (selesai === total ? 'Selesai semua' : 'Aktif');
      const percent = total > 0 ? Math.round((selesai / total) * 100) : 0;

      hasil.push({ cid, nama, kelas_id, total_lesson: total, progress_percent: percent, status });
    }

    res.json(hasil);
    try {
      await postToGAS('EL_STUDENT_PROGRESS', hasil);
    } catch (err) {
      console.error('Mirror STUDENT_PROGRESS gagal:', err);
    }
  } catch (err) {
    console.error('❌ Error get progress murid:', err);
    res.status(500).json([]);
  }
});

// GET /api/progress-murid/:cid - detail progres lesson per murid
app.get('/api/progress-murid/:cid', async (req, res) => {
  const { cid } = req.params;
  try {
    const snap = await db.collection('progress_murid').doc(cid).collection('lessons').get();
    const hasil = snap.docs.map(d => {
      const data = d.data();
      return {
        lesson: d.id,
        modul: data.modul || '',
        status: data.status || '',
        start: data.start_at ? new Date(data.start_at).toLocaleString() : '-',
        end: data.end_at ? new Date(data.end_at).toLocaleString() : '-',
        score: data.score || '-'
      };
    });
    res.json(hasil);
  } catch (err) {
    console.error('❌ Error get detail progress murid:', err);
    res.status(500).json([]);
  }
});

// GET /api/karya-anak - ambil semua karya anak
app.get('/api/karya-anak', async (req, res) => {
  try {
    const snap = await db.collection('karya_anak').orderBy('timestamp', 'desc').get();
    const hasil = [];
    for (const doc of snap.docs) {
      const data = doc.data();
      const id_karya = doc.id;
      const nama = data.nama || ''; // Jika disimpan
      hasil.push({
        id_karya,
        cid: data.cid,
        nama,
        judul: data.judul,
        link: data.link,
        tipe: data.tipe,
        timestamp: data.timestamp,
        status: data.status || 'pending'
      });
    }
    res.json(hasil);
  } catch (err) {
    console.error('❌ Gagal get karya:', err);
    res.status(500).json([]);
  }
});

// GET /api/karya-semua - gabungkan hasil quiz + karya anak
app.get('/api/karya-semua', async (req, res) => {
  try {
    const hasilGabung = [];
    const quizSnap = await db.collection('lesson_results').get();

    for (const doc of quizSnap.docs) {
      const data = doc.data();
      const cid = data.cid;
      const lesson = data.lesson;
      const nama = data.nama || ''; // optional, jika disimpan
      const quiz_teori = data.quiz_teori ?? '-';
      const quiz_praktek = data.quiz_praktek ?? '-';
      const timestamp = data.timestamp ?? null;

      // Ambil metadata karya anak dari koleksi nested (jika ada)
      let judul = '-', link = '-', tipe = '-', status = '-';

      try {
        const karyaRef = await db.collection('karya_anak').doc(cid).collection('lesson').doc(lesson).get();
        if (karyaRef.exists) {
          const karyaData = karyaRef.data();
          judul = karyaData.judul || '-';
          link = karyaData.link || '-';
          tipe = karyaData.tipe || '-';
          status = karyaData.status || '-';
        }
      } catch (e) {
        console.warn(`❗ Tidak ada karya untuk ${cid} - ${lesson}`);
      }

      hasilGabung.push({
        cid,
        nama,
        lesson,
        judul,
        link,
        tipe,
        quiz_teori,
        quiz_praktek,
        timestamp,
        status
      });
    }
    res.json(hasilGabung);
    try {
      await postToGAS('EL_STUDENT_WORKS', hasilGabung);
    } catch (err) {
      console.error('Mirror STUDENT_WORKS gagal:', err);
    }
  } catch (err) {
    console.error('❌ Gagal get karya_semua:', err);
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// DELETE /api/karya-anak/:id_karya - hapus karya anak
app.delete('/api/karya-anak/:id_karya', async (req, res) => {
  const { id_karya } = req.params;
  try {
    await db.collection('karya_anak').doc(id_karya).delete();
    res.status(200).json({ message: 'Deleted' });
  } catch (err) {
    console.error('❌ Gagal delete karya:', err);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// POST /api/karya-anak/highlight - tandai sebagai unggulan
app.post('/api/karya-anak/highlight', async (req, res) => {
  const { id_karya } = req.body;
  if (!id_karya) return res.status(400).json({ error: 'Missing ID' });
  try {
    await db.collection('karya_anak').doc(id_karya).update({ status: 'highlighted' });
    res.status(200).json({ message: 'Updated' });
  } catch (err) {
    console.error('❌ Gagal highlight karya:', err);
    res.status(500).json({ error: 'Failed to update' });
  }
});

// POST /api/assign-lesson - assign akses lesson ke akun berdasarkan cid
app.post('/api/assign-lesson', async (req, res) => {
  const { cid, lesson } = req.body;
  if (!cid || !lesson) {
    return res.status(400).json({ success: false, error: 'Data tidak lengkap' });
  }
  try {
    const akunRef = db.collection('akun').doc(cid);
    const akunSnap = await akunRef.get();
    if (!akunSnap.exists) {
      return res.status(404).json({ success: false, error: 'Akun tidak ditemukan' });
    }

    await akunRef.set({
      akses_lesson: admin.firestore.FieldValue.arrayUnion(lesson)
    }, { merge: true });

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error assign lesson:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/akses-lesson - daftar semua akses lesson
app.get('/api/akses-lesson', async (req, res) => {
  try {
    const akunSnap = await db.collection('akun').get();
    const lessonSnap = await db.collection('lessons').get();
    const lessonMap = {};
    lessonSnap.forEach(d => {
      const val = d.data();
      const code = d.id;
      lessonMap[code] = val.title || val.nama || '';
    });
    const result = [];
    akunSnap.forEach(doc => {
      const data = doc.data();
      const akses = Array.isArray(data.akses_lesson) ? data.akses_lesson : [];
      akses.forEach(code => {
        result.push({
          cid: data.cid || doc.id,
          nama: data.nama || '',
          code,
          title: lessonMap[code] || '',
          status: data.status || ''
        });
      });
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('❌ Error get akses lesson:', err);
    res.status(500).json([]);
  }
});

// DELETE /api/akses-lesson/:cid/:lesson - hapus akses lesson dari akun
app.delete('/api/akses-lesson/:cid/:lesson', async (req, res) => {
  const { cid, lesson } = req.params;
  if (!cid || !lesson) {
    return res.status(400).json({ success: false, error: 'Data tidak lengkap' });
  }
  try {
    await db.collection('akun').doc(cid).update({
      akses_lesson: admin.firestore.FieldValue.arrayRemove(lesson)
    });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error delete akses lesson:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});
// POST /api/selesai-kelas
// Endpoint untuk menyimpan status penyelesaian lesson oleh murid.
// Payload dikirim dari tombol "Selesai Kelas" di halaman lesson HTML.
// Data yang dikirim: { cid, modul, lesson, quiz_teori, quiz_praktek, jawaban_teori, jawaban_praktek, timestamp }
// Endpoint ini akan meneruskan data ke Google Apps Script untuk disimpan di sheet EL_LESSON_LOG.
app.post('/api/selesai-kelas', async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.cid || !payload.lesson) {
    return res.status(400).json({ success: false, error: 'Data tidak lengkap' });
  }

  try {
    const response = await fetch(process.env.WEB_APP_URL + '?action=selesaikanLesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error('❌ Error kirim ke Apps Script:', err);
    res.status(500).json({ success: false, error: 'Gagal menyimpan ke Apps Script' });
  }
});

// --- Google Cloud Text-to-Speech endpoint (/tts) ---
// Requires service account with Cloud Text-to-Speech permission.
// Env supported: GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 or SERVICE_ACCOUNT_KEY_BASE64 (JSON base64)
// Usage: POST /tts { text, lang?: 'id-ID', voice?: 'id-ID-Wavenet-A', speakingRate?:1.0, pitch?:0.0, volumeGainDb?:0.0 }
app.post('/tts', async (req, res) => {
  try {
    const { text, lang = 'id-ID', voice = 'id-ID-Wavenet-A', speakingRate = 1.0, pitch = 0.0, volumeGainDb = 0.0 } = req.body || {};
    if (!text || String(text).trim().length === 0) {
      return res.status(400).json({ error: 'Missing text' });
    }

    // Prepare GoogleAuth (use embedded credentials if provided)
    let credentials = null;
    try {
      const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 || process.env.SERVICE_ACCOUNT_KEY_BASE64;
      if (b64) credentials = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    } catch(_) { /* ignore */ }

    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      credentials: credentials || undefined
    });
    const client = await auth.getClient();
    const tokenResp = await client.getAccessToken();
    const accessToken = (typeof tokenResp === 'string') ? tokenResp : (tokenResp && tokenResp.token) || '';
    if (!accessToken) return res.status(500).json({ error: 'Failed to obtain GCP access token' });

    // Call Google TTS REST API
    const gRes = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: { text: String(text) },
        voice: { languageCode: lang, name: voice },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate,
          pitch,
          volumeGainDb
        }
      })
    });

    const data = await gRes.json().catch(() => ({}));
    if (!gRes.ok || !data || !data.audioContent) {
      return res.status(500).json({ error: 'GCP TTS failed', detail: data || null });
    }

    // Return base64 for front-end player
    return res.json({ audioBase64: data.audioContent });
  } catch (e) {
    console.error('❌ Google TTS error:', e?.response?.data || e.message || e);
    return res.status(500).json({ error: 'TTS exception' });
  }
});

// Default route ke index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Fallback 404
app.use((req, res) => {
  res.status(404).send('404 Not Found');
});

// Start server
http.listen(PORT, () => {
  console.log(`🚀 Server jalan di http://localhost:${PORT}`);
});
