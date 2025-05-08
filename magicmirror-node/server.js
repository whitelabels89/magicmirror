const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });
const path = require('path');

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' })); // Ini supaya semua post json bisa kebaca

// Endpoint untuk menerima foto user
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

// Endpoint untuk menerima hasil AI stylist
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

// WebSocket Events
io.on('connection', (socket) => {
    console.log('✅ User connected via WebSocket');

    socket.on('user_photo', (data) => {
        console.log('📷 Foto user diterima dari browser, meneruskan ke Python server...');
        socket.broadcast.emit('user_photo', data); // broadcast ke semua selain pengirim
    });

    socket.on('send_ai_result', (data) => {
        console.log('🧠 Hasil AI Stylist dikirim dari Python.');
        // Karena data dari Python final format { recommendation: "text" }
        io.emit('ai_result', { recommendationText: data.recommendation });
    });

    socket.on('generated_faces', (data) => {
        console.log(`🖼️ ${data.faces.length} generated faces diterima dari Python.`);
        io.emit('generated_faces', data);
    });

    socket.on('request_capture', () => {
        console.log('📸 Browser minta capture foto.');
        io.emit('request_capture');
    });

    socket.on('disconnect', () => {
        console.log('⚡ User disconnected');
    });
});

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// 404 fallback
app.use((req, res) => {
    res.status(404).send('404 Not Found');
});

http.listen(PORT, () => {
    console.log(`🚀 Server jalan di http://localhost:${PORT}`);
});