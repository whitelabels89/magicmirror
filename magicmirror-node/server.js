const axios = require('axios');
require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });
const path = require('path');

const PORT = process.env.PORT || 3000;

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' })); // untuk terima JSON besar (seperti foto)

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

// Endpoint login user
app.get("/login", async (req, res) => {
    const { username, password } = req.query;
  
    // Fetch data dari Google Sheet PROFILE_ANAK
    const sheetData = await getProfileAnakData(); // Fungsi ini ambil data sheet
    const user = sheetData.find(row =>
      row.whatsapp.replace(/\s+/g, '') === username &&
      password === "cerdas123"
    );
  
    if (user) {
      res.json({ success: true, cid: user.cid });
    } else {
      res.json({ success: false });
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
    
    const response = await axios.post(
      "https://api.openai.com/v1/images/generations",
      {
        model: "dall-e-3",
        prompt,
        size: "512x512",
        n: 1
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        }
      }
    );

    const imageUrl = response.data.data[0].url;
    res.json({ success: true, imageUrl });
  } catch (error) {
    console.error("❌ Gagal generate gambar Kody:", error && error.response && error.response.data ? error.response.data : error.message);
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
