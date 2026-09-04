'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'BRANCH_WARS.html'), 'utf8');

function clientFunction(name) {
  let start = html.indexOf(`function ${name}(`);
  assert(start >= 0, `client function ${name} must exist`);
  if (html.slice(start - 6, start) === 'async ') start -= 6;
  const end = html.indexOf('\nfunction ', start + 1);
  return html.slice(start, end === -1 ? html.length : end);
}

function response(status, body, headers = {}) {
  const normalized = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: key => normalized[String(key).toLowerCase()] ?? null },
    json: async () => body,
  };
}

function quickTimers() {
  const handles = new Set();
  return {
    setTimeout(fn) {
      const handle = setTimeout(() => { handles.delete(handle); fn(); }, 1);
      handles.add(handle);
      return handle;
    },
    clearTimeout(handle) {
      handles.delete(handle);
      clearTimeout(handle);
    },
    close() {
      for (const handle of handles) clearTimeout(handle);
      handles.clear();
    },
  };
}

async function waitFor(predicate, message) {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  assert.fail(message);
}

async function testRepositoryQueue() {
  const timers = quickTimers();
  const files = new Map();
  let loseFirstWriteResponse = true;
  const statuses = [];
  const context = vm.createContext({
    URL,
    TextEncoder,
    console,
    crypto: webcrypto,
    globalThis: null,
    queueMicrotask,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    atob: value => Buffer.from(value, 'base64').toString('binary'),
    escape,
    unescape,
    encodeURIComponent,
    decodeURIComponent,
    setConnection: (text, kind) => statuses.push({ text, kind }),
  });
  context.globalThis = context;
  context.fetch = async (rawUrl, options = {}) => {
    const url = new URL(rawUrl);
    if (url.pathname === '/repos/test/branchwars') {
      return response(200, { default_branch: 'trunk', private: true, archived: false, permissions: { push: true } });
    }
    const prefix = '/repos/test/branchwars/contents/';
    assert(url.pathname.startsWith(prefix));
    const file = decodeURIComponent(url.pathname.slice(prefix.length));
    if (!options.method || options.method === 'GET') {
      assert.equal(url.searchParams.get('ref'), 'trunk', 'reads use the discovered default branch');
      const current = files.get(file);
      if (!current) return response(404, { message: 'Not Found' });
      if (options.headers['If-None-Match'] === current.etag) return response(304, null, { etag: current.etag });
      return response(200, { sha: current.sha, content: current.content }, { etag: current.etag });
    }
    assert.equal(options.method, 'PUT');
    const body = JSON.parse(options.body);
    assert.equal(body.branch, 'trunk');
    const current = files.get(file);
    if (current && body.sha !== current.sha) return response(409, { message: 'Conflict' });
    if (!current && body.sha) return response(409, { message: 'Conflict' });
    const sha = `sha-${Date.now()}-${Math.random()}`;
    const etag = `"${sha}"`;
    files.set(file, { sha, etag, content: body.content });
    if (loseFirstWriteResponse) {
      loseFirstWriteResponse = false;
      await new Promise(resolve => setTimeout(resolve, 5));
      throw new TypeError('simulated connection loss after GitHub accepted the write');
    }
    return response(200, { content: { sha } });
  };

  const functions = [
    'ghPath', 'ghUrl', 'ghHeaders', 'ghEncode', 'ghDecode', 'ghNonce', 'ghPlanHash', 'ghFail',
    'ghNormalizeRepo', 'ghNormalizeApi', 'ghCheckRepo', 'ghRead', 'ghWrite',
    'ghFlush', 'ghSend',
  ];
  vm.runInContext(`const GH_MAX_TRAIL=20; var gh; ${functions.map(clientFunction).join('\n')}`, context);
  context.gh = { active: true, api: 'https://api.github.com', repo: 'test/branchwars', branch: '', private: true, room: 'ABCDEFGH', token: 'token', side: 'guest', mine: 0, published: 0, seen: 0, sha: '', etag: '', outbox: [], busy: false, sendFailures: 0, pollFailures: 0, retryTimer: null };
  await context.ghCheckRepo();
  assert.equal(context.gh.branch, 'trunk');
  const sealedPlan = { focus: 'downtown', decision: 'a' };
  const nonce = 'ab'.repeat(24);
  const planHash = await context.ghPlanHash(sealedPlan, nonce);
  assert.match(planHash, /^[0-9a-f]{64}$/, 'repository plans use a SHA-256 commitment');
  assert.notEqual(await context.ghPlanHash({ ...sealedPlan, decision: 'b' }, nonce), planHash, 'changing a sealed plan changes its commitment');
  context.ghSend({ type: 'hello' });
  context.ghSend({ type: 'plan', plan: { focus: 'downtown' } });
  await waitFor(() => context.gh.published === 2, 'repository queue did not reconcile and publish both messages');
  const stored = files.get('branchwars/ABCDEFGH/guest.json');
  const payload = JSON.parse(Buffer.from(stored.content, 'base64').toString('utf8'));
  assert.equal(payload.seq, 2);
  assert.deepEqual(payload.messages.map(item => item.seq), [1, 2]);
  assert(statuses.some(item => item.text.includes('queued for retry')), 'lost response exercised the retry path');
  assert(statuses.at(-1).text.includes('LINKED'));
  context.gh.active = false;
  timers.close();
}

assert.match(clientFunction('submitPlan'), /gh\.active\)await ghCommitPlan\(plan\)/, 'Repository Link sends a commitment before revealing a plan');
assert.match(clientFunction('handleMessage'), /This Repository Link client is outdated and did not seal its plan/, 'Repository Link rejects legacy plaintext plans');

async function testLanQueue() {
  const timers = quickTimers();
  const accepted = new Map();
  let requests = 0;
  const statuses = [];
  const context = vm.createContext({
    console,
    crypto: webcrypto,
    globalThis: null,
    queueMicrotask,
    AbortController,
    Math,
    Date,
    JSON,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    setConnection: (text, kind) => statuses.push({ text, kind }),
  });
  context.globalThis = context;
  context.fetch = async (_url, options) => {
    requests++;
    const body = JSON.parse(options.body);
    if (!accepted.has(body.clientId)) accepted.set(body.clientId, body.message);
    if (requests === 1) return response(503, { error: 'simulated lost acknowledgement' });
    return response(200, { ok: true, duplicate: true, seq: 1 });
  };
  const functions = ['emptyLan', 'lanRequest', 'messageId', 'lanFlush', 'lanSend'];
  vm.runInContext(`var lan; ${functions.map(clientFunction).join('\n')}`, context);
  context.lan = { ...context.emptyLan(), active: true, room: 'ROOM01', token: 'token' };
  context.lanSend({ type: 'plan' });
  await waitFor(() => context.lan.outbox.length === 0, 'LAN queue did not retry and drain');
  assert.equal(accepted.size, 1, 'retry must reuse the same client message id');
  assert.equal(requests, 2);
  assert(statuses.some(item => item.text.includes('queued for retry')));
  context.lan.active = false;
  timers.close();
}

(async () => {
  await testRepositoryQueue();
  await testLanQueue();
  console.log('Branch Wars transport tests passed: ordered retry, lost-response reconciliation, default-branch discovery, and LAN idempotency.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
