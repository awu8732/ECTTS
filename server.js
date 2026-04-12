/* ============================================
   VoiceKeys — Lightweight TTS Proxy Server
   Keeps the Google Cloud API key server-side.
   ============================================ */

require('dotenv').config();
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Configuration ──────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY || '';

if (!GOOGLE_TTS_API_KEY) {
  console.warn('\n⚠  GOOGLE_TTS_API_KEY is not set.');
  console.warn('   Export it before starting:');
  console.warn('   export GOOGLE_TTS_API_KEY="AIza..."');
  console.warn('   The app will fall back to browser TTS until a key is provided.\n');
}

const GOOGLE_TTS_BASE = 'https://texttospeech.googleapis.com/v1';

// ── MIME types ─────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

// ── Helpers ────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function proxyToGoogle(googlePath, method, body, res) {
  const separator = googlePath.includes('?') ? '&' : '?';
  const url = `${GOOGLE_TTS_BASE}${googlePath}${separator}key=${GOOGLE_TTS_API_KEY}`;
  const parsed = new URL(url);

  const options = {
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search,
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  const greq = https.request(options, (gres) => {
    const chunks = [];
    gres.on('data', c => chunks.push(c));
    gres.on('end', () => {
      const data = Buffer.concat(chunks);
      res.writeHead(gres.statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(data);
    });
  });

  greq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  });

  if (body && body.length > 0) greq.write(body);
  greq.end();
}

// ── Server ─────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = urlObj.pathname;

  // ── CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  // ── API: check if key is configured
  if (pathname === '/api/tts/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ configured: !!GOOGLE_TTS_API_KEY }));
  }

  // ── API: synthesize speech
  if (pathname === '/api/tts/synthesize' && req.method === 'POST') {
    if (!GOOGLE_TTS_API_KEY) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'API key not configured' }));
    }
    const body = await readBody(req);
    return proxyToGoogle('/text:synthesize', 'POST', body, res);
  }

  // ── API: list voices
  if (pathname === '/api/tts/voices') {
    if (!GOOGLE_TTS_API_KEY) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'API key not configured' }));
    }
    const lang = urlObj.searchParams.get('lang') || '';
    const googlePath = lang ? `/voices?languageCode=${encodeURIComponent(lang)}` : '/voices';
    return proxyToGoogle(googlePath, 'GET', null, res);
  }

  // ── Static file serving ──────────────────────────────────────
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, filePath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch { /* file might not exist; handled below */ }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // For SPA-style navigation fallback, serve index.html
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        return res.end('Not found');
      }
      res.writeHead(500);
      return res.end('Server error');
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n🔊 VoiceKeys server running at http://localhost:${PORT}`);
  if (GOOGLE_TTS_API_KEY) {
    console.log('✅ Google Cloud TTS API key is configured');
  }
  console.log('');
});