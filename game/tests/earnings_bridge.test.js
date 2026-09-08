'use strict';
// Actual assembled engine and Overview renderer. No injected feature books,
// experimental implementations, gifts, or regenerated legacy fixtures.
if(!process.argv.includes('--source'))process.argv.push('--source');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const html=require('../tools/build_game').assemble().html,ctx={console},copy=x=>JSON.parse(JSON.stringify(x));
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const E=ctx.BWEngine,B=E.BankEarningsBridge;let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function create(version=6){return E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:version}).options,mode:'hotseat',seed:'earnings-bridge-live',created:1});}
const game=create(),opening=game.players.map(p=>p.accounting.retainedEarnings),openingBytes=JSON.stringify(game);
test('Opening month is unavailable, pure and not a saved field',()=>{
 const v=E.publicState(game,0);assert.equal(v.earningsBridge.available,false);assert.match(v.earningsBridge.reason,/Complete a month/);
 assert.equal(JSON.stringify(game),openingBytes);assert.equal(game.earningsBridge,undefined);assert.equal(game.players[0].earningsBridge,undefined);
});
const plans=game.players.map((p,i)=>E.chooseBot(game,i));E.submit(game,0,plans[0]);E.submit(game,1,plans[1]);
let ownerView;
test('Real simultaneous resolution reconciles known opening with final report exactly once',()=>{
 for(const seat of [0,1]){
  const v=E.publicState(game,seat),b=v.earningsBridge;
  assert(b.available,b.reason);assert.equal(b.opening,opening[seat]);assert.equal(b.closing,v.me.accounting.retainedEarnings);
  assert.equal(b.operatingProfit,v.me.operatingReport.profit);assert.equal(b.opening+b.operatingProfit+b.otherNet,b.closing);
  assert.equal(b.change,game.players[seat].accounting.retainedEarnings-opening[seat]);assert.equal(b.ownerId,v.me.id);
  assert.deepEqual(Object.keys(b).sort(),['version','ownerId','resolutionId','available','cycle','opening','operatingProfit','otherNet','change','closing'].sort());
  assert(Buffer.byteLength(JSON.stringify(b))<512);assert(!JSON.stringify(b).includes(v.rival.id));
  if(seat===0)ownerView=copy(v);
 }
});
test('Projection is pure, excludes rival books, and survives save/resume unchanged',()=>{
 const before=JSON.stringify(game),summary=B.project(game,0),altered=copy(game);altered.players[1].accounting.retainedEarnings=999999;
 assert.deepEqual(B.project(altered,0),summary);assert.equal(JSON.stringify(game),before);
 const restored=E.migrateCampaign(copy(game));assert.deepEqual(copy(E.publicState(restored,0).earningsBridge),copy(summary));
 assert.equal(restored.earningsBridge,undefined);assert.equal(restored.players[0].earningsBridge,undefined);
});
test('No lifetime reconstruction when monthly root or final report is absent or inconsistent',()=>{
 for(const mutate of [
  g=>{g.eventLedger=g.eventLedger.filter(e=>e.category!=='resolution.start');},
  g=>{g.eventLedger=g.eventLedger.filter(e=>e.category!=='operations.result');},
  g=>{g.eventLedger.reverse();},
  g=>{g.players[0].stats.earnings++;},
  g=>{g.resolutionId++;},
  g=>{g.eventLedger.find(e=>e.target===g.players[0].id&&e.deltas).deltas.earnings=NaN;},
  g=>{g.eventLedger.find(e=>e.target===g.players[0].id&&e.deltas).parentCause=99999;}
 ]){const bad=copy(game);mutate(bad);assert.equal(B.project(bad,0).available,false);}
});
test('All historical Group1–5 views retain field absence, not a silent upgrade',()=>{
 for(let version=1;version<=5;version++){const old=create(version),before=JSON.stringify(old);assert.equal(E.publicState(old,0).earningsBridge,undefined);assert.equal(B.project(old,0),null);assert.equal(JSON.stringify(old),before);}
});
const {harness}=require('./github_resilience.test'),h=harness();
h.run('game='+JSON.stringify(game)+';seat=0;gh.active=false;p2pRole="";newDraft(currentView());');
test('Actual Overview uses bounded summary after detailed owner history is trimmed',()=>{
 h.run('const bridgeView=currentView();bridgeView.causalEvents=[];bridgeView.operatingEvents=[];renderActualBankOperatingResult(bridgeView);');
 const rendered=h.elements.get('#operatingReport').innerHTML;
 assert.match(rendered,/Bank retained earnings · month 1/);assert.match(rendered,/Other net changes/);assert.match(rendered,/Latest completed month only/);
 assert.match(rendered,/included once/);assert.match(rendered,/not an expense for the consolidated group/);assert.match(rendered,/New deposits and borrowing are not earnings/);
 assert.equal((rendered.match(/class="earnings-bridge /g)||[]).length,1);assert.doesNotMatch(rendered,/<details[^>]*\sopen(?:\s|>)/);
});
test('Invalid draft forecast does not hide the actual completed earnings bridge',()=>{
 h.run('draft.departmentFunctionsPolicy.quotas.credit.lending=999;renderOperatingPreview(currentView());');
 assert.match(h.elements.get('#operatingPreview').innerHTML,/Forecast unavailable/);
 assert.match(h.elements.get('#operatingReport').innerHTML,/Bank retained earnings · month 1/);
});
test('UI rejects stale/malformed owner summaries and does not expose rival-only state',()=>{
 for(const mutate of [b=>b.ownerId='rival',b=>b.resolutionId++,b=>b.cycle++,b=>b.closing++,b=>b.operatingProfit++,b=>b.opening=Infinity,b=>b.version=2]){
  const v=copy(ownerView);mutate(v.earningsBridge);h.run('renderActualBankOperatingResult('+JSON.stringify(v)+');');
  assert.match(h.elements.get('#operatingReport').innerHTML,/bridge unavailable/);
 }
 const legacy=copy(ownerView);legacy.financialGroupVersion=5;h.run('renderActualBankOperatingResult('+JSON.stringify(legacy)+');');
 assert.doesNotMatch(h.elements.get('#operatingReport').innerHTML,/earnings-bridge/);
});
test('Positive operating profit and negative accumulated bank earnings remain distinct',()=>{
 // Presentation-only fixture: exact valid bridge identity/equations, not a game
 // grant or balance evidence. Ordinary saved campaign evidence is optional below.
 const v=copy(ownerView);v.me.operatingReport.profit=4000;v.me.accounting.retainedEarnings=-6000;v.me.stats.earnings=-6000;
 Object.assign(v.earningsBridge,{opening:-9000,operatingProfit:4000,otherNet:-1000,change:3000,closing:-6000});
 h.run('renderActualBankOperatingResult('+JSON.stringify(v)+');');
 const rendered=h.elements.get('#operatingReport').innerHTML;assert.match(rendered,/\$4,000/);assert.match(rendered,/−\$6,000/);assert.match(rendered,/−\$1,000/);
});
let savedOwners=0;
if(process.argv.includes('--saved-reports'))test('Retained actual 192/120 campaign evidence projects all 18 owner summaries',()=>{
 for(const name of ['department-group6-matrix192-second.json','department-group6-balanced120-first.json']){
  const r=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../reports/qa',name),'utf8'));
  for(const {game:g}of r.finalCheckpoints)for(const seat of [0,1]){const before=JSON.stringify(g),v=E.publicState(g,seat);assert(v.earningsBridge.available,v.earningsBridge.reason);assert.equal(v.earningsBridge.closing,g.players[seat].accounting.retainedEarnings);assert.equal(JSON.stringify(g),before);savedOwners++;}
 }
 assert.equal(savedOwners,18);
});
console.log(JSON.stringify({suite:'earnings-bridge',checks,savedOwners,actualMonths:1,assembledSha256:crypto.createHash('sha256').update(html).digest('hex'),scope:'Actual Group6 public projection and Overview renderer; no saved fields, money changes or legacy upgrades. Optional retained-report evidence is not required for clean-checkout regression.'}));
