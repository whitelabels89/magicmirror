const { google } = require('googleapis');

let sheetsClient = null;

// Resolve Spreadsheet IDs from multiple env names (backward compatible)
function resolveIds() {
  const single = process.env.SHEETS_SPREADSHEET_ID || process.env.GSHEET_ID_EL;
  const logId = process.env.SHEETS_POINTS_LOG_ID || single;
  const statsId = process.env.SHEETS_USER_STATS_ID || single;
  return { logId, statsId };
}

async function ensureTabExists({ sheets, spreadsheetId, title }) {
  // Check if sheet/tab exists; if not, create it.
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const found = (meta.data.sheets || []).some(s => (s.properties && s.properties.title) === title);
    if (found) return true;
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title } } }] }
      });
    } catch (e) {
      if (e && e.message && e.message.includes('already exists')) {
        console.warn('sheetsSync ensureTabExists: tab already exists', { spreadsheetId, title });
        return true;
      }
      throw e;
    }
    return true;
  } catch (e) {
    console.error('sheetsSync ensureTabExists', { spreadsheetId, title, error: e && e.message });
    return false;
  }
}

function getSheetsClient() {
  if (sheetsClient) return sheetsClient;
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 || process.env.SERVICE_ACCOUNT_KEY_BASE64;
  if (!b64) {
    console.warn('sheetsSync: missing GOOGLE_SERVICE_ACCOUNT_KEY_BASE64; disabled');
    return null;
  }
  try {
    const credentials = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    sheetsClient = google.sheets({ version: 'v4', auth });
    return sheetsClient;
  } catch (e) {
    console.error('sheetsSync init error', e);
    return null;
  }
}

const { logId: LOG_SHEET_ID, statsId: STATS_SHEET_ID } = resolveIds();
const LOG_TAB = process.env.SHEETS_POINTS_LOG_SHEET || 'points_log';
const STATS_TAB = process.env.SHEETS_USER_STATS_SHEET || 'user_stats';

/**
 * Append a point log row to Google Sheets via Service Account.
 * @param {{claimed_at:string, uid:string, course_id:string, lesson_id:string, points:number, source:string}} log
 */
async function appendPointLogRow(log) {
  const sheets = getSheetsClient();
  if (!sheets) { console.warn('sheetsSync appendPointLogRow: sheets client unavailable'); return; }
  if (!LOG_SHEET_ID) { console.warn('sheetsSync appendPointLogRow: missing LOG_SHEET_ID'); return; }
  // Ensure tab exists
  const ok = await ensureTabExists({ sheets, spreadsheetId: LOG_SHEET_ID, title: LOG_TAB });
  if (!ok) { console.error('sheetsSync appendPointLogRow: failed ensuring tab', { spreadsheetId: LOG_SHEET_ID, tab: LOG_TAB }); return; }
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: LOG_SHEET_ID,
      range: `${LOG_TAB}!A:F`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[log.claimed_at, log.uid, log.course_id, log.lesson_id, log.points, log.source]]
      }
    });
  } catch (err) {
    console.error('sheetsSync appendPointLogRow', { spreadsheetId: LOG_SHEET_ID, tab: LOG_TAB, error: err });
  }
}

/**
 * Upsert user stats row to Google Sheets via Service Account.
 * @param {{uid:string, display_name?:string, total_points:number, courses:Object, last_updated:string}} stats
 */
async function upsertUserStatsRow(stats) {
  const sheets = getSheetsClient();
  if (!sheets) { console.warn('sheetsSync upsertUserStatsRow: sheets client unavailable'); return; }
  if (!STATS_SHEET_ID) { console.warn('sheetsSync upsertUserStatsRow: missing STATS_SHEET_ID'); return; }
  // Ensure tab exists
  const ok = await ensureTabExists({ sheets, spreadsheetId: STATS_SHEET_ID, title: STATS_TAB });
  if (!ok) { console.error('sheetsSync upsertUserStatsRow: failed ensuring tab', { spreadsheetId: STATS_SHEET_ID, tab: STATS_TAB }); return; }
  try {
    const rangeAll = `${STATS_TAB}!A:E`;
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId: STATS_SHEET_ID, range: rangeAll });
    const rows = resp.data.values || [];

    // Prepare header & row values
    const header = ['uid', 'display_name', 'total_points', 'courses_json', 'last_updated'];
    const values = [[
      String(stats.uid || '').trim(),
      String(stats.display_name || ''),
      Number(stats.total_points || 0),
      JSON.stringify(stats.courses || {}),
      String(stats.last_updated || '')
    ]];

    // If no rows or header missing, write header first
    if (rows.length === 0 || (rows[0] || []).length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: STATS_SHEET_ID,
        range: `${STATS_TAB}!A1:E1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [header] }
      });
      await sheets.spreadsheets.values.append({
        spreadsheetId: STATS_SHEET_ID,
        range: rangeAll,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values }
      });
      return;
    }

    // Find existing row by UID (column A)
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const uidCell = (rows[i][0] || '').toString().trim();
      if (uidCell === String(stats.uid || '').trim()) {
        rowIndex = i + 1; // 1-based index in Sheets
        break;
      }
    }

    if (rowIndex === -1) {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: STATS_SHEET_ID,
        range: rangeAll,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values }
      });
    } else {
      // Update existing row
      const targetRange = `${STATS_TAB}!A${rowIndex}:E${rowIndex}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: STATS_SHEET_ID,
        range: targetRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values }
      });
    }
  } catch (err) {
    console.error('sheetsSync upsertUserStatsRow', { spreadsheetId: STATS_SHEET_ID, tab: STATS_TAB, error: err });
  }
}

module.exports = { appendPointLogRow, upsertUserStatsRow };
