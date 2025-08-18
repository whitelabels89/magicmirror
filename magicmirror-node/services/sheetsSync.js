const { google } = require('googleapis');

let sheetsClient = null;

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

const LOG_SHEET_ID = process.env.GSHEET_ID_EL;
const LOG_TAB = process.env.SHEETS_POINTS_LOG_SHEET || 'logs';
const STATS_SHEET_ID = process.env.GSHEET_ID_EL;
const STATS_TAB = process.env.SHEETS_USER_STATS_SHEET || 'user_stats';

/**
 * Append a point log row to Google Sheets via Service Account.
 * @param {{claimed_at:string, uid:string, course_id:string, lesson_id:string, points:number, source:string}} log
 */
async function appendPointLogRow(log) {
  const sheets = getSheetsClient();
  if (!sheets || !LOG_SHEET_ID) return;
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
    console.error('sheetsSync appendPointLogRow', err);
  }
}

/**
 * Upsert user stats row to Google Sheets via Service Account.
 * @param {{uid:string, display_name?:string, total_points:number, courses:Object, last_updated:string}} stats
 */
async function upsertUserStatsRow(stats) {
  const sheets = getSheetsClient();
  if (!sheets || !STATS_SHEET_ID) return;
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
    console.error('sheetsSync upsertUserStatsRow', err);
  }
}

module.exports = { appendPointLogRow, upsertUserStatsRow };
