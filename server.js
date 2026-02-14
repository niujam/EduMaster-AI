require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');

const generateRoute = require('./routes/generate');
const renderDocxRoute = require('./routes/renderDocx');

const app = express();

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://edumaster-ai.onrender.com',
    'https://www.edumaster-ai.onrender.com',
    process.env.PUBLIC_APP_URL
].filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index10.html'));
});

app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'privacy.html'));
});

app.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, 'terms.html'));
});

app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, 'success.html'));
});

app.use(express.static(__dirname));

app.get('/health', (req, res) => {
    res.status(200).json({ ok: true, service: 'ditari-api' });
});

app.use('/api/generate', generateRoute);
app.use('/api/render-docx', renderDocxRoute);

app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
    const multipartBoundaryError = typeof err?.message === 'string' && err.message.toLowerCase().includes('boundary not found');
    const status = err.statusCode || (err instanceof multer.MulterError || multipartBoundaryError ? 400 : 500);

    const safeError = {
        error: err.message || 'Internal server error'
    };

    if (process.env.NODE_ENV !== 'production') {
        safeError.stack = err.stack;
    }

    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.error(err);

    res.status(status).json(safeError);
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
