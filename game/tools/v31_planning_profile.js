'use strict';
// CPU-profileable mature-state planning measurement. Engine-only, not browser
// responsiveness; original checkpoint bytes are read but never rewritten.
const fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto'),{performance}=require('node:perf_hooks');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const html=require('./build_game').assemble().html,code=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context={console};
vm.runInNewContext(code,context,{filename:'v31-assembled-engine.js'});
const E=context.BWEngine,input=process.argv[2]||'game/tests/fixtures/v31-group7-staffing120.json.gz',bytes=fs.readFileSync(input),capture=JSON.parse(zlib.gunzipSync(bytes)),g=capture.game;
E.validatePilot(g);const rows=[];
for(const bank of [0,1]){const start=performance.now(),plan=E.chooseBot(g,bank);rows.push({bank,elapsedMs:performance.now()-start,staff:g.players[bank].stats.staff,hires:E.planHires(plan)});}
console.log(JSON.stringify({suite:'v31-planning-profile',engineSha256:hash(code),fixtureSha256:hash(bytes),cycle:g.cycle,rows,
 scope:'Two ordinary AI plans on a real mature checkpoint in a fresh Node VM. Not browser latency or a matched performance benchmark.'}));
