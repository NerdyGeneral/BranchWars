'use strict';

// Same-origin, server-authoritative Core multiplayer. No dependencies, cookies,
// GitHub credentials or peer-supplied campaign snapshots during play.
const http = require('node:http');
const crypto = require('node:crypto');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { assemble } = require('./build_game');

const PREFIX = '/api/multiplayer';
const BODY_LIMIT = 2 * 1024 * 1024;
const COLORS = ['#2878e0', '#8642bc', '#178264', '#ba5924'];
const clone = value => JSON.parse(JSON.stringify(value));
function failure(status, code, message) { return Object.assign(new Error(message), { status, code }); }
function exact(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw failure(400, 'invalid_input', 'Expected a JSON object.');
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw failure(400, 'invalid_input', 'Unsupported field: ' + key + '.');
}
function safeJson(value, depth = 0, budget = { remaining: 200000 }) {
  if (depth > 60 || --budget.remaining < 0) throw failure(400, 'invalid_input', 'The supplied JSON is too complex.');
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw failure(400, 'invalid_input', 'Unsafe JSON property.');
    safeJson(value[key], depth + 1, budget);
  }
}
function canonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
function bankName(raw) {
  // Match the canonical Core creation/import boundary. Names are data in JSON;
  // browser renderers escape them rather than imposing incompatible save rules.
  if (typeof raw !== 'string' || !raw.trim() || raw.trim().length > 36)
    throw failure(400, 'invalid_name', 'Use a bank name of 1–36 characters.');
  return raw.trim().replace(/\s+/g, ' ');
}
function settings(input, previous = { players: 4, coreMap: 'continental', scenario: 'balanced' }) {
  const next = { ...previous };
  for (const field of ['players', 'coreMap', 'scenario']) if (input[field] !== undefined) next[field] = input[field];
  if (!Number.isSafeInteger(next.players) || next.players < 2 || next.players > 4) throw failure(400, 'invalid_settings', 'Choose 2–4 banks.');
  if (!['continental', 'national'].includes(next.coreMap)) throw failure(400, 'invalid_settings', 'Choose a continental or national Core map.');
  if (!['balanced', 'rate', 'regulatory', 'growth'].includes(next.scenario)) throw failure(400, 'invalid_settings', 'Unsupported campaign scenario.');
  return next;
}
function aiSeats(input, count, previous = []) {
  const list = input === undefined ? previous : input;
  if (!Array.isArray(list) || list.some(seat => !Number.isSafeInteger(seat) || seat < 1 || seat >= count) || new Set(list).size !== list.length)
    throw failure(400, 'invalid_settings', 'AI seats must be distinct seat numbers after the human host.');
  return [...list];
}
function initialRequest(body, action) {
  if (body.seatKey === undefined) return null;
  if (typeof body.seatKey !== 'string' || !/^[0-9a-f]{64}$/.test(body.seatKey))
    throw failure(400, 'invalid_seat_key', 'Use a cryptographically random 256-bit private seat key.');
  const intent = { ...body }; delete intent.seatKey;
  return { action, fingerprint: crypto.createHash('sha256').update(canonicalJson(intent)).digest('hex') };
}
function loadEngine(html) {
  const source = html.match(/<script id="engine">([\s\S]*?)<\/script>/)?.[1];
  if (!source) throw Error('The assembled game has no engine.');
  const context = vm.createContext({ console });
  new vm.Script(source, { filename: 'branchwars-server-engine.js' }).runInContext(context, { timeout: 10000 });
  return context.BWEngine;
}
function readBody(request, limit = BODY_LIMIT) {
  return new Promise((resolve, reject) => {
    let bytes = 0, overflow = false; const chunks = [];
    request.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > limit) { overflow = true; chunks.length = 0; } else if (!overflow) chunks.push(chunk);
    });
    request.on('end', () => {
      if (overflow) return reject(failure(413, 'body_too_large', 'The request exceeds the ' + limit + '-byte limit.'));
      try { const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); safeJson(body); resolve(body); }
      catch (error) { reject(error.status ? error : failure(400, 'invalid_json', 'The request is not valid JSON.')); }
    });
    request.on('error', reject);
  });
}
function createServer({ html = assemble().html, engine = loadEngine(html), maxRooms = 128, dataDir = null, maxCreationsPerMinute = 12 } = {}) {
  const rooms = new Map();
  const creationWindows = new Map();
  const newToken = () => crypto.randomBytes(32).toString('hex');
  const tokenHash = token => crypto.createHash('sha256').update(token).digest('hex');
  function tokenMatches(candidate, expected) {
    return typeof candidate === 'string' && /^[0-9a-f]{64}$/.test(candidate) && typeof expected === 'string' &&
      /^[0-9a-f]{64}$/.test(expected) && crypto.timingSafeEqual(Buffer.from(tokenHash(candidate), 'hex'), Buffer.from(expected, 'hex'));
  }
  function roomCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code; do { code = [...crypto.randomBytes(8)].map(n => alphabet[n % alphabet.length]).join(''); } while (rooms.has(code));
    return code;
  }
  function seatDefinition(index, bot = false) { return { seat: index, name: 'Bank ' + (index + 1) + (bot ? ' AI' : ''), isBot: bot, color: COLORS[index], tokenHash: null, initialRequest: null, ready: bot, commands: new Map() }; }
  function retryInitial(body, identity, expectedRoom = null) {
    if (!identity) return null;
    for (const room of rooms.values()) for (const seat of room.seats) {
      if (!tokenMatches(body.seatKey, seat.tokenHash)) continue;
      if (!seat.initialRequest || seat.initialRequest.action !== identity.action || seat.initialRequest.fingerprint !== identity.fingerprint || expectedRoom && room.code !== expectedRoom)
        throw failure(409, 'handshake_conflict', 'This private seat key already belongs to a different initial request. Retry the original request.');
      return { room, seat };
    }
    return null;
  }
  const directory = dataDir ? path.resolve(dataDir) : null;
  let lockFile = null;
  function processIdentity(pid) {
    if (process.platform !== 'linux') return null;
    try { const stat = fs.readFileSync('/proc/' + pid + '/stat', 'utf8'); return { boot: fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim(), start: stat.slice(stat.lastIndexOf(')') + 2).split(/\s+/)[19] }; } catch { return null; }
  }
  function releaseLock() { if (lockFile) { try { fs.unlinkSync(lockFile); } catch {} lockFile = null; } }
  function serialize(room) { return { version: 1, room: { ...room, seats: room.seats.map(seat => ({ ...seat, commands: [...seat.commands] })) } }; }
  function restore(document) {
    if (document?.version !== 1 || !document.room || !Array.isArray(document.room.seats)) throw Error('Unsupported room storage.');
    const room = document.room;
    if (!/^[A-Z2-9]{8}$/.test(room.code) || !Number.isSafeInteger(room.revision) || room.revision < 1 || typeof room.started !== 'boolean' || typeof room.imported !== 'boolean') throw Error('Invalid room storage.');
    room.settings = settings(room.settings);
    if (room.seats.length !== room.settings.players) throw Error('Invalid stored seat count.');
    for (const [index, seat] of room.seats.entries()) {
      if (seat.seat !== index || typeof seat.isBot !== 'boolean' || typeof seat.ready !== 'boolean' || !/^#[0-9a-f]{6}$/i.test(seat.color) || (seat.tokenHash !== null && !/^[0-9a-f]{64}$/.test(seat.tokenHash)) || !Array.isArray(seat.commands) || seat.commands.length > 256 || seat.commands.some(entry => !Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string' || typeof entry[1] !== 'string')) throw Error('Invalid stored seat.');
      if (seat.initialRequest !== undefined && seat.initialRequest !== null && (!seat.tokenHash || !seat.initialRequest || typeof seat.initialRequest !== 'object' || Array.isArray(seat.initialRequest) || Object.keys(seat.initialRequest).length !== 2 || !['create', 'join'].includes(seat.initialRequest.action) || !/^[0-9a-f]{64}$/.test(seat.initialRequest.fingerprint))) throw Error('Invalid stored initial request.');
      if (seat.initialRequest === undefined) seat.initialRequest = null;
      bankName(seat.name); seat.commands = new Map(seat.commands);
    }
    if (room.seats[0].isBot || !room.seats[0].tokenHash) throw Error('Invalid stored host.');
    if (room.game) { room.game = engine.migrateCampaign(room.game); if (room.game.coreMultiplayerVersion !== 1 || room.game.players.length !== room.seats.length) throw Error('Invalid stored campaign.'); }
    else if (room.started || room.imported) throw Error('Missing stored campaign.');
    return room;
  }
  if (directory) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    // Room books and authentication hashes are private, including existing paths
    // explicitly selected as this server's data directory.
    fs.chmodSync(directory, 0o700);
    const candidate = path.join(directory, '.server.lock');
    if (fs.existsSync(candidate)) {
      const previous = JSON.parse(fs.readFileSync(candidate, 'utf8')), previousPid = typeof previous === 'number' ? previous : previous.pid;
      let alive = false; if (Number.isSafeInteger(previousPid) && previousPid > 0) { try { process.kill(previousPid, 0); alive = true; } catch (error) { alive = error.code !== 'ESRCH'; } }
      if (!Number.isSafeInteger(previousPid) || previousPid < 1) throw Error('The server lock is damaged. Confirm no server uses this directory before removing .server.lock.');
      const currentIdentity = processIdentity(previousPid);
      if (alive && previous.identity && currentIdentity && (previous.identity.boot !== currentIdentity.boot || previous.identity.start !== currentIdentity.start)) alive = false;
      if (alive) throw Error('This room data directory is already used by a running server.');
      fs.unlinkSync(candidate);
    }
    fs.writeFileSync(candidate, JSON.stringify({ pid: process.pid, identity: processIdentity(process.pid) }), { flag: 'wx', mode: 0o600 }); lockFile = candidate;
    try {
      for (const file of fs.readdirSync(directory).filter(name => /^[A-Z2-9]{8}\.json$/.test(name))) {
        let room; try { room = restore(JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'))); } catch { throw Error('Room storage is damaged or unsupported: ' + file); }
        if (file !== room.code + '.json' || rooms.has(room.code)) throw Error('Stored room identity does not match its file.');
        fs.chmodSync(path.join(directory, file), 0o600); rooms.set(room.code, room);
      }
      if (rooms.size > maxRooms) throw Error('Stored rooms exceed the configured room limit.');
    } catch (error) { releaseLock(); throw error; }
  }
  function persist(room) {
    if (!directory) return;
    const temporary = path.join(directory, room.code + '.' + crypto.randomBytes(8).toString('hex') + '.tmp');
    let descriptor;
    try {
      descriptor = fs.openSync(temporary, 'wx', 0o600); fs.writeFileSync(descriptor, JSON.stringify(serialize(room))); fs.fsyncSync(descriptor); fs.closeSync(descriptor); descriptor = null;
      fs.renameSync(temporary, path.join(directory, room.code + '.json'));
      // On Unix this also flushes the replacement directory entry. Windows does
      // not permit opening directories and still uses the atomic file rename.
      if (process.platform !== 'win32') { const parent = fs.openSync(directory, 'r'); try { fs.fsyncSync(parent); } finally { fs.closeSync(parent); } }
    } catch (error) { if (descriptor !== undefined && descriptor !== null) fs.closeSync(descriptor); try { fs.unlinkSync(temporary); } catch {} throw failure(503, 'storage_failed', 'Room storage could not be saved. Keep your tab and reconnect token; retry once storage is restored.'); }
  }
  function lobby(room) {
    return { version: 1, room: room.code, revision: room.revision, phase: room.started ? room.game.gameOver ? 'finished' : 'playing' : 'lobby',
      settings: clone(room.settings), ...(room.imported ? { resume: { version: room.game.version, cycle: room.game.cycle } } : {}),
      players: room.seats.map(seat => ({ seat: seat.seat, name: seat.name, color: seat.color, isBot: seat.isBot, claimed: seat.isBot || !!seat.tokenHash, ready: seat.ready, host: seat.seat === 0 })) };
  }
  function snapshot(room, seat, credential = false) {
    const result = { room: room.code, seat: seat.seat, lobby: lobby(room), state: room.started ? clone(engine.publicState(room.game, seat.seat)) : null };
    if (credential) result.token = credential;
    return result;
  }
  function authenticate(request, room) {
    const token = /^Bearer ([^ ]+)$/.exec(request.headers.authorization || '')?.[1];
    const seat = room.seats.find(item => !item.isBot && tokenMatches(token, item.tokenHash));
    if (!seat) throw failure(401, 'unauthorized', 'A valid token for a human seat in this room is required.');
    return seat;
  }
  function hostOnly(seat) { if (seat.seat !== 0) throw failure(403, 'host_required', 'Only the host can perform this action.'); }
  function beforeStart(room) { if (room.started) throw failure(409, 'already_started', 'The campaign has already started.'); }
  function revision(room, body) { if (!Number.isSafeInteger(body.revision) || body.revision !== room.revision) throw failure(409, 'stale_revision', 'The lobby changed. Review the current setup before confirming.'); }
  function clearReadiness(room) { room.revision++; for (const item of room.seats) item.ready = item.isBot; }
  function uniqueName(room, name, excluded) { if (room.seats.some(item => item !== excluded && (item.tokenHash || item.isBot) && item.name.toLowerCase() === name.toLowerCase())) throw failure(400, 'duplicate_name', 'Each bank needs a distinct name.'); }
  function requireGame(room) { if (!room.started) throw failure(409, 'not_started', 'The host must start the confirmed campaign first.'); if (room.game.gameOver) throw failure(409, 'campaign_finished', 'The campaign is complete.'); }
  function command(room, seat, action, body, apply) {
    if (typeof body.commandId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(body.commandId)) throw failure(400, 'invalid_command', 'A command ID of 8–100 letters, digits, hyphens or underscores is required.');
    const fingerprint = crypto.createHash('sha256').update(canonicalJson([action, body])).digest('hex'), previous = seat.commands.get(body.commandId);
    if (previous !== undefined) { if (previous !== fingerprint) throw failure(409, 'command_conflict', 'That command ID was already used for a different instruction.'); return snapshot(room, seat); }
    requireGame(room);
    if (body.cycle !== room.game.cycle || body.resolutionId !== room.game.resolutionId) throw failure(409, 'stale_turn', 'That instruction belongs to a different month or resolution.');
    const before = clone(room.game), previousCommands = new Map(seat.commands);
    try {
      apply(); seat.commands.set(body.commandId, fingerprint);
      if (seat.commands.size > 256) seat.commands.delete(seat.commands.keys().next().value);
      persist(room);
    } catch (error) { room.game = before; seat.commands = previousCommands; throw error.status ? error : failure(400, 'plan_rejected', error.message); }
    return snapshot(room, seat);
  }
  async function handle(request, response) {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    const send = (status, value, contentType = 'application/json; charset=utf-8') => { response.writeHead(status, { ...cors, 'Content-Type': contentType }); response.end(contentType.startsWith('application/json') ? JSON.stringify(value) : value); };
    let rollback = null;
    const prepareMutation = room => { const previous = clone(serialize(room)); rollback = () => rooms.set(room.code, restore(previous)); };
    try {
      const url = new URL(request.url, 'http://localhost');
      if (request.method === 'OPTIONS') { response.writeHead(204, cors); response.end(); return; }
      if (request.method === 'GET' && ['/', '/BRANCH_WARS.html'].includes(url.pathname)) { send(200, html, 'text/html; charset=utf-8'); return; }
      if (request.method === 'GET' && url.pathname === '/favicon.ico') { response.writeHead(204, cors); response.end(); return; }
      if (request.method === 'GET' && url.pathname === PREFIX + '/health') { send(200, { ok: true, server: 'Branch Wars Core multiplayer', protocol: 1, coreMultiplayerVersion: 1 }); return; }
      if (request.method === 'POST' && url.pathname === PREFIX + '/rooms') {
        const body = await readBody(request); exact(body, ['bankName', 'players', 'aiSeats', 'coreMap', 'scenario', 'seed', 'game', 'seatKey']);
        const identity = initialRequest(body, 'create'), retry = retryInitial(body, identity);
        if (retry) { send(200, snapshot(retry.room, retry.seat, body.seatKey)); return; }
        const address = request.socket.remoteAddress || 'unknown', now = Date.now();
        for (const [key, item] of creationWindows) if (now - item.started >= 60000) creationWindows.delete(key);
        const window = creationWindows.get(address) || { started: now, count: 0 };
        if (window.count >= maxCreationsPerMinute) throw failure(429, 'creation_rate_limit', 'Too many rooms were created from this connection. Wait a minute or reuse an existing room.');
        if (rooms.size >= maxRooms) throw failure(503, 'room_limit', 'This server has reached its room limit.');
        const config = settings(body), bots = aiSeats(body.aiSeats, config.players);
        const room = { code: roomCode(), revision: 1, settings: config, seats: [], game: null, started: false, imported: false, seed: body.seed === undefined ? crypto.randomBytes(16).toString('hex') : body.seed };
        if (typeof room.seed !== 'string' || !room.seed.length || room.seed.length > 200) throw failure(400, 'invalid_seed', 'The seed must be 1–200 characters.');
        if (body.game !== undefined) {
          const restored = engine.migrateCampaign(clone(body.game));
          if (restored.coreMultiplayerVersion !== 1 || restored.players.length < 2 || restored.players.length > 4 || restored.players[0].isBot) throw failure(400, 'invalid_save', 'Import a 2–4-bank Core multiplayer campaign with a human host.');
          room.game = restored; room.imported = true; room.settings = { players: restored.players.length, coreMap: restored.coreMap, scenario: restored.scenario };
          room.seats = restored.players.map((player, index) => ({ ...seatDefinition(index, player.isBot), name: player.name, color: player.color }));
        } else {
          room.seats = Array.from({ length: config.players }, (_, index) => seatDefinition(index, bots.includes(index)));
          room.seats[0].name = bankName(body.bankName === undefined ? 'Host Bank' : body.bankName);
          uniqueName(room, room.seats[0].name, room.seats[0]);
        }
        const credential = identity ? body.seatKey : newToken(); room.seats[0].tokenHash = tokenHash(credential); room.seats[0].initialRequest = identity; persist(room); rooms.set(room.code, room); window.count++; creationWindows.set(address, window); send(201, snapshot(room, room.seats[0], credential)); return;
      }
      const match = url.pathname.match(/^\/api\/multiplayer\/rooms\/([A-Z2-9]{8})(?:\/([a-z-]+))?$/);
      if (!match) throw failure(404, 'not_found', 'Route not found.');
      let room = rooms.get(match[1]); if (!room) throw failure(404, 'room_not_found', 'Room not found.');
      const action = match[2] || '';
      if (request.method === 'POST' && action === 'join') {
        const body = await readBody(request, 65536); exact(body, ['bankName', 'seatKey']);
        room = rooms.get(match[1]); if (!room) throw failure(404, 'room_not_found', 'Room not found.');
        const identity = initialRequest(body, 'join'), retry = retryInitial(body, identity, room.code);
        if (retry) { send(200, snapshot(retry.room, retry.seat, body.seatKey)); return; }
        beforeStart(room); const seat = room.seats.find(item => !item.isBot && !item.tokenHash);
        if (!seat) throw failure(409, 'room_full', 'All human seats are reserved. Reconnect using your original token.');
        prepareMutation(room);
        if (body.bankName !== undefined) bankName(body.bankName);
        if (!room.imported) { const name = bankName(body.bankName === undefined ? seat.name : body.bankName); uniqueName(room, name, seat); seat.name = name; }
        const credential = identity ? body.seatKey : newToken(); seat.tokenHash = tokenHash(credential); seat.initialRequest = identity; clearReadiness(room); persist(room); send(201, snapshot(room, seat, credential)); return;
      }
      let seat = authenticate(request, room);
      if (request.method === 'GET' && ['', 'resume'].includes(action)) { send(200, snapshot(room, seat)); return; }
      if (request.method === 'GET' && action === 'export') {
        hostOnly(seat); if (!room.started) throw failure(409, 'not_started', 'Start the campaign before exporting a backup.');
        // An explicit host backup includes every bank's private campaign books.
        // It never includes room credentials, and is not an ordinary seat view.
        send(200, { game: clone(room.game), notice: 'Private host backup: includes all banks. Keep it private; room access tokens are excluded.' }); return;
      }
      if (request.method !== 'POST') throw failure(405, 'method_not_allowed', 'Use GET to read state and POST for instructions.');
      const body = await readBody(request, 65536);
      // Another request can replace a room while this request body is arriving.
      // Bind mutation and credentials only to the current authoritative object.
      room = rooms.get(match[1]); if (!room) throw failure(404, 'room_not_found', 'Room not found.');
      seat = authenticate(request, room);
      if (action === 'configure') {
        exact(body, ['revision', 'players', 'aiSeats', 'coreMap', 'scenario']); hostOnly(seat); beforeStart(room); revision(room, body);
        if (room.imported) throw failure(409, 'saved_rules', 'An imported campaign retains its saved banks and rules.');
        const next = settings(body, room.settings), bots = aiSeats(body.aiSeats, next.players, room.seats.filter(item => item.isBot).map(item => item.seat));
        if (room.seats.some(item => item.tokenHash && (item.seat >= next.players || bots.includes(item.seat)))) throw failure(409, 'reserved_seat', 'A claimed human seat cannot be removed or replaced with AI.');
        prepareMutation(room);
        room.seats = Array.from({ length: next.players }, (_, index) => { const old = room.seats[index]; return old && old.isBot === bots.includes(index) ? old : seatDefinition(index, bots.includes(index)); });
        room.settings = next; clearReadiness(room); persist(room); send(200, snapshot(room, room.seats[0])); return;
      }
      if (action === 'identity') {
        exact(body, ['revision', 'bankName']); beforeStart(room); revision(room, body);
        if (room.imported) throw failure(409, 'saved_identity', 'An imported campaign keeps the original bank names.');
        const name = bankName(body.bankName); uniqueName(room, name, seat); prepareMutation(room); seat.name = name; clearReadiness(room); persist(room); send(200, snapshot(room, seat)); return;
      }
      if (action === 'ready') {
        exact(body, ['revision', 'ready']); beforeStart(room); revision(room, body); if (typeof body.ready !== 'boolean') throw failure(400, 'invalid_input', 'Ready must be true or false.');
        prepareMutation(room); seat.ready = body.ready; persist(room); send(200, snapshot(room, seat)); return;
      }
      if (action === 'start') {
        exact(body, ['revision']); hostOnly(seat); beforeStart(room); revision(room, body);
        if (!room.seats.every(item => item.isBot || item.tokenHash && item.ready)) throw failure(409, 'not_ready', 'Every human bank must claim its seat and confirm the current setup.');
        prepareMutation(room);
        if (!room.imported) room.game = engine.createGame({ coreMultiplayerVersion: 1, coreMap: room.settings.coreMap, scenario: room.settings.scenario, mode: 'lan', seed: room.seed, created: Date.now(), players: room.seats.map(item => ({ name: item.name, isBot: item.isBot, color: item.color })) });
        if (room.game.coreMultiplayerVersion !== 1 || room.game.players.length !== room.seats.length) throw failure(503, 'engine_unavailable', 'This engine does not support the requested Core multiplayer setup.');
        room.started = true; persist(room); send(200, snapshot(room, seat)); return;
      }
      if (action === 'plan') {
        exact(body, ['commandId', 'cycle', 'resolutionId', 'plan']); if (!body.plan || typeof body.plan !== 'object' || Array.isArray(body.plan)) throw failure(400, 'invalid_plan', 'Supply a complete monthly plan.');
        send(200, command(room, seat, action, body, () => engine.submit(room.game, seat.seat, clone(body.plan)))); return;
      }
      if (action === 'recall') {
        exact(body, ['commandId', 'cycle', 'resolutionId']);
        send(200, command(room, seat, action, body, () => { if (typeof engine.recallCoreMultiplayer !== 'function') throw Error('The engine does not support Core multiplayer recall.'); engine.recallCoreMultiplayer(room.game, seat.seat); })); return;
      }
      if (action === 'advance') {
        exact(body, ['commandId', 'cycle', 'resolutionId']); hostOnly(seat);
        send(200, command(room, seat, action, body, () => { if (typeof engine.advanceCoreMultiplayerBots !== 'function') throw Error('The engine does not support observing remaining AI banks.'); engine.advanceCoreMultiplayerBots(room.game); })); return;
      }
      if (action === 'close') {
        exact(body, ['confirm']); hostOnly(seat); if (body.confirm !== true) throw failure(400, 'confirmation_required', 'Explicitly confirm closing this room. Export a private backup first if you need to keep it.');
        if (directory) { try { fs.unlinkSync(path.join(directory, room.code + '.json')); } catch { throw failure(503, 'storage_failed', 'The room could not be removed from storage.'); } }
        rooms.delete(room.code); send(200, { room: room.code, closed: true }); return;
      }
      throw failure(404, 'not_found', 'Route not found.');
    } catch (error) { if (rollback) rollback(); send(error.status || 400, { error: error.message || 'The request was rejected.', code: error.code || 'invalid_input' }); }
  }
  const server = http.createServer((request, response) => { handle(request, response).catch(() => { if (!response.headersSent) { response.writeHead(500); response.end(); } else response.destroy(); }); });
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  server.on('close', releaseLock);
  server.engine = engine;
  return server;
}
if (require.main === module) {
  const args = process.argv.slice(2);
  const dataIndex = args.indexOf('--data-dir'); let dataDir = null;
  if (dataIndex !== -1) { dataDir = args[dataIndex + 1]; if (!dataDir) throw Error('--data-dir requires a path.'); args.splice(dataIndex, 2); }
  if (args.length > 1 || args[0] && !/^\d+$/.test(args[0])) throw Error('Usage: node game/tools/multiplayer_server.js [port] [--data-dir PATH]');
  const port = Number(args[0] || process.env.PORT || 8765), host = process.env.HOST || '0.0.0.0';
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) throw Error('Choose a port from 0 to 65535.');
  const server = createServer({ dataDir });
  server.listen(port, host, () => console.log('Branch Wars Core multiplayer listening on http://' + host + ':' + server.address().port + '/. ' + (dataDir ? 'Private room storage is enabled; reconnect tokens survive restart.' : 'Memory-only development: rooms are lost when this server stops. Use --data-dir PATH for persistence.') + ' Online players need the public HTTPS address of this server.'));
}
module.exports = { createServer, loadEngine, PREFIX, BODY_LIMIT };
