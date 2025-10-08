const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { google } = require('googleapis');
const stream = require('stream');
const crypto = require('crypto');
const { uploadBuffer, ensureFolderWritable, createDrive } = require('../../gdrive');
const { awardPoints } = require('../../services/pointsService');

// Debug logger (set DEBUG_WORKSHEET=1 to enable)
const DEBUG_WORKSHEET = process.env.DEBUG_WORKSHEET === '1';
function dlog(...args){ if (DEBUG_WORKSHEET) console.log('[worksheet]', ...args); }

// simple in-memory rate limit: 10 requests per minute per IP
const RATE_LIMIT = 10;
const rateMap = new Map();
function rateLimiter(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const timestamps = rateMap.get(ip) || [];
  const recent = timestamps.filter(t => now - t < windowMs);
  recent.push(now);
  rateMap.set(ip, recent);
  if (recent.length > RATE_LIMIT) {
    return res.status(429).json({ ok: false, code: 'rate_limit', message: 'Too many requests' });
  }
  next();
}

async function getGoogleClient() {
  const base64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 || process.env.SERVICE_ACCOUNT_KEY_BASE64;
  if (!base64) throw new Error('Missing service account key');
  const credentials = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets'
    ]
  });
  return await auth.getClient();
}
function getDrive(client) {
  return google.drive({ version: 'v3', auth: client });
}
async function assertParentWriteable(drive, parentId) {
  const meta = await drive.files.get({
    fileId: parentId,
    fields: 'id,name,mimeType,driveId,capabilities(canAddChildren)',
    supportsAllDrives: true,
  });
  if (meta.data.mimeType !== 'application/vnd.google-apps.folder') {
    throw new Error(`PARENT_NOT_FOLDER:${parentId}`);
  }
  if (!meta.data.capabilities?.canAddChildren) {
    throw new Error(`NO_WRITE_ACCESS_PARENT:${parentId}`);
  }
  return meta.data;
}
async function ensureAnyoneWithLink(drive, fileId) {
  try {
    await drive.permissions.create({
      fileId,
      supportsAllDrives: true,
      requestBody: { role: 'reader', type: 'anyone' },
    });
  } catch (e) {
    console.warn('[worksheet] drive set public link failed:', e?.message || e);
  }
}
function getOAuthDriveIfAvailable() {
  const { google } = require('googleapis');
  const cid = process.env.GDRIVE_OAUTH_CLIENT_ID;
  const secret = process.env.GDRIVE_OAUTH_CLIENT_SECRET;
  const refresh = process.env.GDRIVE_OAUTH_REFRESH_TOKEN;
  if (!cid || !secret || !refresh) return null;
  const oAuth2 = new google.auth.OAuth2(cid, secret);
  oAuth2.setCredentials({ refresh_token: refresh });
  return google.drive({ version: 'v3', auth: oAuth2 });
}

// Health/auth check
router.get('/ping', (req, res) => {
  const enabled = process.env.ENABLE_WORKSHEET_SUBMIT === '1';
  res.json({ ok: true, enabled, user: req.user || null, time: Date.now() });
});

// Quick debug endpoint (diagnose SA & bucket)
router.get('/debug', async (req, res) => {
  try {
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || null;
    const out = {
      ok: true,
      env_bucket: bucketName,
      admin_inited: !!admin.apps.length,
      admin_project_id: admin.apps.length ? (admin.app().options.projectId || admin.app().options.projectID || null) : null,
      bucket_exists: null,
      test_write: null
    };
    if (!bucketName) {
      out.ok = false;
      out.bucket_exists = false;
      return res.status(500).json(out);
    }
    const bucket = admin.storage().bucket(bucketName);
    const [exists] = await bucket.exists().catch(e => {
      out.ok = false;
      out.bucket_exists = false;
      out.test_write = 'exists_error: ' + e.message;
      return [false];
    });
    out.bucket_exists = !!exists;
    if (exists && String(req.query.test || '0') === '1') {
      try {
        const p = `diagnostic/test-${Date.now()}.txt`;
        await bucket.file(p).save(Buffer.from('ping'), { contentType: 'text/plain' });
        const [exists2] = await bucket.file(p).exists();
        out.test_write = exists2 ? 'ok' : 'not_found_after_write';
      } catch (e) {
        out.ok = false;
        out.test_write = 'write_error: ' + e.message;
        return res.status(500).json(out);
      }
    }
    return res.json(out);
  } catch (e) {
    return res.status(500).json({ ok:false, message:e.message });
  }
});

const WORKSHEET_SHORTLINK_COLLECTION = process.env.WORKSHEET_SHORTLINK_COLLECTION || 'worksheet_shortlinks';

function generateShortCode() {
  return crypto.randomBytes(4).toString('hex');
}

async function createWorksheetShortLink(db, data) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateShortCode();
    const ref = db.collection(WORKSHEET_SHORTLINK_COLLECTION).doc(code);
    try {
      await ref.create({
        ...data,
        code,
        target_url: data.storage_url || data.drive_url || '',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      return code;
    } catch (err) {
      const msg = err && err.message ? err.message : '';
      if (err && (err.code === 6 || err.code === 'already-exists' || /already exists/i.test(msg))) {
        continue;
      }
      throw err;
    }
  }
  throw new Error('SHORTLINK_GENERATION_FAILED');
}

function resolvePublicBaseUrl(req) {
  const envUrl = (process.env.WORKSHEET_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || '').trim();
  if (envUrl) return envUrl;
  const host = req.get('x-forwarded-host') || req.get('host');
  if (!host) return '';
  const protoHeader = req.get('x-forwarded-proto');
  const proto = (protoHeader ? protoHeader.split(',')[0] : (req.protocol || 'https')).trim() || 'https';
  return `${proto}://${host}`;
}

router.post('/submit', rateLimiter, async (req, res) => {
  try {
    dlog('POST /submit hit');
    dlog('req.user:', req.user);
    dlog('content-type:', req.headers['content-type']);

    if (process.env.ENABLE_WORKSHEET_SUBMIT !== '1') {
      return res.status(503).json({ ok: false, code: 'disabled', message: 'Worksheet submit disabled' });
    }

    const user = req.user || {};
    const role = (user.role || '').toLowerCase();
    if (!['murid', 'guru', 'moderator'].includes(role)) {
      return res.status(403).json({ ok: false, code: 'forbidden', message: 'Forbidden' });
    }

    const {
      murid_uid,
      cid = '',
      nama_anak = '',
      course_id,
      lesson_id,
      answers_text = '',
      screenshot_base64
    } = req.body || {};

    dlog('payload meta:', { murid_uid, cid, nama_anak, course_id, lesson_id, answers_len: (answers_text||'').length, screenshot_len: (screenshot_base64||'').length });

    if (!murid_uid || !course_id || !lesson_id || !screenshot_base64) {
      return res.status(400).json({ ok: false, code: 'invalid', message: 'Missing required fields' });
    }
    if (!screenshot_base64 || screenshot_base64.length < 100) {
      return res.status(400).json({ ok: false, code: 'invalid_image', message: 'Screenshot is missing or too small' });
    }

    const ts = Date.now();
    const buffer = Buffer.from(screenshot_base64, 'base64');

    // --- Stage: Firebase Storage ---
    let storageUrl = '';
    try {
      const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
      if (!bucketName) throw new Error('FIREBASE_STORAGE_BUCKET env not set (expected <project-id>.appspot.com)');
      dlog('using storage bucket:', bucketName);
      const bucket = admin.storage().bucket(bucketName);
      const storagePath = `worksheets/${course_id}/${lesson_id}/${murid_uid}/${ts}.png`;
      const file = bucket.file(storagePath);
      await file.save(buffer, { contentType: 'image/png' });
      [storageUrl] = await file.getSignedUrl({ action: 'read', expires: '03-01-2500' });
    } catch (e) {
      console.error('storage error', e);
      return res.status(500).json({ ok:false, code:'storage_error', message:e.message || 'Storage error' });
    }

    // --- Stage: Google Drive ---
    let driveUrl = '';
    let driveFileId = '';
    try {
      const parentId = process.env.GDRIVE_WORKSHEET_FOLDER_ID;
      if (!parentId) throw new Error('GDRIVE_WORKSHEET_FOLDER_ID env not set');

      // Optional explicit precheck (throws if not writable / not a folder)
      try {
        await ensureFolderWritable(createDrive(), parentId);
      } catch (e) {
        // If no Drive creds available, let uploadBuffer produce a clearer error
        if (!/No Drive credentials/i.test(String(e && e.message))) throw e;
      }

      const fileName = `${ts}_${course_id}_${lesson_id}_${murid_uid}.png`;
      const links = await uploadBuffer({ buffer, fileName, mimeType: 'image/png', parentId });
      driveFileId = links.id;
      driveUrl = links.webViewLink || links.webContentLink || '';
      if (!driveUrl) throw new Error('NO_DRIVE_LINK_RETURNED');
    } catch (e) {
      console.error('drive error', e);
      return res.status(500).json({ ok:false, code:'drive_error', message:e.message || 'Drive error' });
    }

    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) {
      const err = new Error('SPREADSHEET_ID env not set');
      console.error('sheets error', err);
      return res.status(500).json({ ok: false, code: 'sheets_error', message: err.message });
    }

    let sheets;
    try {
      const client = await getGoogleClient();
      sheets = google.sheets({ version: 'v4', auth: client });
    } catch (e) {
      console.error('sheets error', e);
      return res.status(500).json({ ok: false, code: 'sheets_error', message: e.message || 'Sheets error' });
    }

    const sheetRow = [
      new Date(ts).toISOString(),
      murid_uid,
      cid,
      nama_anak,
      course_id,
      lesson_id,
      user.uid,
      role,
      (answers_text || '').slice(0, 5000),
      storageUrl,
      driveUrl
    ];

    const db = admin.firestore();
    const docId = `${murid_uid}_${course_id}_${lesson_id}_${ts}`;

    const sheetsPromise = sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'EL_WORKSHEET',
      valueInputOption: 'RAW',
      requestBody: { values: [sheetRow] }
    });

    const firestorePromise = db.collection('worksheets').doc(docId).set({
      ts,
      murid_uid,
      cid,
      nama_anak,
      course_id,
      lesson_id,
      submitted_by_uid: user.uid,
      submitted_by_role: role,
      answers_text: answers_text,
      storage_url: storageUrl,
      drive_file_id: driveFileId,
      drive_url: driveUrl,
      sheet_row_url_storage: storageUrl,
      sheet_row_url_drive: driveUrl
    });

    const pointsPromise = (async () => {
      try {
        return await awardPoints({
          uid: user.uid,
          courseId: course_id,
          lessonId: lesson_id,
          source: 'worksheet_submit'
        });
      } catch (e) {
        console.error('awardPoints failed:', e);
        return { added: 0, total_points: 0 };
      }
    })();

    const [sheetResult, firestoreResult] = await Promise.allSettled([sheetsPromise, firestorePromise]);

    if (sheetResult.status === 'rejected') {
      const err = sheetResult.reason || new Error('Sheets error');
      console.error('sheets error', err);
      return res.status(500).json({ ok: false, code: 'sheets_error', message: err.message || 'Sheets error' });
    }

    if (firestoreResult.status === 'rejected') {
      const err = firestoreResult.reason || new Error('Firestore error');
      console.error('firestore error', err);
      return res.status(500).json({ ok: false, code: 'firestore_error', message: err.message || 'Firestore error' });
    }

    let shortCode = '';
    let shortPath = '';
    let shortUrl = '';
    try {
      const code = await createWorksheetShortLink(db, {
        worksheet_doc_id: docId,
        storage_url: storageUrl,
        drive_url: driveUrl,
        murid_uid,
        course_id,
        lesson_id,
        submitted_by_uid: user.uid || '',
        submitted_by_role: role || '',
      });
      if (code) {
        shortCode = code;
        shortPath = `/ws/${code}`;
        const baseUrl = resolvePublicBaseUrl(req);
        if (baseUrl) {
          try {
            shortUrl = new URL(shortPath, baseUrl).toString();
          } catch (err) {
            console.warn('failed to build worksheet short url', err);
          }
        }
        try {
          await db.collection('worksheets').doc(docId).set({
            short_code: shortCode,
            short_path: shortPath,
            short_url: shortUrl,
          }, { merge: true });
        } catch (err) {
          console.warn('failed to attach short link to worksheet doc', err);
        }
      }
    } catch (err) {
      console.warn('failed to create worksheet short link', err);
    }

    const points = await pointsPromise;

    return res.json({
      ok: true,
      storage_url: storageUrl,
      drive_url: driveUrl,
      short_code: shortCode,
      short_path: shortPath,
      short_url: shortUrl,
      sheet: { tab: 'EL_WORKSHEET' },
      points
    });
  } catch (err) {
    console.error('worksheet submit error:', err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, code: 'internal', message: err.message || 'Server error' });
  }
});

module.exports = router;
