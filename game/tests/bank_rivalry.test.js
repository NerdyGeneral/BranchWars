'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x));
function load(html){const c={};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine;}
const prior=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_stabilization68_1cb80c01.html'),'utf8');
assert.equal(createHash('sha256').update(prior).digest('hex'),'1cb80c0125a960b0ff27ae7e12c521c919f0c7639fad9f43f4ddd6a849817674');
const old=load(prior),E=load(require('../tools/build_game').assemble().html);
const options=(enabled=true)=>({...old.previewCampaignEdition({},'expanded',{currentEconomics:true}).options,...(enabled?{bankRivalryVersion:1}:{}),mode:'hotseat',seed:'bank-rivalry',created:1,startingWorkforce:'covered'});
const books=g=>JSON.stringify(g.players.map(p=>({stats:p.stats,accounting:p.accounting,creditBook:p.creditBook,marketBook:p.marketBook,companyShares:p.companyShares})));
function divided(g){g.act=2;g.consolidationStalemate=7;for(const [k,t]of Object.entries(g.territories)){t.exited=k==='northside'?[true,false]:[false,true];t.shares=k==='northside'?[5,95]:[95,5];}}

test('old 9.32 creation, AI plans, settlement, RNG, saves and owner views remain exact',()=>{
 for(const scenario of ['balanced','rate','growth','regulatory']){
  const o={...options(false),scenario},a=old.createGame(o),b=E.createGame(o);assert.deepEqual(copy(b),copy(a));
  const x=a.players.map((_,i)=>old.chooseBot(a,i)),y=b.players.map((_,i)=>E.chooseBot(b,i));assert.deepEqual(copy(y),copy(x));
  for(const seat of [0,1]){old.submit(a,seat,x[seat]);E.submit(b,seat,y[seat]);}
  assert.deepEqual(copy(b),copy(a));assert.deepEqual(copy(E.migrateCampaign(copy(b))),copy(old.migrateCampaign(copy(a))));
  for(const seat of [0,1])assert.deepEqual(copy(E.publicState(b,seat)),copy(old.publicState(a,seat)));
 }
});
test('split-market automatic auction still reproduces on old rules but cannot end new rivalry',()=>{
 const legacy=E.createGame(options(false)),g=E.createGame(options());divided(legacy);divided(g);E.validatePilot(g);
 const before=books(g);assert.equal(E.evaluateStrategicEnd(legacy),'');assert.match(E.evaluateStrategicEnd(legacy),/CONTROL VICTORY/);assert.equal(legacy.endReason,'buyout');
 for(let i=0;i<24;i++){assert.equal(E.evaluateStrategicEnd(g),'');assert.equal(g.gameOver,false);assert.deepEqual(copy(g.buyoutPressure),[0,0]);}
 assert.equal(books(g),before,'No subsidy or unpriced book transfer accompanies continued play');
 for(const t of Object.values(g.territories)){t.exited=[false,true];t.shares=[95,5];}
 assert.equal(E.evaluateStrategicEnd(g),'');assert.equal(g.gameOver,false,'Even total market dominance is not institutional failure');
 assert.equal(books(g),before);
});
test('new ending metadata does not alter ordinary economics, paid AI plans or RNG before an ending',()=>{
 const a=E.createGame(options(false)),b=E.createGame(options());
 const strip=value=>JSON.parse(JSON.stringify(value,(key,v)=>key==='bankRivalryVersion'?undefined:key==='version'&&v==='9.33'?'9.32':v));
 assert.deepEqual(strip(b),copy(a));
 for(let month=0;month<3;month++){
  const x=a.players.map((_,i)=>E.chooseBot(a,i)),y=b.players.map((_,i)=>E.chooseBot(b,i));assert.deepEqual(copy(y),copy(x));
  for(const seat of [0,1]){E.submit(a,seat,x[seat]);E.submit(b,seat,y[seat]);}
  assert.deepEqual(strip(b),copy(a));E.validatePilot(b);E.validateLedger(b);
 }
});
test('distress and institutional failure remain real, and obsolete bank defense cannot consume funds',()=>{
 const g=E.createGame(options()),before=books(g);g.players[1].distress=3;
 assert.match(E.evaluateStrategicEnd(g),/BANK RESOLUTION/);assert.equal(g.gameOver,true);assert.equal(g.winnerId,g.players[0].id);assert.equal(g.endReason,'receivership');assert.equal(books(g),before);
 const both=E.createGame(options());both.players.forEach(p=>p.distress=3);E.evaluateStrategicEnd(both);assert.equal(both.winnerId,null);
 const live=E.createGame(options()),status=E.competitiveActionStatus(live.players[0],'takeoverDefense');assert.equal(status.eligible,false);assert.match(status.reason,/no automatic bank takeover/);
});
test('9.33 is explicit, complete, strictly validated and unsupported by old builds',()=>{
 const g=E.createGame(options());assert.equal(g.version,'9.33');E.validatePilot(g);E.validateLedger(g);
 assert.equal(E.previewCampaignEdition({},'expanded',{currentEconomics:true}).rules.version,'9.32');
 assert.equal(E.previewCampaignEdition({},'expanded',{currentEconomics:true,currentRivalry:true}).rules.version,'9.33');
 const core=E.previewCampaignEdition(options(),'core',{currentEconomics:true,currentRivalry:true});assert.equal(core.rules.version,'8.19');assert.equal(core.options.bankRivalryVersion,undefined);
 for(const marker of [2,-1,'1',null])assert.throws(()=>E.createGame({...options(),bankRivalryVersion:marker}),/bank rivalry/);
 assert.equal(E.createGame({...options(),bankRivalryVersion:0}).version,'9.32');
 assert.throws(()=>E.createGame({bankRivalryVersion:1}),/requires/);
 assert.throws(()=>E.createGame({...core.options,bankRivalryVersion:1}),/requires/);
 for(const mutate of [x=>delete x.bankRivalryVersion,x=>x.bankRivalryVersion=0,x=>x.version='9.32',x=>delete x.players[0].bankRivalryVersion,x=>{x.gameOver=true;x.endReason='buyout';}]){
  const invalid=copy(g);mutate(invalid);assert.throws(()=>E.migrateCampaign(invalid));
 }
 assert.throws(()=>old.migrateCampaign(copy(g)),/version|format/);
 const caps=E.campaignCapabilities();delete caps.bankRivalrySupported;assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps).field,'bankRivalryVersion');
 assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),E.campaignCapabilities()),null);
});

test('three settled funding breaches end new rivalry and survive save, private view and rematch validation',()=>{
 const g=E.createGame(options()),p=g.players[0],A=E.AccountingPrototype;
 // A funded stress fixture, not a resource gift: debt finances securities.
 // This leaves real interest, repayments and covenant checks to settlement.
 p.accounting=A.transact(p.accounting,'borrow',6000000);
 p.accounting=A.transact(p.accounting,'buySecurities',p.accounting.accounts.cash);
 const a=p.accounting.accounts;Object.assign(p.stats,{cash:a.cash,loans:a.loans,deposits:a.deposits,emergencyDebt:a.emergencyDebt,capital:a.equity,earnings:p.accounting.retainedEarnings});
 E.validatePilot(g);E.validateLedger(g);
 for(let month=1;month<=3;month++){
  const plans=g.players.map((_,i)=>E.chooseBot(g,i));
  E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validatePilot(g);E.validateLedger(g);
  assert.equal(g.players[0].fundingCovenant.streak,month);assert.equal(g.gameOver,month===3);
 }
 assert.equal(g.endReason,'funding_resolution');assert.equal(g.failedId,p.id);assert.equal(g.winnerId,g.players[1].id);
 const restored=E.migrateCampaign(copy(g));assert.deepEqual(copy(restored),copy(g));
 for(const seat of [0,1]){const v=E.publicState(restored,seat);E.validateIncomeHistoryView(v);assert.equal(v.endReason,'funding_resolution');assert.equal(v.bankRivalryVersion,1);}
 E.rematch(restored,0);E.rematch(restored,1);assert.equal(restored.gameOver,false);assert.equal(restored.version,'9.33');assert.equal(restored.bankRivalryVersion,1);E.validatePilot(restored);
});
test('real resolution, half-ready restore, forecasts, owner privacy and rematch retain the new boundary',()=>{
 const g=E.createGame(options()),plans=g.players.map((_,i)=>E.chooseBot(g,i));
 const before=JSON.stringify(g);for(const seat of [0,1]){const v=E.publicState(g,seat);E.validateIncomeHistoryView(v);assert.equal(v.bankRivalryVersion,1);assert.equal(v.me.bankRivalryVersion,1);assert.equal(v.rival.bankRivalryVersion,undefined);assert.match(v.competitiveForecast[0].text,/dominance and score advantages do not end/);E.operatingPreview(v.me,plans[seat],v.economy,v,true);}
 assert.equal(JSON.stringify(g),before);
 E.submit(g,0,plans[0]);const resumed=E.migrateCampaign(copy(g));E.submit(g,1,plans[1]);E.submit(resumed,1,copy(plans[1]));assert.deepEqual(copy(resumed),copy(g));E.validatePilot(g);E.validateLedger(g);
 const bad=copy(E.publicState(g,1));delete bad.bankRivalryVersion;assert.throws(()=>E.validateIncomeHistoryView(bad),/bank rivalry/);
 g.gameOver=true;g.endReason='receivership';g.cycle--;E.rematch(g,0);E.rematch(g,1);assert.equal(g.version,'9.33');assert.equal(g.bankRivalryVersion,1);assert(g.players.every(p=>p.bankRivalryVersion===1));E.validatePilot(g);
});
