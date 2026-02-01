require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

console.log('Test server starting...');

const PORT = 3000;
const server = app.listen(PORT, 'localhost', () => {
  console.log(`✅ Test server listening on port ${PORT}`);
});

console.log('Test server setup complete');
