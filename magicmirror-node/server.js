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

// Endpoint: create-checkout untuk Tripay payment
app.post("/create-checkout", async (req, res) => {
    const { nama, email, whatsapp } = req.body;

    if (!nama || !email || !whatsapp) {
        return res.status(400).json({ success: false, message: "Semua field wajib diisi" });
    }

    try {
        const response = await axios.post(
            "https://tripay.co.id/api/transaction/create",
            {
                method: "QRIS",
                merchant_ref: "QCEB1-" + Date.now(),
                amount: 15000,
                customer_name: nama,
                customer_email: email,
                customer_phone: whatsapp,
                order_items: [
                    {
                        sku: "QCEB1",
                        name: "QCEB1 Master Prompt",
                        price: 15000,
                        quantity: 1,
                    },
                ],
                callback_url: "https://queensacademy.id/api-callback",
                return_url: "https://queensacademy.id/ebook-checkout.html"
            },
            {
                headers: {
                    Authorization: "Bearer " + process.env.TRIPAY_API_KEY,
                },
            }
        );

        return res.json({ success: true, pay_url: response.data.data.checkout_url });

    } catch (err) {
        const detail = err.response?.data || err.message;
        console.error("❌ Tripay Error:", detail);
        return res.status(500).json({ success: false, message: "Gagal membuat transaksi", detail });
    }
});

// Endpoint: Tripay payment callback
app.post("/api-callback", async (req, res) => {
    const data = req.body;
    console.log("📩 Callback Tripay diterima:", JSON.stringify(data, null, 2));

    if (data.status === "PAID") {
        const payload = {
            reference: data.reference,
            merchant_ref: data.merchant_ref,
            payment_method: data.payment_method,
            payment_method_code: data.payment_method_code,
            total_amount: data.total_amount,
            fee_merchant: data.fee_merchant,
            fee_customer: data.fee_customer,
            amount_received: data.amount_received,
            is_closed_payment: data.is_closed_payment,
            status: data.status,
            paid_at: data.paid_at,
            note: data.note,
            timestamp_received: new Date().toISOString()
        };

        try {
            await axios.post(process.env.GOOGLE_SHEET_WEBHOOK, payload);
            console.log("✅ Data dikirim ke Google Sheet");
        } catch (err) {
            console.error("❌ Gagal kirim ke Google Sheet:", err.message);
        }

        try {
            const message = `Halo ${data.note || "kakak"}, terima kasih telah membeli eBook Prompt Master.\n\nBerikut link downloadnya:\nhttps://drive.google.com/file/d/1Egok1XjsWx_Ny9oCvK1ytbKUCwpk1MR8/view?usp=drive_link\n\nSalam sukses!`;
            await axios.post("https://app.whacenter.com/api/send", {
                device: process.env.WHACENTER_DEVICE,
                number: data.customer_phone || "",
                message
            });
            console.log("✅ WhatsApp dikirim via Whacenter");
        } catch (err) {
            console.error("❌ Gagal kirim WhatsApp:", err.message);
        }
    }

    res.status(200).send("Callback OK");
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
