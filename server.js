/**
 * Server.js - Express Server untuk Offroad Motorcycle Trail Adventure
 * Melayani static files dari folder /public dan siap di-deploy ke Vercel/Render
 */

import express from 'express';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Path ke folder public
const publicPath = path.resolve(process.cwd(), 'public');

// Middleware untuk melayani static files (HTML, CSS, JS, assets)
app.use(express.static(publicPath));

// Fallback ke index.html untuk semua route (SPA friendly)
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(`Serving static files dari: ${publicPath}`);
});

export default app;
