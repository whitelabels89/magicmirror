const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { google } = require('googleapis');
const stream = require('stream');

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
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets'
    ]
  });
  return await auth.getClient();
}

// Health/auth check
router.get('/ping', (req, res) => {
  const enabled = process.env.ENABLE_WORKSHEET_SUBMIT === '1';
  res.json({ ok: true, enabled, user: req.user || null, time: Date.now() });
});

router.post('/submit', rateLimiter, async (req, res) => {
  try {
    dlog('POST /submit hit');
    dlog('req.user:', req.user);
    dlog('content-type:', req.headers['content-type']);

    if (process.env.ENABLE_WORKSHEET_SUBMIT !== '1') {
      return res.status(503).json({ ok: false, code: 'disabled', message: 'Worksheet submit disabled' });
    }

    const user = req.user || {};
    if (!['guru', 'moderator'].includes(user.role)) {
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

    // upload to Firebase Storage
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      throw new Error('FIREBASE_STORAGE_BUCKET env not set (expected something like <project-id>.appspot.com)');
    }
    dlog('using storage bucket:', bucketName);
    const bucket = admin.storage().bucket(bucketName);
    const storagePath = `worksheets/${course_id}/${lesson_id}/${murid_uid}/${ts}.png`;
    const file = bucket.file(storagePath);
    await file.save(buffer, { contentType: 'image/png' });
    const [storageUrl] = await file.getSignedUrl({ action: 'read', expires: '03-01-2500' });

    // upload to Google Drive
    const client = await getGoogleClient();
    const drive = google.drive({ version: 'v3', auth: client });
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    const driveResp = await drive.files.create({
      requestBody: {
        name: `${ts}_${course_id}_${lesson_id}_${murid_uid}.png`,
        parents: [process.env.GDRIVE_WORKSHEET_FOLDER_ID].filter(Boolean),
        mimeType: 'image/png'
      },
      media: { mimeType: 'image/png', body: bufferStream },
      fields: 'id, webViewLink, webContentLink'
    });
    const driveFileId = driveResp.data.id;
    try {
      await drive.permissions.create({ fileId: driveFileId, requestBody: { role: 'reader', type: 'anyone' } });
    } catch (e) {
      console.error('drive permission error', e);
    }
    const driveUrl = driveResp.data.webViewLink || driveResp.data.webContentLink || '';

    // append to Google Sheets
    const sheets = google.sheets({ version: 'v4', auth: client });
    const sheetRow = [
      new Date(ts).toISOString(),
      murid_uid,
      cid,
      nama_anak,
      course_id,
      lesson_id,
      user.uid,
      user.role,
      answers_text.slice(0, 5000),
      storageUrl,
      driveUrl
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'EL_WORKSHEET',
      valueInputOption: 'RAW',
      requestBody: { values: [sheetRow] }
    });

    // save to Firestore
    const db = admin.firestore();
    const docId = `${murid_uid}_${course_id}_${lesson_id}_${ts}`;
    await db.collection('worksheets').doc(docId).set({
      ts,
      murid_uid,
      cid,
      nama_anak,
      course_id,
      lesson_id,
      submitted_by_uid: user.uid,
      submitted_by_role: user.role,
      answers_text: answers_text,
      storage_url: storageUrl,
      drive_file_id: driveFileId,
      drive_url: driveUrl,
      sheet_row_url_storage: storageUrl,
      sheet_row_url_drive: driveUrl
    });

    res.json({ ok: true, storage_url: storageUrl, drive_url: driveUrl, sheet: { tab: 'EL_WORKSHEET' } });
  } catch (err) {
    console.error('worksheet submit error:', err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, code: 'internal', message: 'Server error' });
  }
});

module.exports = router;
