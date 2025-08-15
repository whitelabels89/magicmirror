const express = require('express');
const router = express.Router();
const { google } = require('googleapis');

function getSheetsClient() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 || process.env.SERVICE_ACCOUNT_KEY_BASE64;
  if (!b64) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 for Sheets');
  const credentials = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  const auth = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    ['https://www.googleapis.com/auth/spreadsheets.readonly']
  );
  return google.sheets({ version: 'v4', auth });
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function like(haystack, needle) {
  if (!needle) return true;
  return String(haystack || '').toLowerCase().includes(String(needle).toLowerCase());
}

router.get('/log', async (req, res) => {
  try {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) return res.status(500).json({ ok:false, error:'SPREADSHEET_ID env not set' });

    const sheetName = process.env.GSHEET_TAB_WORKSHEET || 'EL_WORKSHEET';
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 1000);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

    const sheets = getSheetsClient();
    const range = `${sheetName}!A1:Z`;
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = resp.data.values || [];
    if (rows.length < 2) return res.json({ ok:true, total:0, items:[] });

    const headers = rows[0].map(h => String(h || '').trim());
    const idx = Object.fromEntries(headers.map((h,i)=>[h,i]));
    const asObj = (arr) => {
      const o = {};
      headers.forEach((h,i)=> o[h] = arr[i] ?? '');
      return o;
    };

    // Ambil parameter filter
    const { cid, murid, course_id, lesson_id, q } = req.query;
    const dateFrom = parseDate(req.query.date_from);
    const dateTo   = parseDate(req.query.date_to && req.query.date_to + 'T23:59:59');

    // Mapping standar kolom (sesuaikan dengan header Sheet kamu)
    // Disarankan header minimal: ts, cid, murid_uid, nama_anak, course_id, lesson_id, drive_url, storage_url, answers_text
    const data = rows.slice(1).map(asObj).filter(r => {
      // tanggal (ts) bisa berupa ISO/string
      let passDate = true;
      if (dateFrom || dateTo) {
        const d = parseDate(r.ts);
        passDate = !!d && (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
      }
      return (
        passDate &&
        (!cid || String(r.cid || '').toLowerCase() === String(cid).toLowerCase()) &&
        (!murid || like(r.nama_anak || r.murid_uid, murid)) &&
        (!course_id || String(r.course_id || '').toLowerCase() === String(course_id).toLowerCase()) &&
        (!lesson_id || String(r.lesson_id || '').toLowerCase() === String(lesson_id).toLowerCase()) &&
        (!q || (like(r.nama_anak, q) || like(r.murid_uid, q) || like(r.answers_text, q) || like(r.drive_url, q)))
      );
    });

    const total = data.length;
    const items = data.slice(offset, offset + limit);
    return res.json({ ok:true, total, limit, offset, items, headers });
  } catch (e) {
    console.error('[worksheet-log] error:', e);
    return res.status(500).json({ ok:false, error: e.message || 'Internal error' });
  }
});

module.exports = router;
