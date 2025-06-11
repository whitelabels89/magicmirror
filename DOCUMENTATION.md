# MagicMirror Project Documentation

## 1. Struktur Folder

```text
.
├── README.md
├── elearn/
│   ├── playground.html
│   ├── playground-script.js
│   └── playground-style.css
├── firebase-upload-backend/
│   ├── firebase_upload.js
│   └── package.json
├── firestore.rules
├── generate_html_from_json.js
├── generated_lessons/
├── magicmirror-node/
│   ├── server.js
│   ├── uploadModul.js
│   ├── package.json
│   └── public/
├── magicmirror-python/
│   ├── app.py
│   ├── face_consultant_freshstart.py
│   ├── requirements.txt
│   └── public/
├── templates/
│   └── lesson_template.html
└── uploads/
```

**Keterangan Singkat**

- **elearn/** – Halaman permainan dan playground e‑learning.
- **firebase-upload-backend/** – Backend Node.js untuk upload ke Firebase Storage dan Firestore.
- **magicmirror-node/** – Server Express yang menyediakan halaman web Magic Mirror, dashboard, dan API pendukung.
- **magicmirror-python/** – Backend Python (Flask) untuk analisis wajah, integrasi Replicate dan ElevenLabs.
- **templates/** – Template HTML untuk meng‑generate lesson secara otomatis.
- **generated_lessons/** – Hasil HTML dari modul yang diunggah.
- **uploads/** – Folder sementara penyimpanan file upload sebelum diproses.

## 2. Komponen Utama

### Frontend MagicMirror
Terdapat di `magicmirror-node/public`. Halaman utama `magicmirror.html` berinteraksi dengan backend melalui WebSocket untuk menerima foto pengguna dan menampilkan hasil rekomendasi.

### Backend Python
Berada di `magicmirror-python`. File `face_consultant_freshstart.py` menjalankan deteksi wajah, analisis bentuk wajah serta skin tone, dan memanggil Replicate API untuk menghasilkan gambar serta ElevenLabs untuk sintesis suara.

### Sistem E‑learning
- **Frontend**: halaman pada `magicmirror-node/public/elearn` seperti `murid.html`, `guru.html`, `dashboard-murid-style2.html`, dan lain‑lain.
- **Backend**: beberapa endpoint di `magicmirror-node/server.js` yang memanggil Google Apps Script (`elearning-api.gs`) melalui URL `WEB_APP_URL`.

### Sistem Upload ke Firebase
Direktori `firebase-upload-backend` menyediakan server tersendiri (`firebase_upload.js`) untuk mengunggah karya ke Firebase Storage dan menyimpan metadata ke Firestore serta Google Sheets.

### Sistem Psikotest & Dashboard Anak
Berbagai halaman dashboard di `magicmirror-node/public/dashboard` memanfaatkan data dari Google Sheets (PROFILE_ANAK dan sheet lainnya). Reset password dan ganti password diatur melalui endpoint `/reset-password` dan `/ganti-password`.

### RFID Salon & Dashboard Kursi
Proyek MagicMirror juga mendukung integrasi dengan alat fisik (RFID di salon). Server menerima foto dari alat melalui endpoint `/upload_photo` kemudian hasil AI dikirim kembali via WebSocket.

### AI Face Analysis & Audio Synthesis
`face_consultant_freshstart.py` memanfaatkan mediapipe untuk deteksi landmark, OpenAI API untuk rekomendasi fashion, Replicate API untuk virtual face generation, dan ElevenLabs (opsional) untuk menyuarakan hasil.

Diagram alur singkat:

```text
Browser ──WebSocket──► magicmirror-node ──emit──► magicmirror-python
   ▲                                       │
   └──────── result & faces ◄──────────────┘
```

## 3. Menjalankan Sistem Secara Lokal

1. **Clone repo** dan buat file `.env` pada dua direktori berikut:
   - `magicmirror-node/.env`
   - `magicmirror-python/.env`

   Contoh variabel penting:
   ```bash
   # magicmirror-node
   SPREADSHEET_ID=...        # ID Google Sheets
   OPENAI_API_KEY=...
   WHACENTER_DEVICE=...
   WEB_APP_URL=https://script.google.com/macros/s/....../exec
   PORT=3000

   # magicmirror-python
   OPENAI_API_KEY=...
   ELEVENLABS_API_KEY=...
   VOICE_ID=...
   GDRIVE_FOLDER_ID=...
   USE_ELEVENLABS=true
   ENV_MODE=dev
   PORT=10000
   ```

2. **Install dependensi Node.js**
   ```bash
   cd magicmirror-node
   npm install
   ```
3. **Install dependensi Python**
   ```bash
   cd magicmirror-python
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
4. **Jalankan backend Node**
   ```bash
   cd magicmirror-node
   npm start
   ```
5. **Jalankan backend Python**
   ```bash
   cd magicmirror-python
   python app.py      # atau ./start.sh
   ```
6. **Akses**
   - Node server: `http://localhost:3000`
   - Python API: `http://localhost:10000`
   - WebSocket secara default pada port Node (`/`)

## 4. Deploy ke Render / Hosting

- **Frontend & Node Backend**: deploy `magicmirror-node` pada service Web di Render dengan Node versi terbaru. Pastikan environment variable sama dengan `.env` lokal.
- **Python Backend**: deploy `magicmirror-python` sebagai service lain (Gunicorn start command `./start.sh`).
- **Routing**: jika menggunakan path‑based routing, arahkan `/elearn/*` ke direktori `magicmirror-node/public/elearn`.
- **Environment Variables**:
  - `OPENAI_API_KEY`, `WHACENTER_DEVICE`, `SPREADSHEET_ID`, `WEB_APP_URL`, `PORT` untuk Node.
  - `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `VOICE_ID`, `GDRIVE_FOLDER_ID`, `USE_ELEVENLABS`, `ENV_MODE`, `PORT` untuk Python.

## 5. Integrasi Eksternal

- **Replicate API** – digunakan untuk menghasilkan wajah virtual berdasarkan foto pengguna.
- **OpenAI API** – dipakai untuk rekomendasi (GPT‑4o) dan pembuatan cerita anak.
- **ElevenLabs** – opsional untuk menghasilkan audio hasil rekomendasi.
- **Google Sheets** – menyimpan data siswa, login, progress, dan metadata karya.
- **Firebase** – tempat penyimpanan gambar karya anak dan koleksi Firestore (`karya_anak`).
- **Whacenter API** – mengirimkan notifikasi WhatsApp (reset password, dll.).

## 6. Daftar Endpoint API (Ringkas)

Beberapa endpoint penting dari `magicmirror-node`:

| Method | Endpoint | Deskripsi |
|-------|---------|-----------|
| `GET` | `/sync-profile-anak` | Sinkronisasi data profil dari Form Responses 1 ke sheet PROFILE_ANAK |
| `GET` | `/reset-password` | Kirim link reset password via Whacenter |
| `POST` | `/ganti-password` | Update password user di Google Sheets |
| `GET` | `/login` | Validasi login dashboard anak |
| `POST` | `/api/save-karya` | Simpan metadata karya ke Google Sheets |
| `POST` | `/openai-api` | Proxy untuk Lab Co‑Pilot (OpenAI GPT) |
| `POST` | `/upload_photo` | Menerima foto base64 dari alat fisik |
| `POST` | `/push_faces_to_frontend` | Fallback push hasil generate wajah |
| `POST` | `/api/generate-story` | Generate cerita anak (GPT‑4o) |
| `POST` | `/api/generate-story-with-images` | Cerita + ilustrasi (DALL‑E) |
| `POST` | `/api/generate-kody-image` | Generate gambar maskot Kody |

Endpoint dari `firebase-upload-backend`:

| Method | Endpoint | Deskripsi |
|-------|---------|-----------|
| `GET` | `/generate-cqa` | Generate CID untuk akun baru |
| `POST` | `/api/daftar-akun-baru` | Simpan akun baru ke Firestore dan Sheets |
| `POST` | `/upload-kody-image` | Upload gambar ke Firebase Storage |
| `POST` | `/upload` | Upload karya umum ke Firebase |
| `GET` | `/feed-karya` | Ambil 10 karya terbaru dari Firestore |
| `POST` | `/update-profil` | Update profil via Apps Script |
| ... | dll. (lihat `firebase_upload.js`) |

Respons umumnya berupa JSON `{ success: true }` atau data sesuai kebutuhan.

## 7. Daftar Halaman Frontend

- `/magicmirror.html` – antarmuka Magic Mirror.
- `/dashboard/home.html` – feed karya publik.
- `/dashboard/dashboard.html` – dashboard anak.
- `/dashboard/storybook.html` – pembuat cerita anak.
- `/elearn/murid.html` – tampilan kelas murid.
- `/elearn/guru.html` – dashboard guru.
- `/elearn/petualangan-kody.html` – modul petualangan Kody.
- `/elearn/lesson*.html` – materi coding anak berdasarkan modul/lesson.

## 8. Modul & Lesson

File hasil unggahan modul berada di `generated_lessons/` dengan format `M#L#.html` (contoh `M1L1.html`). Template dasar ada di `templates/lesson_template.html`. Untuk menambah modul baru:

1. Siapkan PDF materi, soal, dan jawaban.
2. Gunakan endpoint `/api/upload-modul` (lihat `uploadModul.js`) untuk memproses PDF menjadi HTML otomatis.
3. File HTML akan tersimpan di folder `generated_lessons/` dan dapat diakses melalui `/generated_lessons/<lesson_id>.html`.

## 9. Tips dan Catatan Dev

- Pastikan kredensial Google dan Firebase tidak disimpan di repository publik.
- Folder `uploads/` dan `generated_lessons/` dapat dibersihkan secara berkala namun struktur folder tetap diperlukan.
- Beberapa endpoint masih mengandalkan Google Apps Script sehingga perlu koneksi internet ketika dijalankan.
- Karena tidak ada automated test, gunakan `npm start` dan `python app.py` untuk debugging manual.

## 10. Aset dan Desain

- Folder `public/badges`, `public/assets`, serta `public/illustrations` (di dalam `magicmirror-node/public`) menyimpan gambar pendukung UI. Penamaan file mengikuti deskripsi singkat menggunakan huruf kecil dan garis bawah (`nailart.jpg`, `hero_illustration.png`).
- Audio dan PDF yang diunggah melalui sistem ditempatkan pada Firebase Storage dengan nama file `<cid>_<uuid>.ext`.

---

Dokumentasi ini merangkum fungsi utama dan cara kerja proyek **MagicMirror**. Untuk informasi lebih detail tentang setiap script atau halaman, silakan jelajahi masing‑masing folder sesuai struktur di atas.
