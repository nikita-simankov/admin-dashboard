// Zero-dependency production server: serves the built SPA and a tiny sync API.
// Data is a key → {v, t} map stored as one JSON file (last write wins per key).
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR =
  process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const PASSWORD = process.env.APP_PASSWORD || '';
const SECRET = process.env.SESSION_SECRET || `h90:${PASSWORD}`;
const SESSION = crypto.createHmac('sha256', SECRET).update(`session:${PASSWORD}`).digest('base64url');
const MAX_BODY = 4 * 1024 * 1024;

// ---------- storage ----------
fs.mkdirSync(DATA_DIR, { recursive: true });
/** @type {Record<string, {v: unknown, t: number}>} */
let records = {};
try {
  records = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')).records ?? {};
} catch (e) {
  if (e.code !== 'ENOENT') console.error('Could not read data file:', e.message);
}

let writing = Promise.resolve();
function persist() {
  const snapshot = JSON.stringify({ records });
  writing = writing.then(async () => {
    const tmp = `${DATA_FILE}.${process.pid}.tmp`;
    await fsp.writeFile(tmp, snapshot);
    await fsp.rename(tmp, DATA_FILE);
  }).catch((e) => console.error('Write failed:', e));
  return writing;
}

// ---------- static files (preloaded + precompressed) ----------
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};
/** @type {Map<string, {body: Buffer, br?: Buffer, gz?: Buffer, type: string, etag: string}>} */
const files = new Map();
function loadDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) { loadDir(full); continue; }
    const body = fs.readFileSync(full);
    const ext = path.extname(ent.name);
    const type = TYPES[ext] ?? 'application/octet-stream';
    const compressible = /text|json|svg|javascript/.test(type) && body.length > 1024;
    files.set('/' + path.relative(DIST, full).split(path.sep).join('/'), {
      body,
      type,
      etag: `"${crypto.createHash('sha1').update(body).digest('base64url').slice(0, 16)}"`,
      br: compressible ? zlib.brotliCompressSync(body) : undefined,
      gz: compressible ? zlib.gzipSync(body, { level: 9 }) : undefined,
    });
  }
}
loadDir(DIST);
if (!files.has('/index.html')) console.warn('dist/index.html not found — run `npm run build` first.');

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'",
};

function serveStatic(req, res, pathname) {
  let file = files.get(pathname);
  let isFallback = false;
  if (!file) {
    if (path.extname(pathname)) return send(res, 404, 'Not found');
    file = files.get('/index.html');
    isFallback = true;
    if (!file) return send(res, 503, 'App is not built');
  }
  const immutable = pathname.startsWith('/assets/') && !isFallback;
  const headers = {
    ...SECURITY_HEADERS,
    'Content-Type': file.type,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    ETag: file.etag,
    Vary: 'Accept-Encoding',
  };
  if (req.headers['if-none-match'] === file.etag) {
    res.writeHead(304, headers);
    return res.end();
  }
  const accept = String(req.headers['accept-encoding'] ?? '');
  let body = file.body;
  if (file.br && /\bbr\b/.test(accept)) { body = file.br; headers['Content-Encoding'] = 'br'; }
  else if (file.gz && /\bgzip\b/.test(accept)) { body = file.gz; headers['Content-Encoding'] = 'gzip'; }
  headers['Content-Length'] = body.length;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}

// ---------- helpers ----------
function send(res, status, data, extra = {}) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': typeof data === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extra,
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(new Error('bad json')); }
    });
    req.on('error', reject);
  });
}

function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function authed(req) {
  if (!PASSWORD) return true;
  const got = Buffer.from(cookies(req).h90 ?? '');
  const want = Buffer.from(SESSION);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

function sessionCookie(req, value, maxAge) {
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  return `h90=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

const attempts = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) ?? []).filter((t) => now - t < 15 * 60_000);
  list.push(now);
  attempts.set(ip, list);
  return list.length > 10;
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// ---------- API ----------
async function api(req, res, pathname) {
  if (pathname === '/api/session' && req.method === 'GET') {
    return send(res, 200, { auth: !!PASSWORD, ok: authed(req) });
  }
  if (pathname === '/api/login' && req.method === 'POST') {
    const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();
    if (rateLimited(ip)) return send(res, 429, { error: 'Слишком много попыток. Подожди 15 минут.' });
    const { password } = await readJson(req);
    if (!PASSWORD || (typeof password === 'string' && safeEqual(password, PASSWORD))) {
      attempts.delete(ip);
      return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, SESSION, 60 * 60 * 24 * 400) });
    }
    return send(res, 401, { error: 'Неверный пароль' });
  }
  if (pathname === '/api/logout' && req.method === 'POST') {
    return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
  }

  if (!authed(req)) return send(res, 401, { error: 'unauthorized' });

  if (pathname === '/api/data' && req.method === 'GET') {
    return send(res, 200, { records });
  }
  if (pathname === '/api/data' && req.method === 'PUT') {
    const body = await readJson(req);
    const incoming = body?.records;
    if (!incoming || typeof incoming !== 'object') return send(res, 400, { error: 'records required' });
    let changed = false;
    for (const [key, rec] of Object.entries(incoming)) {
      if (key.length > 200 || !rec || typeof rec.t !== 'number') continue;
      const cur = records[key];
      if (!cur || rec.t > cur.t) {
        records[key] = { v: rec.v, t: rec.t };
        changed = true;
      }
    }
    if (changed) await persist();
    return send(res, 200, { ok: true });
  }
  return send(res, 404, { error: 'not found' });
}

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url ?? '/', 'http://x');
    if (pathname === '/healthz') return send(res, 200, 'ok');
    if (pathname.startsWith('/api/')) return await api(req, res, pathname);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
    return serveStatic(req, res, decodeURIComponent(pathname));
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error';
    if (!res.headersSent) send(res, msg === 'too large' ? 413 : msg === 'bad json' ? 400 : 500, { error: msg });
    else res.end();
  }
});

server.listen(PORT, () => {
  console.log(`90 HARD → http://localhost:${PORT}  (data: ${DATA_FILE}, auth: ${PASSWORD ? 'on' : 'OFF'})`);
});

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => {
    server.close();
    await writing;
    process.exit(0);
  });
}
