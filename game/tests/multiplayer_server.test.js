'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { once } = require('node:events');
const { createServer, BODY_LIMIT } = require('../tools/multiplayer_server');

const copy = value => JSON.parse(JSON.stringify(value));
async function launch(options = {}) {
  const server = createServer(options); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port + '/api/multiplayer';
  async function request(route, { method = 'GET', token, body, raw, status = 200 } = {}) {
    const response = await fetch(base + route, { method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...((body !== undefined || raw !== undefined) ? { 'Content-Type': 'application/json' } : {}) }, ...((body !== undefined || raw !== undefined) ? { body: raw !== undefined ? raw : JSON.stringify(body) } : {}) });
    const result = response.status === 204 ? null : await response.json();
    assert.equal(response.status, status, result?.error || 'Unexpected HTTP status for ' + route); return result;
  }
  return { server, base, request, close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())) };
}
function route(room, action = '') { return '/rooms/' + room + (action ? '/' + action : ''); }
function envelope(state, id, plan) { return { commandId: id, cycle: state.cycle, resolutionId: state.resolutionId, ...(plan ? { plan } : {}) }; }
function privateView(view, seat, game) {
  assert.equal(view.me.id, game.players[seat].id); assert.equal(view.rivals.length, game.players.length - 1);
  assert.equal(view.banks.length, game.players.length);
  for (const rival of view.rivals) for (const key of ['allocation', 'policies', 'projects', 'capability']) assert.equal(rival[key], undefined, key + ' leaked');
  const encoded = JSON.stringify(view);
  assert(!encoded.includes('tokenHash')); assert(!encoded.includes('commands'));
}
async function lobbyChecks(app) {
  const { request } = app;
  const health = await request('/health'); assert.equal(health.protocol, 1);
  assert.equal(await request('/health', { method: 'OPTIONS', status: 204 }), null);
  await request('/rooms', { method: 'POST', raw: '{', status: 400 });
  await request('/rooms', { method: 'POST', raw: '{"bankName":"Unsafe Bank","__proto__":{"polluted":true}}', status: 400 });
  await request('/rooms', { method: 'POST', body: { bankName: 'Bad Count', players: 5 }, status: 400 });
  await request('/rooms', { method: 'POST', body: { bankName: 'Bad AI', players: 4, aiSeats: [0] }, status: 400 });
  assert.equal((await request('/rooms', { method: 'POST', body: { bankName: '<script>', players: 2 }, status: 201 })).lobby.players[0].name, '<script>', 'literal names remain data in JSON');
  for (const bankName of ['', 0, false, null]) await request('/rooms', { method: 'POST', body: { bankName, players: 2 }, status: 400 });
  await request('/rooms', { method: 'POST', body: { bankName: 'B'.repeat(37), players: 2 }, status: 400 });
  assert.equal((await request('/rooms', { method: 'POST', body: { bankName: 'B'.repeat(36), players: 2 }, status: 201 })).lobby.players[0].name.length, 36);
  assert.equal({}.polluted, undefined);
  const host = await request('/rooms', { method: 'POST', body: { bankName: 'Cedar Bank', players: 4, seed: 'server-four-human' }, status: 201 });
  assert.match(host.token, /^[a-f0-9]{64}$/); assert.equal(host.state, null);
  await request(route(host.room), { status: 401 });
  await request(route(host.room), { token: '0'.repeat(64), status: 401 });
  await request(route(host.room) + '?token=' + host.token, { status: 401 });
  await request(route(host.room, 'start'), { method: 'POST', token: host.token, body: { revision: host.lobby.revision }, status: 409 });
  const seats = [host];
  for (const name of ['Harbor Bank', 'Pine Bank', 'Amber Bank']) seats.push(await request(route(host.room, 'join'), { method: 'POST', body: { bankName: name }, status: 201 }));
  assert.equal(new Set(seats.map(seat => seat.token)).size, 4);
  await request(route(host.room, 'join'), { method: 'POST', body: { bankName: 'Fifth Bank' }, status: 409 });
  let current = await request(route(host.room), { token: host.token });
  const shared = JSON.stringify(current); for (const peer of seats) assert(!shared.includes(peer.token), 'poll cannot return a seat token');
  assert(!shared.includes('tokenHash'));
  await request(route(host.room, 'configure'), { method: 'POST', token: seats[1].token, body: { revision: current.lobby.revision, players: 3 }, status: 403 });
  await request(route(host.room, 'configure'), { method: 'POST', token: host.token, body: { revision: current.lobby.revision, aiSeats: [1] }, status: 409 });
  await request(route(host.room, 'configure'), { method: 'POST', token: host.token, body: { revision: current.lobby.revision, players: 3 }, status: 409 });
  await request(route(host.room, 'ready'), { method: 'POST', token: seats[1].token, body: { revision: host.lobby.revision, ready: true }, status: 409 });
  await request(route(host.room, 'identity'), { method: 'POST', token: seats[1].token, body: { revision: current.lobby.revision, bankName: 'Harbor Federal' } });
  current = await request(route(host.room), { token: host.token });
  assert.equal(current.lobby.players[1].name, 'Harbor Federal'); assert(current.lobby.players.every(seat => !seat.ready));
  for (const seat of seats) await request(route(host.room, 'ready'), { method: 'POST', token: seat.token, body: { revision: current.lobby.revision, ready: true } });
  await request(route(host.room, 'start'), { method: 'POST', token: seats[1].token, body: { revision: current.lobby.revision }, status: 403 });
  const started = await request(route(host.room, 'start'), { method: 'POST', token: host.token, body: { revision: current.lobby.revision } });
  assert.equal(started.state.coreMultiplayerVersion, 1); assert.equal(started.state.cycle, 1); assert.equal(Object.keys(started.state.territories).length, 24);
  return seats;
}
async function delayedBodyChecks(app) {
  const host = await app.request('/rooms', { method: 'POST', body: { bankName: 'Delayed Host', players: 2 }, status: 201 });
  const noticed = once(app.server, 'request');
  let finish;
  const response = new Promise((resolve, reject) => {
    const request = http.request(app.base + route(host.room, 'ready'), { method: 'POST', headers: { Authorization: 'Bearer ' + host.token, 'Content-Type': 'application/json' } }, incoming => {
      const chunks = []; incoming.on('data', chunk => chunks.push(chunk)); incoming.on('end', () => resolve({ status: incoming.statusCode, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) }));
    });
    request.on('error', reject); request.write('{"revision":1,'); finish = () => request.end('"ready":true}');
  });
  await noticed;
  // This failure replaces the room with its rollback snapshot while the first
  // request is still receiving its body. Its completion must bind current state.
  await app.request(route(host.room, 'join'), { method: 'POST', body: { bankName: 'Delayed Host' }, status: 400 });
  finish(); const completed = await response; assert.equal(completed.status, 200); assert.equal(completed.body.lobby.players[0].ready, true);
  assert.equal((await app.request(route(host.room), { token: host.token })).lobby.players[0].ready, true, 'a delayed request must mutate the current room after rollback');
  await app.request(route(host.room, 'close'), { method: 'POST', token: host.token, body: { confirm: true } });
}
async function turnChecks(app, seats) {
  const { request, server } = app, host = seats[0], r = action => route(host.room, action);
  await request(r('export'), { token: seats[1].token, status: 403 });
  let exported = await request(r('export'), { token: host.token });
  for (let index = 0; index < seats.length; index++) privateView((await request(r(), { token: seats[index].token })).state, index, exported.game);
  const other = await request('/rooms', { method: 'POST', body: { bankName: 'Other Host', players: 2, aiSeats: [1] }, status: 201 });
  await request(r(), { token: other.token, status: 401 });
  const guest = seats[1], state = (await request(r(), { token: guest.token })).state, legal = copy(server.engine.chooseBot(copy(exported.game), 1));
  const before = JSON.stringify(exported.game);
  await request(r('plan'), { method: 'POST', token: guest.token, body: { ...envelope(state, 'malformed-plan', legal), plan: { ...legal, focus: 'missing_market' } }, status: 400 });
  for (const [field, value] of [['depositPolicy', 'toString'], ['lendingPolicy', 'constructor'], ['capitalPolicy', 'toString'], ['competitiveAction', 'toString']]) {
    await request(r('plan'), { method: 'POST', token: guest.token, body: envelope(state, 'prototype-enum-' + field, { ...legal, [field]: value }), status: 400 });
    assert.equal(JSON.stringify((await request(r('export'), { token: host.token })).game), before, 'a prototype enum must be rejected before locking another bank');
  }
  await request(r('plan'), { method: 'POST', token: guest.token, body: envelope(state, 'unknown-plan-field', { ...legal, unusedPadding: 'x'.repeat(1000) }), status: 400 });
  await request(r('plan'), { method: 'POST', token: guest.token, body: envelope(state, 'oversized-plan-field', { ...legal, unusedPadding: 'x'.repeat(65536) }), status: 413 });
  assert.equal(JSON.stringify((await request(r('export'), { token: host.token })).game), before, 'rejected plans must be atomic');
  await request(r('plan'), { method: 'POST', token: guest.token, body: { ...envelope(state, 'future-month', legal), cycle: 2 }, status: 409 });
  await request(r('plan'), { method: 'POST', token: guest.token, raw: JSON.stringify(envelope(state, 'polluted-plan', legal)).replace('"plan":{', '"plan":{"constructor":{"prototype":{"polluted":true}},'), status: 400 });
  const submission = envelope(state, 'guest-first-plan', legal);
  const locked = await request(r('plan'), { method: 'POST', token: guest.token, body: submission }); assert(locked.state.me.submitted); assert.equal(locked.state.cycle, 1);
  const sealed = JSON.stringify((await request(r('export'), { token: host.token })).game);
  await request(r('plan'), { method: 'POST', token: guest.token, body: submission });
  assert.equal(JSON.stringify((await request(r('export'), { token: host.token })).game), sealed, 'duplicate command cannot replace or charge a plan');
  await request(r('plan'), { method: 'POST', token: guest.token, body: { ...submission, plan: { ...legal, hires: 1 } }, status: 409 });
  const recall = envelope(locked.state, 'guest-first-recall');
  const recalled = await request(r('recall'), { method: 'POST', token: guest.token, body: recall }); assert(!recalled.state.me.submitted);
  await request(r('recall'), { method: 'POST', token: guest.token, body: recall });
  assert.equal(JSON.stringify((await request(r('export'), { token: host.token })).game), before, 'recall changes no world state or money');
  for (let month = 0; month < 3; month++) {
    exported = await request(r('export'), { token: host.token }); const openingCycle = exported.game.cycle, plans = exported.game.players.map((player, index) => copy(server.engine.chooseBot(copy(exported.game), index)));
    const states = [];
    for (const [index, seat] of seats.entries()) {
      const live = (await request(r(), { token: seat.token })).state;
      const body = envelope(live, 'month-' + month + '-seat-' + index, plans[index]);
      states.push(await request(r('plan'), { method: 'POST', token: seat.token, body }));
      if (index < seats.length - 1) assert.equal(states.at(-1).state.cycle, openingCycle, 'a disconnected reserved bank must hold the month open');
      else { assert.equal(states.at(-1).state.cycle, openingCycle + 1); await request(r('plan'), { method: 'POST', token: seat.token, body }); assert.equal((await request(r(), { token: seat.token })).state.cycle, openingCycle + 1); }
    }
    const resolved = await request(r('export'), { token: host.token }); assert.equal(resolved.game.resolutionId, exported.game.resolutionId + 1);
    for (const [index, seat] of seats.entries()) privateView((await request(r(), { token: seat.token })).state, index, resolved.game);
    server.engine.validateLedger(resolved.game);
  }
  await request(r('plan'), { method: 'POST', token: guest.token, body: { ...submission, commandId: 'old-uncached-plan' }, status: 409 });
  await request(r('configure'), { method: 'POST', token: host.token, body: { revision: locked.lobby.revision, players: 2 }, status: 409 });
  const current = (await request(r(), { token: host.token })).state;
  await request(r('advance'), { method: 'POST', token: guest.token, body: envelope(current, 'guest-observer-denied'), status: 403 });
  await request(r('advance'), { method: 'POST', token: host.token, body: envelope(current, 'human-still-active'), status: 400 });
  return (await request(r('export'), { token: host.token })).game;
}
async function savedAndAiChecks(app, saved) {
  const { request, server } = app;
  const restored = await request('/rooms', { method: 'POST', body: { game: saved, bankName: 'Ignored Rename' }, status: 201 });
  assert.equal(restored.lobby.resume.cycle, saved.cycle); assert.deepEqual(restored.lobby.players.map(seat => seat.name), saved.players.map(player => player.name));
  const seats = [restored]; for (let index = 1; index < saved.players.length; index++) seats.push(await request(route(restored.room, 'join'), { method: 'POST', body: { bankName: 'Ignored Rename ' + index }, status: 201 }));
  let live = await request(route(restored.room), { token: restored.token });
  await request(route(restored.room, 'identity'), { method: 'POST', token: restored.token, body: { revision: live.lobby.revision, bankName: 'Rename' }, status: 409 });
  for (const seat of seats) await request(route(restored.room, 'ready'), { method: 'POST', token: seat.token, body: { revision: live.lobby.revision, ready: true } });
  const resumed = await request(route(restored.room, 'start'), { method: 'POST', token: restored.token, body: { revision: live.lobby.revision } });
  assert.equal(resumed.state.cycle, saved.cycle); assert.deepEqual((await request(route(restored.room, 'export'), { token: restored.token })).game, saved);
  const host = await request('/rooms', { method: 'POST', body: { bankName: 'Human and AI', players: 4, aiSeats: [2, 3], coreMap: 'national', seed: 'server-ai-check' }, status: 201 });
  const guest = await request(route(host.room, 'join'), { method: 'POST', body: { bankName: 'Second Human' }, status: 201 });
  live = await request(route(host.room), { token: host.token });
  for (const seat of [host, guest]) await request(route(host.room, 'ready'), { method: 'POST', token: seat.token, body: { revision: live.lobby.revision, ready: true } });
  await request(route(host.room, 'start'), { method: 'POST', token: host.token, body: { revision: live.lobby.revision } });
  const game = (await request(route(host.room, 'export'), { token: host.token })).game;
  assert.equal(Object.keys(game.territories).length, 12);
  for (const [index, seat] of [host, guest].entries()) { const state = (await request(route(host.room), { token: seat.token })).state; await request(route(host.room, 'plan'), { method: 'POST', token: seat.token, body: envelope(state, 'with-ai-seat-' + index, copy(server.engine.chooseBot(copy(game), index))) }); }
  assert.equal((await request(route(host.room), { token: host.token })).state.cycle, 2, 'AI banks resolve without invented human credentials');
  await request('/rooms', { method: 'POST', body: { game: { ...saved, coreMultiplayerVersion: 2 } }, status: 400 });
}
async function restartChecks(engineHtml) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'branchwars-server-'));
  let app;
  try {
    app = await launch({ ...engineHtml, dataDir: directory });
    assert.throws(() => createServer({ ...engineHtml, dataDir: directory }), /already used/);
    const local = app.server.engine.createGame({ coreMultiplayerVersion: 1, coreMap: 'continental', mode: 'hotseat', seed: 'persistent-core', created: 1, players: [{ name: 'A', isBot: false }, { name: '<B>', isBot: false }] });
    const host = await app.request('/rooms', { method: 'POST', body: { game: local }, status: 201 });
    assert.deepEqual(host.lobby.players.map(seat => seat.name), ['A', '<B>'], 'valid one-character and literal markup local names survive online import');
    const guest = await app.request(route(host.room, 'join'), { method: 'POST', body: { bankName: 'Ignored Rename' }, status: 201 });
    let live = await app.request(route(host.room), { token: host.token });
    for (const seat of [host, guest]) await app.request(route(host.room, 'ready'), { method: 'POST', token: seat.token, body: { revision: live.lobby.revision, ready: true } });
    await app.request(route(host.room, 'start'), { method: 'POST', token: host.token, body: { revision: live.lobby.revision } });
    const before = (await app.request(route(host.room, 'export'), { token: host.token })).game;
    live = await app.request(route(host.room), { token: guest.token });
    const pending = envelope(live.state, 'persistent-plan', copy(app.server.engine.chooseBot(copy(before), 1)));
    await app.request(route(host.room, 'plan'), { method: 'POST', token: guest.token, body: pending });
    const filename = path.join(directory, host.room + '.json'), stored = fs.readFileSync(filename, 'utf8');
    assert(!stored.includes(host.token)); assert(!stored.includes(guest.token)); assert(stored.includes('tokenHash'));
    assert(JSON.parse(stored).room.seats.every(seat => seat.commands.every(([id, fingerprint]) => /^[0-9a-f]{64}$/.test(fingerprint))), 'command receipts retain fixed-size hashes, not private plan payloads');
    if (process.platform !== 'win32') { assert.equal(fs.statSync(directory).mode & 0o777, 0o700); assert.equal(fs.statSync(filename).mode & 0o777, 0o600); }
    const sealed = (await app.request(route(host.room, 'export'), { token: host.token })).game;
    await app.close(); app = await launch({ ...engineHtml, dataDir: directory });
    live = await app.request(route(host.room, 'resume'), { token: guest.token }); assert(live.state.me.submitted); assert.deepEqual((await app.request(route(host.room, 'export'), { token: host.token })).game, sealed);
    assert.deepEqual(live.lobby.players.map(seat => seat.name), ['A', '<B>'], 'short and escaped names survive durable restart');
    await app.request(route(host.room, 'plan'), { method: 'POST', token: guest.token, body: pending });
    assert.deepEqual((await app.request(route(host.room, 'export'), { token: host.token })).game, sealed, 'restart retains command replay protection');
    const state = (await app.request(route(host.room), { token: host.token })).state;
    const final = envelope(state, 'persistent-host-final', copy(app.server.engine.chooseBot(copy(sealed), 0)));
    await app.request(route(host.room, 'plan'), { method: 'POST', token: host.token, body: final });
    const resolved = (await app.request(route(host.room, 'export'), { token: host.token })).game; assert.equal(resolved.cycle, 2);
    await app.close(); app = await launch({ ...engineHtml, dataDir: directory });
    await app.request(route(host.room, 'plan'), { method: 'POST', token: host.token, body: final });
    assert.deepEqual((await app.request(route(host.room, 'export'), { token: host.token })).game, resolved, 'accepted final submit cannot settle again after restart');
    const stateBeforeFailure = await app.request(route(host.room), { token: guest.token });
    const input = envelope(stateBeforeFailure.state, 'storage-failed-command', copy(app.server.engine.chooseBot(copy(resolved), 1)));
    const rename = fs.renameSync; fs.renameSync = () => { throw Error('simulated disk failure'); };
    try { await app.request(route(host.room, 'plan'), { method: 'POST', token: guest.token, body: input, status: 503 }); } finally { fs.renameSync = rename; }
    assert.deepEqual((await app.request(route(host.room, 'export'), { token: host.token })).game, resolved, 'failed durable save cannot stage a plan');
    await app.request(route(host.room, 'plan'), { method: 'POST', token: guest.token, body: input });
    assert((await app.request(route(host.room), { token: guest.token })).state.me.submitted, 'the same command remains retryable after storage recovers');
    await delayedBodyChecks(app);
    await app.request(route(host.room, 'close'), { method: 'POST', token: guest.token, body: { confirm: true }, status: 403 });
    await app.request(route(host.room, 'close'), { method: 'POST', token: host.token, body: { confirm: false }, status: 400 });
    await app.request(route(host.room, 'close'), { method: 'POST', token: host.token, body: { confirm: true } }); assert(!fs.existsSync(filename));
    await app.close(); app = await launch({ ...engineHtml, dataDir: directory });
    await app.request(route(host.room), { token: host.token, status: 404 });
    if (process.platform === 'linux') {
      await app.close();
      fs.writeFileSync(path.join(directory, '.server.lock'), JSON.stringify({ pid: process.pid, identity: { boot: 'different-boot', start: 'different-process' } }), { mode: 0o600 });
      app = await launch({ ...engineHtml, dataDir: directory });
      assert(app.server.listening, 'a reused PID with a different process identity must not block restart');
    }
  } finally { if (app?.server.listening) await app.close(); fs.rmSync(directory, { recursive: true, force: true }); }
}
async function creationLimits(engineHtml) {
  const app = await launch({ ...engineHtml, maxRooms: 1, maxCreationsPerMinute: 2 });
  try {
    const first = await app.request('/rooms', { method: 'POST', body: { bankName: 'First Room', players: 2 }, status: 201 });
    await app.request('/rooms', { method: 'POST', body: { bankName: 'Full Server', players: 2 }, status: 503 });
    await app.request(route(first.room, 'close'), { method: 'POST', token: first.token, body: { confirm: true } });
    const second = await app.request('/rooms', { method: 'POST', body: { bankName: 'Reused Capacity', players: 2 }, status: 201 });
    await app.request(route(second.room, 'close'), { method: 'POST', token: second.token, body: { confirm: true } });
    await app.request('/rooms', { method: 'POST', body: { bankName: 'Rate Limited', players: 2 }, status: 429 });
  } finally { await app.close(); }
}
async function initialHandshakeChecks(engineHtml) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'branchwars-initial-key-'));
  let app;
  const createBody = { bankName: 'Retry Host', players: 4, coreMap: 'continental', seed: 'initial-key-restart', seatKey: crypto.randomBytes(32).toString('hex') };
  const joinBodies = Array.from({ length: 3 }, (_, index) => ({ bankName: 'Retry Guest ' + (index + 1), seatKey: crypto.randomBytes(32).toString('hex') }));
  async function loseResponse(routeName, body) {
    let dropped = false;
    app.server.once('request', (request, response) => {
      assert.equal(request.method, 'POST'); assert.equal(request.url, '/api/multiplayer' + routeName);
      // The canonical mutation and private storage complete before send calls
      // end; destroy the real socket before the credential response arrives.
      response.end = function () { dropped = true; this.destroy(); return this; };
    });
    await assert.rejects(app.request(routeName, { method: 'POST', body, status: 201 }));
    assert(dropped, 'The initial private response must actually be dropped.');
  }
  function privateStorage() {
    for (const file of fs.readdirSync(directory).filter(name => name.endsWith('.json'))) {
      const text = fs.readFileSync(path.join(directory, file), 'utf8');
      for (const body of [createBody, ...joinBodies]) assert(!text.includes(body.seatKey), 'Storage retained a plaintext initial seat key.');
      const document = JSON.parse(text);
      for (const seat of document.room.seats.filter(item => item.initialRequest)) {
        assert.deepEqual(Object.keys(seat.initialRequest).sort(), ['action', 'fingerprint']);
        assert.match(seat.initialRequest.fingerprint, /^[a-f0-9]{64}$/);
      }
    }
  }
  const reopen = async () => { await app.close(); app = await launch({ ...engineHtml, dataDir: directory, maxCreationsPerMinute: 2 }); };
  try {
    app = await launch({ ...engineHtml, dataDir: directory, maxCreationsPerMinute: 2 });
    for (const seatKey of ['', null, false, 'a'.repeat(63), 'A'.repeat(64), 'g'.repeat(64)])
      await app.request('/rooms', { method: 'POST', body: { ...createBody, seatKey }, status: 400 });
    await loseResponse('/rooms', createBody); privateStorage(); await reopen();
    const host = await app.request('/rooms', { method: 'POST', body: createBody });
    assert(host.token === createBody.seatKey); assert.equal(host.seat, 0); assert.equal(host.lobby.revision, 1);
    assert.equal(fs.readdirSync(directory).filter(name => name.endsWith('.json')).length, 1, 'Retry Create must not allocate a second room.');
    const r = action => route(host.room, action);
    const reordered = Object.fromEntries(Object.entries(createBody).reverse());
    assert.equal((await app.request('/rooms', { method: 'POST', body: reordered })).room, host.room, 'Request key order must not change initial identity.');
    const conflict = await app.request('/rooms', { method: 'POST', body: { ...createBody, seed: 'changed-intent' }, status: 409 });
    assert.equal(conflict.code, 'handshake_conflict');
    await app.request(r('join'), { method: 'POST', body: { ...joinBodies[0], seatKey: createBody.seatKey }, status: 409 });
    await loseResponse(r('join'), joinBodies[0]);
    const claimed = await app.request(r(), { token: host.token });
    assert.equal(claimed.lobby.players.filter(seat => seat.claimed).length, 2); privateStorage(); await reopen();
    const guest = await app.request(r('join'), { method: 'POST', body: joinBodies[0] });
    assert(guest.token === joinBodies[0].seatKey); assert.equal(guest.seat, 1);
    assert.equal(guest.lobby.revision, claimed.lobby.revision, 'Retry Join must not clear existing readiness or increment revision.');
    await app.request(r('join'), { method: 'POST', body: { ...joinBodies[0], bankName: 'Changed Guest' }, status: 409 });
    const secondRoom = await app.request('/rooms', { method: 'POST', body: { bankName: 'Other Retry Host', players: 2 }, status: 201 });
    const otherConflict = await app.request(route(secondRoom.room, 'join'), { method: 'POST', body: joinBodies[0], status: 409 });
    assert.equal(otherConflict.code, 'handshake_conflict', 'A private key cannot claim a second room or disclose its original seat.');
    await app.request('/rooms', { method: 'POST', body: { ...createBody, seatKey: secondRoom.token }, status: 409 });
    // Repeated initial retries do not consume the room creation rate limit.
    await app.request('/rooms', { method: 'POST', body: createBody });
    const seats = [host, guest];
    const rename = fs.renameSync; fs.renameSync = () => { throw Error('simulated initial storage failure'); };
    try { await app.request(r('join'), { method: 'POST', body: joinBodies[1], status: 503 }); } finally { fs.renameSync = rename; }
    const afterStorageFailure = await app.request(r(), { token: host.token });
    assert.equal(afterStorageFailure.lobby.players.filter(seat => seat.claimed).length, 2);
    assert.equal(afterStorageFailure.lobby.revision, claimed.lobby.revision, 'A failed initial save must not reserve a seat or advance readiness.');
    const concurrentJoin = async () => {
      const response = await fetch(app.base + r('join'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(joinBodies[1]) });
      return { status: response.status, value: await response.json() };
    };
    const duplicates = await Promise.all([concurrentJoin(), concurrentJoin()]);
    assert.deepEqual(duplicates.map(result => result.status).sort(), [200, 201]);
    assert(duplicates.every(result => result.value.seat === 2 && result.value.token === joinBodies[1].seatKey), 'Concurrent initial Join retries must recover exactly one private seat.');
    seats.push(duplicates[0].value);
    seats.push(await app.request(r('join'), { method: 'POST', body: joinBodies[2], status: 201 }));
    const beforeDuplicate = await app.request(r(), { token: host.token });
    await app.request(route(secondRoom.room, 'join'), { method: 'POST', body: { bankName: 'Other Retry Host', seatKey: crypto.randomBytes(32).toString('hex') }, status: 400 });
    const revision = beforeDuplicate.lobby.revision;
    for (const seat of seats) await app.request(r('ready'), { method: 'POST', token: seat.token, body: { revision, ready: true } });
    const started = await app.request(r('start'), { method: 'POST', token: host.token, body: { revision } });
    await reopen();
    const resumedHost = await app.request('/rooms', { method: 'POST', body: createBody });
    assert.equal(resumedHost.room, host.room); assert.deepEqual(resumedHost.state, started.state, 'Create retry after start/restart must recover current owner state.');
    const resumedGuest = await app.request(r('join'), { method: 'POST', body: joinBodies[0] });
    assert.equal(resumedGuest.seat, 1);
    assert.equal(resumedGuest.lobby.revision, revision);
    const exported = await app.request(r('export'), { token: host.token });
    assert.equal(resumedGuest.state.me.id, exported.game.players[1].id);
    const state = JSON.stringify(resumedGuest.state), save = JSON.stringify(exported.game);
    for (const body of [createBody, ...joinBodies]) { assert(!state.includes(body.seatKey)); assert(!save.includes(body.seatKey)); }
    assert(!state.includes('initialRequest')); assert(!save.includes('initialRequest')); privateStorage();
    for (const [index, seat] of seats.entries()) {
      const live = (await app.request(r(), { token: seat.token })).state;
      await app.request(r('plan'), { method: 'POST', token: seat.token, body: envelope(live, 'initial-key-first-month-' + index, copy(app.server.engine.chooseBot(copy(exported.game), index))) });
    }
    const settled = await app.request(r(), { token: host.token }); assert.equal(settled.state.cycle, started.state.cycle + 1);
    assert.equal((await app.request('/rooms', { method: 'POST', body: createBody })).state.cycle, settled.state.cycle);
    const closed = await app.request(r('close'), { method: 'POST', token: host.token, body: { confirm: true } }); assert(closed.closed);
    await app.request(r('join'), { method: 'POST', body: joinBodies[0], status: 404 });
  } finally { if (app?.server.listening) await app.close(); fs.rmSync(directory, { recursive: true, force: true }); }
}
async function spectatorChecks(app) {
  const E = app.server.engine;
  const game = E.createGame({ coreMultiplayerVersion: 1, coreMap: 'continental', mode: 'hotseat', seed: 'core-n-3-continental', created: 1, players: [{ name: 'Retired Host', isBot: false }, { name: 'Remaining AI One', isBot: true }, { name: 'Remaining AI Two', isBot: true }] });
  const owner = game.players[0];
  // A conserved, journaled expense stress fixture earns actual receivership via
  // ordinary settlement; no elimination flag or money is fabricated.
  owner.accounting = E.AccountingPrototype.transact(owner.accounting, 'expense', owner.stats.cash);
  Object.assign(owner.stats, { cash: owner.accounting.accounts.cash, capital: owner.accounting.accounts.equity, earnings: owner.accounting.retainedEarnings });
  for (let month = 0; month < 8 && !owner.eliminated; month++) { E.submit(game, 0, { ...E.defaultCoreMultiplayerPlan(game, 0), decision: 'b' }); E.validateLedger(game); E.validatePilot(game); }
  assert(owner.eliminated); assert.equal(game.gameOver, false); E.migrateCampaign(copy(game));
  const host = await app.request('/rooms', { method: 'POST', body: { game }, status: 201 });
  await app.request(route(host.room, 'ready'), { method: 'POST', token: host.token, body: { revision: host.lobby.revision, ready: true } });
  await app.request(route(host.room, 'start'), { method: 'POST', token: host.token, body: { revision: host.lobby.revision } });
  const frozen = JSON.stringify({ stats: owner.stats, projects: owner.projects, accounting: owner.accounting, incomeHistory: owner.incomeHistory });
  for (let month = 0; month < 3; month++) {
    const state = (await app.request(route(host.room), { token: host.token })).state;
    const input = envelope(state, 'spectator-month-' + month);
    const observed = await app.request(route(host.room, 'advance'), { method: 'POST', token: host.token, body: input });
    assert.equal(observed.state.cycle, state.cycle + 1);
    await app.request(route(host.room, 'advance'), { method: 'POST', token: host.token, body: { resolutionId: input.resolutionId, cycle: input.cycle, commandId: input.commandId } });
    assert.equal((await app.request(route(host.room), { token: host.token })).state.cycle, state.cycle + 1, 'spectator replay cannot advance a second month');
    const saved = (await app.request(route(host.room, 'export'), { token: host.token })).game, retired = saved.players[0];
    assert.equal(JSON.stringify({ stats: retired.stats, projects: retired.projects, accounting: retired.accounting, incomeHistory: retired.incomeHistory }), frozen); E.validateLedger(saved); E.validatePilot(saved);
  }
}
async function main() {
  let app;
  try {
    app = await launch(); await delayedBodyChecks(app); const seats = await lobbyChecks(app); const saved = await turnChecks(app, seats); await savedAndAiChecks(app, saved); await spectatorChecks(app);
    await app.request('/rooms', { method: 'POST', raw: ' '.repeat(BODY_LIMIT + 1), status: 413 });
    const engineHtml = { engine: app.server.engine, html: '<!doctype html><title>Test transport document</title>' };
    await app.close(); await restartChecks(engineHtml); await creationLimits(engineHtml); await initialHandshakeChecks(engineHtml);
    console.log('Core multiplayer server PASS: four private human seats, authority/readiness/revision/input denials, concurrent body/rollback safety, bounded requests and command hashes, reserved disconnects, recall and single settlement, mixed AI play, safe save resume, spectator advancement with frozen retired books, hashed credentials, private atomic storage, restart/PID-reuse recovery, failed-storage retry, explicit room close, creation limits, and private client-held initial-key retry after response loss/restart.');
  } finally { if (app?.server.listening) await app.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
