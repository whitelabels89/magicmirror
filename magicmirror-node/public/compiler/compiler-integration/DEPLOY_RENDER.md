# 🚀 Deploy ke Render - Panduan Lengkap

## 📋 Langkah-langkah Deploy

### 1. Push ke Git Repository

```bash
# Masuk ke folder compiler-integration
cd compiler-integration

# Initialize git (jika belum ada)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Queen's Academy iCoding Compiler"

# Add remote repository (ganti dengan URL repo Anda)
git remote add origin https://github.com/username/queens-academy-compiler.git

# Push ke GitHub
git push -u origin main
```

### 2. Setup di Render

1. **Login ke [Render.com](https://render.com)**
2. **Click "New +"** → **"Web Service"**
3. **Connect GitHub repository** yang baru Anda push
4. **Fill setup form:**

   - **Name**: `queens-academy-compiler`
   - **Region**: `Singapore` (atau terdekat)
   - **Branch**: `main`
   - **Root Directory**: `/` (kosong)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

5. **Click "Create Web Service"**

### 3. Environment Variables (Optional)

Jika diperlukan, tambahkan di Render Dashboard:
- `NODE_ENV`: `production`
- `PORT`: (akan otomatis di-set oleh Render)

### 4. Deployment Process

Render akan otomatis:
1. Clone repository Anda
2. Run `npm install`
3. Run `npm start`
4. Deploy ke URL: `https://queens-academy-compiler.onrender.com`

---

## 📁 Publish Directory Structure

Untuk deployment, struktur folder harus seperti ini:

```
queens-academy-compiler/
├── 📄 package.json        # Dependencies dan scripts
├── 📄 server.js           # Express server untuk production
├── 📄 compiler.html       # Main HTML file
├── 📄 render.yaml         # Render config (optional)
├── 📄 .gitignore          # Git ignore
├── 📄 README.md           # Documentation
└── 📄 DEPLOY_RENDER.md    # File ini
```

**File utama yang harus ada:**
- ✅ `package.json` - Dependencies
- ✅ `server.js` - Server untuk production
- ✅ `compiler.html` - Main application
- ✅ `.gitignore` - Git ignore rules

---

## 🔧 Scripts yang Diperlukan

File `package.json` harus punya scripts:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "vite",
    "build": "tsc && vite build"
  }
}
```

---

## 🌐 Setelah Deploy

### URL Akses:
- **Production**: `https://queens-academy-compiler.onrender.com`
- **Status**: Check di Render dashboard

### Testing:
1. Buka URL production
2. Test semua fitur compiler
3. Test di berbagai browser
4. Test di mobile device

---

## 🆘 Troubleshooting

### Build Failed:
```bash
# Check logs di Render dashboard
# Biasanya masalah dependencies
```

### Server tidak start:
```bash
# Pastikan server.js ada
# Pastikan PORT menggunakan process.env.PORT
```

### 404 Error:
```bash
# Pastikan compiler.html ada di root folder
# Check routing di server.js
```

---

## 📝 Checklist Deployment

**Pre-deployment:**
- [ ] package.json configured correctly
- [ ] server.js created and tested
- [ ] compiler.html ready
- [ ] .gitignore setup
- [ ] All files committed to git

**Deploy process:**
- [ ] Repository pushed to GitHub
- [ ] Render service created
- [ ] Build command: `npm install`
- [ ] Start command: `npm start`
- [ ] Environment variables set (if needed)

**Post-deployment:**
- [ ] Site accessible via Render URL
- [ ] All compiler features working
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Performance acceptable

---

## 🔄 Auto-deploy Setup

Render akan auto-deploy setiap kali Anda push ke GitHub:

```bash
# Make changes
git add .
git commit -m "Update: [describe changes]"
git push origin main

# Render will auto-deploy in ~2-3 minutes
```

---

**Ready untuk deploy! 🚀**