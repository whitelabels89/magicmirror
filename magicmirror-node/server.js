const express = require('express');
const app = express();
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });
const path = require('path');
const { google } = require('googleapis');
const uploadModulRouter = require('./uploadModul');
const admin = require('firebase-admin');

// POST /api/assign-murid-ke-kelas - assign murid ke kelas/lesson
app.post('/api/assign-murid-ke-kelas', async (req, res) => {
  const { uid, kelas_id } = req.body;
  if (!uid || !kelas_id) {
    return res.status(400).json({ success: false, error: 'Data tidak lengkap' });
  }
  try {
    const muridRef = db.collection('murid').doc(uid);
    const muridSnap = await muridRef.get();
    if (!muridSnap.exists) {
      return res.status(404).json({ success: false, error: 'Murid tidak ditemukan' });
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
      murid: admin.firestore.FieldValue.arrayUnion(uid)
    });

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error assign murid:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Init Firebase Admin
if (!admin.apps.length) {
  const saBase64 = process.env.SERVICE_ACCOUNT_KEY_BASE64;
  if (saBase64) {
    const serviceAccount = JSON.parse(Buffer.from(saBase64, 'base64').toString('utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    admin.initializeApp();
  }
}
const db = admin.firestore();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // untuk terima JSON besar (seperti foto)
app.use('/generated_lessons', express.static(path.join(__dirname, '..', 'generated_lessons')));
app.use(uploadModulRouter);

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

// ======= E-learning Moderator Endpoints =======
// GET /api/semua-murid - daftar semua murid (uid, nama, email)
app.get('/api/semua-murid', async (req, res) => {
  try {
    const snap = await db.collection('murid').get();
    const data = snap.docs.map(d => {
      const val = d.data();
      return { uid: d.id, nama: val.nama || '', email: val.email || '' };
    });
    res.json(data);
  } catch (err) {
    console.error('❌ Error get semua murid:', err);
    res.status(500).json([]);
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
// Endpoint: proxy OpenAI untuk Lab Co-Pilot

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