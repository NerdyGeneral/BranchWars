'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8');
const context={console,Math,Date};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context);
const E=context.BWEngine,copy=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b));
const create=seed=>E.createGame({seed,created:1000,mode:'hotseat',scope:'national',scenario:'balanced',difficulty:'vp',name1:'One',name2:'Two'});
function turn(g){if(g.gameOver)return;const a=E.chooseBot(g,0),b=E.chooseBot(g,1);E.submit(g,0,a);E.submit(g,1,b)}
const a=create('replay'),b=create('replay'),noise=create('other');same(a,b);
for(let i=0;i<30;i++){turn(a);turn(noise);turn(b);same(a,b)}
const saved=copy(a);E.ensureSimulation(saved);
assert(a.eventLedger.length>0);
for(const seat of [0,1]){const events=E.publicState(a,seat).operatingEvents;assert(events.length>0);assert(events.every(e=>e.target===a.players[seat].id));const prior=a.eventLedger.find(e=>e.id===events[0].id).report.profit;events[0].report.profit=-999;assert.equal(a.eventLedger.find(e=>e.id===events[0].id).report.profit,prior)}
for(let i=0;i<20;i++){turn(a);turn(saved);same(a,saved)}
const p=create('preview'),plan=E.chooseBot(p,0),before=JSON.stringify(p);
E.operatingPreview(p.players[0],plan,p.economy);assert.equal(JSON.stringify(p),before);
const world=p.rng.state;E.chooseBot(p,1);assert.equal(p.rng.state,world,'AI planning cannot consume world stream');
for(const seat of [0,1]){const pub=E.publicState(p,seat);assert.equal(pub.rng,undefined);assert.equal(pub.simulationVersion,undefined)}
const legacy=copy(p);delete legacy.rng;delete legacy.simulationVersion;
const legacy2=copy(legacy);E.ensureSimulation(legacy);E.ensureSimulation(legacy2);same(legacy,legacy2);
const stable=JSON.stringify(legacy);E.ensureSimulation(legacy);assert.equal(JSON.stringify(legacy),stable);
const bad=copy(p);bad.rng.state=-1;assert.throws(()=>E.ensureSimulation(bad),/Invalid saved/);
const future=copy(p);future.simulationVersion=999;assert.throws(()=>E.ensureSimulation(future),/Unsupported/);
// Error unwinding must not leave the next campaign attached to an old context.
assert.throws(()=>E.submit(p,0,{focus:'missing'}));
same(create('after-error'),create('after-error'));
console.log('Determinism tests passed: explicit creation, independent/interleaved campaigns, save/resume, preview purity, separate AI stream, privacy, legacy initialization and validation.');
