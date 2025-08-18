# Magic Mirror & Queen's Academy Platform

## 1. Deskripsi Umum
Magic Mirror adalah modul AI untuk menganalisis wajah dan memberikan rekomendasi gaya secara personal. Proyek ini merupakan bagian dari platform **Queen's Academy** yang menyediakan dashboard pembelajaran dan manajemen karya bagi guru, murid, maupun orang tua.

Repositori ini berisi beberapa layanan:
- **magicmirror-node** – Backend Express dan aset web (dashboard, modul e-learning, Magic Mirror UI).
- **magicmirror-python** – Service Flask untuk analisis wajah dan generasi gambar/audio AI.
- **firebase-upload-backend** – Server tambahan untuk upload karya ke Firebase dan Google Sheets.

Pengguna akhir proyek adalah guru, murid, serta orang tua yang memantau perkembangan anak.

## 2. Struktur Direktori
Berikut struktur direktori utama:
```text
.
├── elearn/                 # Halaman playground sederhana
├── firebase-upload-backend/ # Upload ke Firebase & Google Sheets
├── firestore.rules         # Aturan akses Firestore
├── generate_html_from_json.js
├── generated_lessons/      # Hasil HTML modul yang diunggah
├── magicmirror-node/       # Server Express + frontend
│   ├── server.js
│   ├── uploadModul.js
│   ├── package.json
│   └── public/
│       └── elearn/        # Portal e-learning (murid, guru, ortu)
├── magicmirror-python/     # Backend Flask & analisis wajah
│   ├── app.py
│   ├── face_consultant_freshstart.py
│   ├── requirements.txt
│   └── public/
├── templates/              # Template HTML lesson
└── uploads/                # Temp penyimpanan upload
```
Keterangan singkat tiap folder dapat dilihat pada dokumentasi internal.

### Isi Folder `public/elearn`
Folder ini merupakan inti frontend e-learning. Beberapa file penting di dalamnya:
- `login-elearning.html` – halaman login utama.
- `murid.html`, `guru.html`, `ortu.html` – dashboard sesuai peran pengguna.
- `lesson*.html`, `modul*.html` – materi interaktif hasil konversi PDF.
- `script.js`, `firebase-tracker.js` – logika autentikasi dan penyimpanan progres.
- Subfolder `craft-coding/`, `doodle/`, dan `img/` menyimpan playground serta aset gambar.

## 3. Alur Sistem
Frontend utama berada di `magicmirror-node/public`. Browser terhubung dengan backend Node melalui WebSocket. Analisis wajah dijalankan oleh service Python dan hasilnya dikirim balik via WebSocket.

```
Browser ──WebSocket──► magicmirror-node ──emit──► magicmirror-python
   ▲                                       │
   └──────── result & faces ◄──────────────┘
```
Selain modul Magic Mirror, dashboard murid dan guru memanggil Google Apps Script (`elearning-api.gs`) menggunakan URL `WEB_APP_URL` untuk mengambil progres, karya, dan reward.

## 4. Menjalankan Lokal
1. Buat file `.env` di `magicmirror-node` dan `magicmirror-python`.
   Contoh variabel:
   ```bash
   # magicmirror-node
   SPREADSHEET_ID=your_google_sheet_id
   OPENAI_API_KEY=your_openai_api_key
   WHACENTER_DEVICE=your_whacenter_device
   WEB_APP_URL=https://script.google.com/macros/s/....../exec
   PORT=3000
   GSHEET_ID_EL=your_spreadsheet_id # optional
   SHEETS_POINTS_LOG_SHEET=logs # optional
   SHEETS_USER_STATS_SHEET=user_stats # optional

   # magicmirror-python
   OPENAI_API_KEY=your_openai_api_key
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   VOICE_ID=voice_id
   GDRIVE_FOLDER_ID=folder_id
   USE_ELEVENLABS=true
   ENV_MODE=dev
   PORT=10000
   ```
  Variabel `GSHEET_ID_EL` digunakan oleh sinkronisasi Google Sheets (`services/sheetsSync.js`).
  Set `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` dan spreadsheet ID yang sesuai agar sinkronisasi berjalan.
2. Install dependensi
   ```bash
   cd magicmirror-node && npm install
   cd ../magicmirror-python && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
   ```
3. Jalankan server
   ```bash
   # Node server
   cd magicmirror-node && npm start
   # Python service
   cd ../magicmirror-python && python app.py
   ```
Akses `http://localhost:3000` untuk frontend dan `http://localhost:10000` untuk API Python.

## 5. Deploy ke Produksi
- **Render.com** atau hosting lain dapat digunakan.
- Deploy `magicmirror-node` sebagai Web Service Node (build: `npm install`, start: `npm start`).
- Deploy `magicmirror-python` sebagai service terpisah dengan perintah `./start.sh` (Gunicorn).
- Pastikan environment variable sama seperti konfigurasi lokal.

## 6. Dependensi & Teknologi
- **OpenAI API** – rekomendasi gaya, pembuatan cerita, dan gambar (DALL‑E).
- **Replicate API** – generasi wajah virtual.
- **ElevenLabs** – opsional untuk sintesis suara stylist.
- **Google Sheets** – penyimpanan data murid, progress, dan login.
- **Firebase** – penyimpanan gambar karya dan koleksi Firestore.
- **Whacenter API** – pengiriman notifikasi WhatsApp.
- Node.js, Express, Socket.IO, serta Python + Flask.

## 7. Contoh Endpoint API
Beberapa endpoint penting:

| Method | Endpoint | Deskripsi |
|-------|---------|-----------|
| GET | `/sync-profile-anak` | Sinkronisasi data profil ke sheet `PROFILE_ANAK` |
| GET | `/reset-password` | Kirim link reset password via WhatsApp |
| POST | `/ganti-password` | Perbarui password user di Google Sheets |
| GET | `/login` | Validasi login dashboard murid |
| POST | `/api/save-karya` | Simpan metadata karya ke Google Sheets |
| POST | `/openai-api` | Proxy OpenAI untuk Lab Co-Pilot |
| POST | `/upload_photo` | Menerima foto base64 dari alat fisik |
| POST | `/push_faces_to_frontend` | Fallback push wajah hasil generate |
| POST | `/api/generate-story` | Buat cerita pendek untuk anak |
| POST | `/api/generate-story-with-images` | Cerita beserta ilustrasi |

Contoh respons JSON:
```json
{ "success": true, "story": "...." }
```

## 8. Fitur Utama
- **Dashboard Murid** – melihat progress, badge, dan materi.
- **Upload Karya** – kirim gambar ke Firebase dan tampil di feed.
- **Badge & Reward** – gambar badge tersimpan di `public/badges`.
- **Lesson Interaktif** – modul HTML hasil dari folder `generated_lessons`.
- **Magic Mirror** – analisis wajah real-time dan galeri virtual face.

## 9. Build & Deploy Frontend/Backend
- Jalankan `npm run build` jika ada script build pada sub‑projek (misalnya compiler). Untuk server utama cukup `npm start`.
- Python service dapat dijalankan via `gunicorn -w 1 app:app` atau script `start.sh`.
- Pastikan `uploads/` dan `generated_lessons/` tetap ada saat deploy.

## 10. Catatan Tambahan
- Kredensial Google/Firebase **jangan** dimasukkan ke repository publik.
- Beberapa endpoint masih bergantung pada koneksi ke Google Apps Script sehingga perlu koneksi internet.
- Tidak ada automated test; lakukan pengecekan manual setelah deploy.
