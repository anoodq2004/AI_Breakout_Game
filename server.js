// Prompt Station — game website + live multiplayer server.
// Serves public/index.html and relays room presence over WebSockets at /ws.
// No database: rooms live in memory and disappear when everyone leaves.

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const MAX_PER_ROOM = 150;
const MAX_PRESENCE_BYTES = 4096;
const ROOM_RE = /^[a-z0-9][a-z0-9_.-]{0,47}$/;

const indexPath = path.join(__dirname, 'public', 'index.html');
const xlsxPath = path.join(__dirname, 'node_modules', 'xlsx', 'dist', 'xlsx.full.min.js');

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/' || url === '/index.html') {
    fs.readFile(indexPath, (err, data) => {
      if (err) { res.writeHead(500); res.end('Could not load the game page.'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
    return;
  }
  if (url === '/vendor/xlsx.full.min.js') {
    fs.readFile(xlsxPath, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=86400' });
      res.end(data);
    });
    return;
  }
  if (url === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); return; }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 8192 });
const rooms = new Map(); // roomName -> Map(clientId -> client)
const pending = new Set(); // rooms with a broadcast scheduled

function scheduleBroadcast(name) {
  if (pending.has(name)) return;
  pending.add(name);
  setTimeout(() => {
    pending.delete(name);
    const room = rooms.get(name);
    if (!room) return;
    const peers = [];
    for (const [id, c] of room) peers.push({ id, presence: c.presence });
    const msg = JSON.stringify({ t: 'peers', room: name, peers });
    for (const c of room.values()) if (c.ws.readyState === 1) c.ws.send(msg);
  }, 40);
}

function leave(client) {
  if (!client.room) return;
  const room = rooms.get(client.room);
  if (room) {
    room.delete(client.id);
    if (room.size === 0) rooms.delete(client.room);
    else scheduleBroadcast(client.room);
  }
  client.room = null;
}

function cleanPresence(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return {};
  try {
    const s = JSON.stringify(p);
    if (Buffer.byteLength(s) > MAX_PRESENCE_BYTES) return null;
    return JSON.parse(s);
  } catch { return null; }
}

wss.on('connection', (ws) => {
  const client = { id: crypto.randomBytes(8).toString('hex'), ws, room: null, presence: {}, alive: true, tokens: 30, last: Date.now() };
  ws.send(JSON.stringify({ t: 'hello', id: client.id }));
  ws.on('pong', () => { client.alive = true; });

  ws.on('message', (raw) => {
    // simple rate limit: ~20 messages per second, burst 30
    const now = Date.now();
    client.tokens = Math.min(30, client.tokens + ((now - client.last) / 1000) * 20);
    client.last = now;
    if (client.tokens < 1) return;
    client.tokens -= 1;

    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object') return;

    if (m.t === 'join') {
      if (typeof m.room !== 'string' || !ROOM_RE.test(m.room)) { ws.send(JSON.stringify({ t: 'error', code: 'bad_room' })); return; }
      const pres = cleanPresence(m.presence);
      if (pres === null) return;
      if (client.room !== m.room) leave(client);
      let room = rooms.get(m.room);
      if (!room) { room = new Map(); rooms.set(m.room, room); }
      if (!room.has(client.id) && room.size >= MAX_PER_ROOM) { ws.send(JSON.stringify({ t: 'error', code: 'room_full', room: m.room })); return; }
      client.room = m.room;
      client.presence = pres;
      room.set(client.id, client);
      scheduleBroadcast(m.room);
    } else if (m.t === 'presence') {
      if (!client.room) return;
      const pres = cleanPresence(m.data);
      if (pres === null) return;
      client.presence = pres;
      scheduleBroadcast(client.room);
    } else if (m.t === 'leave') {
      leave(client);
    }
  });

  ws.on('close', () => leave(client));
  ws.on('error', () => leave(client));
});

// Drop connections that stopped answering.
setInterval(() => {
  for (const ws of wss.clients) {
    if (ws._psDead) { ws.terminate(); continue; }
    ws._psDead = true;
    ws.once('pong', () => { ws._psDead = false; });
    try { ws.ping(); } catch {}
  }
}, 30000);

server.listen(PORT, () => {
  console.log(`Prompt Station is running at http://localhost:${PORT}`);
});
