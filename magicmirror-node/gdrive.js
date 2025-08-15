

// gdrive.js — helper for uploading files to Google Drive
// Supports OAuth user (My Drive) via refresh token, with optional Service Account fallback for Shared Drives

const { google } = require('googleapis');
const fs = require('fs');
const stream = require('stream');

// --- Create Drive client
function createDrive() {
  // Prefer OAuth user (My Drive) — simplest for personal Gmail accounts
  const CID = process.env.GDRIVE_OAUTH_CLIENT_ID;
  const SECRET = process.env.GDRIVE_OAUTH_CLIENT_SECRET;
  const REFRESH = process.env.GDRIVE_OAUTH_REFRESH_TOKEN;
  if (CID && SECRET && REFRESH) {
    const oauth2 = new google.auth.OAuth2(CID, SECRET);
    oauth2.setCredentials({ refresh_token: REFRESH });
    return google.drive({ version: 'v3', auth: oauth2 });
  }

  // Optional fallback: Service Account (use only with Shared Drives)
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 || process.env.SERVICE_ACCOUNT_KEY_BASE64;
  if (b64) {
    const credentials = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/drive']
    );
    return google.drive({ version: 'v3', auth });
  }

  throw new Error('No Drive credentials. Set OAuth env (GDRIVE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN), or GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 for SA.');
}

// --- Helpers
async function ensureFolderWritable(drive, folderId) {
  const res = await drive.files.get({
    fileId: folderId,
    fields: 'id, name, mimeType, driveId, capabilities(canAddChildren)',
    supportsAllDrives: true,
  });
  const meta = res.data;
  if (meta.mimeType !== 'application/vnd.google-apps.folder') {
    throw new Error(`Parent is not a folder: ${folderId}`);
  }
  if (!meta.capabilities || !meta.capabilities.canAddChildren) {
    throw new Error(`No write access to folder: ${meta.name} (${folderId})`);
  }
  return meta;
}

async function ensureAnyoneWithLink(drive, fileId) {
  try {
    await drive.permissions.create({
      fileId,
      supportsAllDrives: true,
      requestBody: { type: 'anyone', role: 'reader' },
    });
  } catch (e) {
    // Domain policy might block this; we still return the file link if accessible to the uploader's account
    console.warn('[gdrive] set public link failed:', e.message || e);
  }
}

async function getLinks(drive, fileId) {
  const meta = await drive.files.get({
    fileId,
    fields: 'id, name, webViewLink, webContentLink',
    supportsAllDrives: true,
  });
  return { id: meta.data.id, name: meta.data.name, webViewLink: meta.data.webViewLink, webContentLink: meta.data.webContentLink };
}

// --- Upload from Buffer
async function uploadBuffer({ buffer, fileName, mimeType = 'application/octet-stream', parentId }) {
  const drive = createDrive();
  if (parentId) await ensureFolderWritable(drive, parentId);

  const body = new stream.PassThrough();
  body.end(buffer);

  const createRes = await drive.files.create({
    requestBody: { name: fileName, mimeType, parents: parentId ? [parentId] : undefined },
    media: { mimeType, body },
    supportsAllDrives: true,
    fields: 'id',
  });

  const fileId = createRes.data.id;
  await ensureAnyoneWithLink(drive, fileId);
  const links = await getLinks(drive, fileId);
  return links; // {id, name, webViewLink, webContentLink}
}

// --- Upload from local file path
async function uploadFile({ localPath, fileName, mimeType = 'application/octet-stream', parentId }) {
  const drive = createDrive();
  if (parentId) await ensureFolderWritable(drive, parentId);

  const createRes = await drive.files.create({
    requestBody: { name: fileName || require('path').basename(localPath), mimeType, parents: parentId ? [parentId] : undefined },
    media: { mimeType, body: fs.createReadStream(localPath) },
    supportsAllDrives: true,
    fields: 'id',
  });

  const fileId = createRes.data.id;
  await ensureAnyoneWithLink(drive, fileId);
  const links = await getLinks(drive, fileId);
  return links;
}

module.exports = {
  createDrive,
  ensureFolderWritable,
  ensureAnyoneWithLink,
  uploadBuffer,
  uploadFile,
};