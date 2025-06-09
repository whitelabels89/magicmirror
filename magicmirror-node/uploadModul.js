const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const multer = require('multer');
const generateHTML = require('../generate_html_from_json');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const generatedDir = path.join(__dirname, '..', 'generated_lessons');

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(generatedDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

router.post('/api/upload-modul', upload.fields([
  { name: 'materi_pdf', maxCount: 1 }, // materi + example
  { name: 'soal_pdf', maxCount: 1 },   // question
  { name: 'contoh_pdf', maxCount: 1 }  // answer
]), (req, res) => {
  const { modul_name, lesson_name, lesson_id } = req.body;
  if(!modul_name || !lesson_name || !lesson_id){
    return res.status(400).send('Data tidak lengkap');
  }
  if(!req.files || !req.files.materi_pdf || !req.files.soal_pdf || !req.files.contoh_pdf){
    return res.status(400).send('File belum lengkap');
  }
  const materiPath = req.files['materi_pdf'][0].path;
  const soalPath = req.files['soal_pdf'][0].path;
  const answerPath = req.files['contoh_pdf'][0].path;

  const py = path.join(__dirname, '..', 'parse_pdf_to_json.py');
  execFile('python3', [py, materiPath, soalPath, answerPath, lesson_id, lesson_name], { maxBuffer: 1024*500 }, (err, stdout, stderr) => {
    if (err) {
      console.error('Python error:', stderr || err);
      return res.status(500).send('Gagal memproses PDF: ' + (stderr || err.message));
    }
    let data;
    try {
      data = JSON.parse(stdout);
    } catch(e){
      console.error('JSON parse error', e);
      return res.status(500).send('Output tidak valid');
    }
    try {
      const html = generateHTML(data);
      const outPath = path.join(generatedDir, `${lesson_id}.html`);
      fs.writeFileSync(outPath, html, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${lesson_id}.html"`);
      res.send(html);
    } catch(e){
      console.error('Generate error', e);
      res.status(500).send('Gagal membuat HTML');
    }
  });
});

router.get('/api/list-lessons', (req,res) => {
  fs.readdir(generatedDir, (err, files) => {
    if(err) return res.json([]);
    res.json(files.filter(f=>f.endsWith('.html')));
  });
});

module.exports = router;
