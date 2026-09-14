'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const copy=x=>JSON.parse(JSON.stringify(x));
function load(html){const c={};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine;}
const baseline=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_premises1_c22b6106.html'),'utf8');
assert.equal(require('node:crypto').createHash('sha256').update(baseline).digest('hex'),'c22b610643d5b67174d0c0be0f9054e3180d6c031257435e86a726f5a5ed0bc7');
const E=load(require('../tools/build_game').assemble().html),old=load(baseline);
test('Expanded monthly earnings explain current ordered stages without changing plans, settlement, RNG or legacy projections',()=>{
 const options={...E.previewCampaignEdition({},'expanded').options,mode:'hotseat',seed:'business-balance:1',created:1},g=E.createGame(options),prior=old.createGame(options);
 for(let month=1;month<=2;month++){
  const opening=g.players.map(p=>p.stats.earnings),plans=g.players.map((_,i)=>E.chooseBot(g,i)),expected=prior.players.map((_,i)=>old.chooseBot(prior,i));
  assert.deepEqual(copy(plans),copy(expected));
  for(const i of [0,1]){E.submit(g,i,plans[i]);old.submit(prior,i,expected[i]);}
  assert.equal(JSON.stringify(g),JSON.stringify(prior),'Reporting fix must not alter any saved state or RNG');E.validatePilot(g);E.validateLedger(g);
  const bytes=JSON.stringify(g);
  for(const i of [0,1]){
   const v=E.publicState(g,i),b=v.earningsBridge,previous=old.publicState(prior,i);
   assert(b.available,b.reason);assert.equal(b.opening,opening[i]);assert.equal(b.closing,g.players[i].stats.earnings);
   assert.equal(b.opening+b.operatingProfit+b.otherNet,b.closing);assert.equal(previous.earningsBridge.available,false,'Preserved build reproduces missing-stage bug');
   const cleaned=copy(v);cleaned.earningsBridge=copy(previous.earningsBridge);assert.deepEqual(cleaned,copy(previous),'Only owner earnings summary may change');
   assert.equal(v.rival.earningsBridge,undefined);
   const complete=copy(v);complete.causalEvents=copy(g.eventLedger.filter(e=>e.target===v.me.id&&(e.deltas||e.category==='resolution.start')));complete.operatingEvents=copy(g.eventLedger.filter(e=>e.target===v.me.id&&e.category==='operations.result'));complete.causalView={firstIncludedId:complete.causalEvents[0]?.id||null};
   assert(E.BankEarningsBridge.review(complete).available);
   const stage=complete.causalEvents.find(e=>e.category==='group.premises'&&e.cycle===month);assert(stage);stage.source='unrecognizedStage';assert.equal(E.BankEarningsBridge.review(complete).available,false);
  }
  assert.equal(JSON.stringify(g),bytes,'Projection must be pure');
 }
 const legacyOptions={...options,sharedPremisesVersion:0},a=E.createGame(legacyOptions),b=old.createGame(legacyOptions);
 const plans=a.players.map((_,i)=>E.chooseBot(a,i)),other=b.players.map((_,i)=>old.chooseBot(b,i));assert.deepEqual(copy(plans),copy(other));
 for(const i of [0,1]){E.submit(a,i,plans[i]);old.submit(b,i,other[i]);}
 assert.equal(JSON.stringify(a),JSON.stringify(b));for(const i of [0,1])assert.deepEqual(copy(E.publicState(a,i)),copy(old.publicState(b,i)));
});
