'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'),ctx={console,Math,Date};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const E=ctx.BWEngine,copy=x=>JSON.parse(JSON.stringify(x));
const client={E,console};
vm.runInNewContext(html.slice(html.indexOf('function repairGame'),html.indexOf('function saveLocal'))+';globalThis.migrate=migrateGame;',client);
const fresh=()=>E.createGame({seed:'migration',created:1,mode:'hotseat',scope:'national',scenario:'balanced',difficulty:'vp'});
function turn(g){if(g.gameOver)return;E.submit(g,0,E.chooseBot(g,0));E.submit(g,1,E.chooseBot(g,1))}
const g=fresh();for(let i=0;i<12;i++)turn(g);
const serialized=JSON.stringify(g),restored=client.migrate(g);
assert.equal(JSON.stringify(g),serialized,'migration never mutates caller-owned save');
const normalized=x=>{const v=copy(x);delete v.ledgerVersion;for(const p of v.players)delete p.strategy;return v};
assert.deepEqual(normalized(restored),normalized(g),'client repair preserves valid modern simulation');
for(let i=0;i<12;i++){turn(g);turn(restored);assert.deepEqual(normalized(restored),normalized(g),'actual client import must resume identically')}
const stable=JSON.stringify(restored);E.validateLedger(restored);assert.equal(JSON.stringify(restored),stable);
const locked=fresh();E.submit(locked,0,E.chooseBot(locked,0));const lockedCopy=client.migrate(locked);E.submit(locked,1,E.chooseBot(locked,1));E.submit(lockedCopy,1,E.chooseBot(lockedCopy,1));assert.deepEqual(normalized(lockedCopy),normalized(locked),'half-submitted turn survives import');
const failed=fresh();failed.players[0].stats.capital=0;assert.equal(client.migrate(failed).players[0].stats.capital,0,'import must not recapitalize a failed bank');
const missingRng=fresh();delete missingRng.rng;assert.throws(()=>client.migrate(missingRng),/RNG/);
for(const value of [-1,null,'1000',Infinity]){const badDebt=fresh();badDebt.players[0].stats.emergencyDebt=value;assert.throws(()=>client.migrate(badDebt),/emergency funding debt/)}
const oldFunding=fresh();delete oldFunding.fundingRulesVersion;oldFunding.players.forEach(p=>{delete p.fundingRulesVersion;delete p.stats.emergencyDebt});const oldRestored=client.migrate(oldFunding);assert.equal(oldRestored.fundingRulesVersion,1);assert(oldRestored.players.every(p=>p.fundingRulesVersion===1&&p.stats.emergencyDebt===0));
const mixed=fresh();mixed.players[1].fundingRulesVersion=1;assert.throws(()=>client.migrate(mixed),/funding rules version/);
const corruptions=[
 x=>{x.ledgerVersion=9},x=>{x.eventLedger={}},x=>{x.eventLedger[0].visibility='public'},
 x=>{x.eventLedger[0].target='intruder'},x=>{x.eventLedger[1].id=x.eventLedger[0].id},
 x=>{x.eventLedger[0].source='wrong'},x=>{x.ledgerSequence=1},
 x=>{x.eventLedger.find(e=>e.deltas).parentCause=999999},
 x=>{x.eventLedger.find(e=>e.deltas).deltas.cash=Infinity},
 x=>{x.eventLedger.find(e=>e.deltas).deltas.secretPlan=1},
 x=>{x.eventLedger[0].unexpected='not allowed'},
 x=>{x.eventLedger.find(e=>e.report).report.profit='NaN'},
 x=>{x.ledgerPrunedThrough=-1}
];
for(const damage of corruptions){const bad=copy(g);damage(bad);assert.throws(()=>E.validateLedger(bad),/ledger/i)}
const bad=copy(g);bad.eventLedger[0].visibility='public';const before=JSON.stringify(bad);assert.throws(()=>client.migrate(bad),/ledger/i);assert.equal(JSON.stringify(bad),before);
const legacy=copy(g);delete legacy.eventLedger;delete legacy.ledgerSequence;delete legacy.ledgerPrunedThrough;delete legacy.ledgerVersion;delete legacy.rng;delete legacy.simulationVersion;
assert.deepEqual(copy(client.migrate(legacy)),copy(client.migrate(legacy)),'legacy initialization is reproducible');
// Old unversioned operating-only history remains supported.
const old=copy(g);old.eventLedger=old.eventLedger.filter(e=>e.category==='operations.result');delete old.ledgerVersion;
E.validateLedger(old);
// A retained suffix may reference a parent that has explicitly been pruned.
const pruned=copy(g),removed=pruned.eventLedger.splice(0,5);pruned.ledgerPrunedThrough=removed.at(-1).id;E.validateLedger(pruned);
console.log('Save integrity tests passed: real client migration/resume, idempotence, legacy histories, pruning, 13 corruption cases and non-mutating rejection.');
