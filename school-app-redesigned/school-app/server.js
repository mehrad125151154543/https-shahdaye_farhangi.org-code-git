'use strict';
// Zero-dependency server: Node.js >= 22.13 (built-in node:sqlite).
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const PORT = +process.env.PORT || 3000, HOST = process.env.HOST || '127.0.0.1';
const PER = 3, DAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu'], ROLES = ['admin', 'teacher', 'student'], TTL = 12 * 3600e3;

fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
const db = new DatabaseSync(path.join(__dirname, 'data', 'school.db'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS classes(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, grid TEXT NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, role TEXT NOT NULL, cls INTEGER REFERENCES classes(id), salt TEXT NOT NULL, hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS items(id INTEGER PRIMARY KEY, cls INTEGER NOT NULL REFERENCES classes(id), day TEXT NOT NULL, type TEXT NOT NULL, subject TEXT NOT NULL, text TEXT NOT NULL DEFAULT '', author INTEGER);
CREATE TABLE IF NOT EXISTS sessions(th TEXT PRIMARY KEY, uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, exp INTEGER NOT NULL);`);

const get = (s, ...p) => db.prepare(s).get(...p), all = (s, ...p) => db.prepare(s).all(...p), run = (s, ...p) => db.prepare(s).run(...p);
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const mkHash = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString('hex');
const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const genPw = () => { const c = 'abcdefghjkmnpqrstuvwxyz23456789'; return Array.from(crypto.randomBytes(10), b => c[b % c.length]).join(''); };
const S = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max ? v.trim() : null;
function addUser(username, role, cls, pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return Number(run('INSERT INTO users(username,role,cls,salt,hash) VALUES(?,?,?,?,?)', username, role, cls, salt, mkHash(pw, salt)).lastInsertRowid);
}
function setPw(id, pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  run('UPDATE users SET salt=?,hash=? WHERE id=?', salt, mkHash(pw, salt), id);
  run('DELETE FROM sessions WHERE uid=?', id);
}

const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" };
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC }); res.end(JSON.stringify(obj)); };
const isHttps = req => process.env.COOKIE_SECURE === '1' || req.headers['x-forwarded-proto'] === 'https';

function readBody(req) {
  return new Promise((ok, no) => {
    if (!/^application\/json/.test(req.headers['content-type'] || '')) return no({ code: 415, msg: 'bad content type' });
    let n = 0; const c = [];
    req.on('data', d => { n += d.length; if (n > 100e3) { no({ code: 413, msg: 'too large' }); req.destroy(); } else c.push(d); });
    req.on('end', () => { try { ok(JSON.parse(Buffer.concat(c).toString() || '{}')); } catch { no({ code: 400, msg: 'bad json' }); } });
  });
}
function curUser(req) {
  const m = /(?:^|;\s*)sid=([a-f0-9]{64})/.exec(req.headers.cookie || '');
  return m ? get('SELECT u.id,u.username,u.role,u.cls FROM sessions s JOIN users u ON u.id=s.uid WHERE s.th=? AND s.exp>?', sha(m[1]), Date.now()) : null;
}
function startSession(req, res, uid) {
  run('DELETE FROM sessions WHERE exp<?', Date.now());
  const t = crypto.randomBytes(32).toString('hex');
  run('INSERT INTO sessions VALUES(?,?,?)', sha(t), uid, Date.now() + TTL);
  res.setHeader('Set-Cookie', `sid=${t}; HttpOnly; SameSite=Lax; Path=/${isHttps(req) ? '; Secure' : ''}`);
}
const fails = new Map();
function tooMany(req) {
  const ip = (process.env.TRUST_PROXY === '1' && req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now(), a = (fails.get(ip) || []).filter(t => now - t < 600e3);
  fails.set(ip, a); return { blocked: a.length >= 10, hit: () => a.push(now) };
}
const cleanGrid = g => { const o = {}; for (const d of DAYS) o[d] = Array.from({ length: PER }, (_, i) => String((g && g[d] && g[d][i]) || '').slice(0, 40)); return JSON.stringify(o); };
const E = (code, msg) => ({ code, msg });

async function api(req, res, p, m) {
  const body = m === 'GET' || m === 'DELETE' ? {} : await readBody(req);
  const me = curUser(req); let x;
  if (p === '/api/me' && m === 'GET') return send(res, 200, { setup: !get('SELECT 1 x FROM users'), user: me });
  if (p === '/api/setup' && m === 'POST') {
    if (get('SELECT 1 x FROM users')) throw E(403, 'راه‌اندازی قبلاً انجام شده است');
    const u = S(body.username, 3, 40), pw = typeof body.password === 'string' && body.password.length >= 8 && body.password.length <= 200 ? body.password : null;
    if (!u || !pw || /\s/.test(u)) throw E(400, 'نام کاربری (حداقل ۳ نویسه، بدون فاصله) و رمز (حداقل ۸ نویسه) لازم است');
    startSession(req, res, addUser(u, 'admin', null, pw)); return send(res, 200, { ok: true });
  }
  if (p === '/api/login' && m === 'POST') {
    const lim = tooMany(req); if (lim.blocked) throw E(429, 'تلاش‌های زیاد؛ چند دقیقه بعد دوباره امتحان کنید');
    const u = get('SELECT * FROM users WHERE username=?', String(body.username || '').trim());
    const ok = u && typeof body.password === 'string' && same(mkHash(body.password, u.salt), u.hash);
    if (!ok) { lim.hit(); throw E(401, 'نام کاربری یا رمز اشتباه است'); }
    startSession(req, res, u.id); return send(res, 200, { ok: true });
  }
  if (p === '/api/logout' && m === 'POST') {
    const c = /sid=([a-f0-9]{64})/.exec(req.headers.cookie || ''); if (c) run('DELETE FROM sessions WHERE th=?', sha(c[1]));
    res.setHeader('Set-Cookie', 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'); return send(res, 200, { ok: true });
  }
  if (!me) throw E(401, 'ابتدا وارد شوید');
  const admin = me.role === 'admin', staff = admin || me.role === 'teacher';
  if (p === '/api/state' && m === 'GET') {
    const cl = admin || me.role === 'teacher' ? all('SELECT * FROM classes') : all('SELECT * FROM classes WHERE id=?', me.cls ?? -1);
    const it = staff ? all('SELECT * FROM items') : all('SELECT * FROM items WHERE cls=?', me.cls ?? -1);
    return send(res, 200, { classes: cl.map(c => ({ id: c.id, name: c.name, grid: JSON.parse(c.grid) })), items: it,
      users: admin ? all('SELECT id,username,role,cls FROM users ORDER BY id') : undefined });
  }
  if (p === '/api/items' && m === 'POST') {
    if (!staff) throw E(403, 'دسترسی ندارید');
    const subject = S(body.subject, 1, 80), text = String(body.text || '').trim().slice(0, 500);
    if (!subject || !DAYS.includes(body.day) || !['exam', 'hw'].includes(body.type) || !get('SELECT 1 x FROM classes WHERE id=?', +body.cls)) throw E(400, 'اطلاعات نامعتبر است');
    run('INSERT INTO items(cls,day,type,subject,text,author) VALUES(?,?,?,?,?,?)', +body.cls, body.day, body.type, subject, text, me.id); return send(res, 200, { ok: true });
  }
  if ((x = /^\/api\/items\/(\d+)$/.exec(p)) && m === 'DELETE') {
    const it = get('SELECT * FROM items WHERE id=?', +x[1]); if (!it) throw E(404, 'یافت نشد');
    if (!admin && !(me.role === 'teacher' && it.author === me.id)) throw E(403, 'دسترسی ندارید');
    run('DELETE FROM items WHERE id=?', it.id); return send(res, 200, { ok: true });
  }
  if (!admin) throw E(403, 'دسترسی ندارید');
  if (p === '/api/classes' && m === 'POST') {
    const n = S(body.name, 1, 60); if (!n) throw E(400, 'نام کلاس نامعتبر است');
    return send(res, 200, { id: Number(run('INSERT INTO classes(name,grid) VALUES(?,?)', n, cleanGrid({})).lastInsertRowid) });
  }
  if ((x = /^\/api\/classes\/(\d+)\/grid$/.exec(p)) && m === 'PUT') {
    if (!run('UPDATE classes SET grid=? WHERE id=?', cleanGrid(body.grid), +x[1]).changes) throw E(404, 'کلاس یافت نشد'); return send(res, 200, { ok: true });
  }
  if (p === '/api/users' && m === 'POST') {
    const u = S(body.username, 3, 40), role = body.role, cls = role === 'student' ? +body.cls : null;
    if (!u || /\s/.test(u) || !ROLES.includes(role) || (role === 'student' && !get('SELECT 1 x FROM classes WHERE id=?', cls))) throw E(400, 'اطلاعات نامعتبر است (نام کاربری بدون فاصله؛ برای دانش‌آموز کلاس لازم است)');
    if (get('SELECT 1 x FROM users WHERE username=?', u)) throw E(409, 'این نام کاربری وجود دارد');
    const pw = typeof body.password === 'string' && body.password.length >= 8 ? body.password.slice(0, 200) : genPw();
    return send(res, 200, { id: addUser(u, role, cls, pw), password: pw });
  }
  if ((x = /^\/api\/users\/(\d+)\/reset$/.exec(p)) && m === 'POST') {
    if (!get('SELECT 1 x FROM users WHERE id=?', +x[1])) throw E(404, 'یافت نشد');
    const pw = genPw(); setPw(+x[1], pw); return send(res, 200, { password: pw });
  }
  if ((x = /^\/api\/users\/(\d+)$/.exec(p)) && m === 'DELETE') {
    if (+x[1] === me.id) throw E(400, 'نمی‌توانید حساب خودتان را حذف کنید');
    run('DELETE FROM users WHERE id=?', +x[1]); return send(res, 200, { ok: true });
  }
  throw E(404, 'یافت نشد');
}

const FILES = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
http.createServer(async (req, res) => {
  try {
    const p = new URL(req.url, 'http://x').pathname, m = req.method;
    if (p.startsWith('/api/')) {
      if (m !== 'GET' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) throw E(403, 'forbidden');
      return await api(req, res, p, m);
    }
    const f = FILES[p]; if (!f || m !== 'GET') { res.writeHead(404, SEC); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': f[1] + '; charset=utf-8', ...SEC }); res.end(fs.readFileSync(path.join(__dirname, 'public', f[0])));
  } catch (e) {
    if (e && e.code && e.msg) return send(res, e.code, { error: e.msg });
    console.error(e); send(res, 500, { error: 'خطای داخلی سرور' });
  }
}).listen(PORT, HOST, () => console.log(`Running on http://${HOST}:${PORT}`));
