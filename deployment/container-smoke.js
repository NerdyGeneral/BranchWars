'use strict';

// Real container acceptance with isolated storage. Credentials remain in memory.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const suffix = crypto.randomBytes(6).toString('hex');
const image = 'branchwars:deployment-smoke';
const container = 'branchwars-smoke-' + suffix;
const volume = container + '-rooms';
const config = fs.mkdtempSync(path.join(os.tmpdir(), 'branchwars-docker-'));
const dockerEnv = { ...process.env, DOCKER_CONFIG: config };
function docker(args, { quiet = false, allowFailure = false, input } = {}) {
  const result = spawnSync('docker', args, { cwd: root, env: dockerEnv, input, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (!quiet && result.stdout) process.stdout.write(result.stdout);
  if (result.status !== 0 && !allowFailure) throw Error('Docker command failed: ' + args[0] + '\n' + (result.stderr || result.error?.message || 'unknown error'));
  return ((result.stdout || '') + (args[0] === 'logs' ? result.stderr || '' : '')).trim();
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function start() {
  docker(['run', '-d', '--name', container, '--read-only', '--memory', '512m', '--cpus', '0.5',
    '--mount', 'type=volume,source=' + volume + ',target=/var/data', '-p', '127.0.0.1::10000', image], { quiet: true });
  const address = docker(['port', container, '10000/tcp'], { quiet: true });
  assert.match(address, /^127\.0\.0\.1:\d+$/);
  const origin = 'http://' + address;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (attempt % 5 === 0 && docker(['inspect', '-f', '{{.State.Running}}', container], { quiet: true }) !== 'true')
      throw Error('The packaged server stopped:\n' + docker(['logs', container], { quiet: true, allowFailure: true }));
    try {
      const response = await fetch(origin + '/api/multiplayer/health');
      if (response.ok && (await response.json()).ok === true) return origin;
    } catch {}
    await pause(200);
  }
  throw Error('The packaged server did not become ready.');
}
async function request(origin, route, { method = 'GET', token, body, status = 200 } = {}) {
  const response = await fetch(origin + '/api/multiplayer' + route, {
    method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000)
  });
  const data = await response.json();
  assert.equal(response.status, status, data.error || 'Unexpected response for ' + route);
  return data;
}
async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--skip-build') || args.length > 1) throw Error('Usage: node deployment/container-smoke.js [--skip-build]');
  if (!args.includes('--skip-build')) docker(['build', '-t', image, '.']);
  assert.equal(docker(['image', 'inspect', '-f', '{{.Config.User}}', image], { quiet: true }), 'node');
  docker(['volume', 'create', volume], { quiet: true });
  let origin = await start();
  assert.equal(docker(['exec', container, 'id', '-u'], { quiet: true }), '1000');
  assert.match(docker(['exec', container, 'node', '--version'], { quiet: true }), /^v24\./);
  const page = await fetch(origin + '/'); assert.equal(page.status, 200); assert.match(await page.text(), /<script id="engine">/);
  const files = JSON.parse(docker(['exec', container, 'node', '-e', "const fs=require('node:fs');function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name])}console.log(JSON.stringify(walk('/app')))"] , { quiet: true }));
  assert(files.every(file => file.startsWith('/app/game/src/') || ['/app/game/tools/build_game.js', '/app/game/tools/multiplayer_server.js', '/app/game/BRANCH_WARS.html'].includes(file)), 'The image contains unexpected repository or private files.');
  const created = await request(origin, '/rooms', { method: 'POST', body: { bankName: 'Container Bank', players: 2, aiSeats: [1], seed: 'container-restart' }, status: 201 });
  const route = '/rooms/' + created.room;
  await request(origin, route, { status: 401 });
  await request(origin, route + '/ready', { method: 'POST', token: created.token, body: { revision: created.lobby.revision, ready: true } });
  const started = await request(origin, route + '/start', { method: 'POST', token: created.token, body: { revision: created.lobby.revision } });
  assert.equal(started.state.coreMultiplayerVersion, 1);
  const exported = await request(origin, route + '/export', { token: created.token });
  const plan = JSON.parse(docker(['exec', '-i', container, 'node', '-e', "const E=require('/app/game/tools/multiplayer_server.js').loadEngine(require('node:fs').readFileSync('/app/game/BRANCH_WARS.html','utf8'));let s='';process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>console.log(JSON.stringify(E.chooseBot(JSON.parse(s),0))))"], { quiet: true, input: JSON.stringify(exported.game) }));
  const settled = await request(origin, route + '/plan', { method: 'POST', token: created.token, body: { commandId: 'container-first-month', cycle: started.state.cycle, resolutionId: started.state.resolutionId, plan } });
  assert.equal(settled.state.cycle, started.state.cycle + 1, 'The packaged server must execute an ordinary month.');
  const permissions = JSON.parse(docker(['exec', container, 'node', '-e', "const fs=require('node:fs');const p='/var/data/branchwars';console.log(JSON.stringify({directory:fs.statSync(p).mode&511,files:fs.readdirSync(p).filter(n=>n.endsWith('.json')).map(n=>fs.statSync(p+'/'+n).mode&511)}))"], { quiet: true }));
  assert.equal(permissions.directory, 0o700); assert.deepEqual(permissions.files, [0o600]);
  docker(['kill', container], { quiet: true });
  docker(['rm', container], { quiet: true });
  origin = await start();
  const resumed = await request(origin, route + '/resume', { token: created.token });
  assert.deepEqual(resumed, settled, 'A new container must recover the exact private seat and campaign from the volume.');
  await request(origin, route + '/close', { method: 'POST', token: created.token, body: { confirm: true } });
  console.log('Container acceptance passed: nonroot Node 24, exact release assets, private monthly campaign, 0700/0600 storage, crash/recreation reconnect.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => {
  docker(['rm', '-f', container], { quiet: true, allowFailure: true });
  docker(['volume', 'rm', volume], { quiet: true, allowFailure: true });
  fs.rmSync(config, { recursive: true, force: true });
});
