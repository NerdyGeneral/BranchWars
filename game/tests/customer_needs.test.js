'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'),copy=x=>JSON.parse(JSON.stringify(x));
function engine(h){const c={console,Math,Date};vm.runInNewContext(h.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine}
function client(h,E){const c={E,console};vm.runInNewContext(h.slice(h.indexOf('function repairGame'),h.indexOf('function saveLocal'))+';globalThis.migrate=migrateGame;',c);return c}
for(const s of source.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(s[1]);
const E=engine(source),C=client(source,E),prior=fs.readFileSync(path.join(root,'reports/reference-builds/BRANCH_WARS_relationship_c0a9ee1.html'),'utf8'),Old=engine(prior),OC=client(prior,Old);
const options={managementVersion:2,customerDemandVersion:1,campaignRulesVersion:1,mode:'hotseat',seed:'customer-needs',created:1};
const fresh=()=>E.createGame(options),g=fresh(),p=g.players[0];
assert.equal(g.version,'8.3');assert.throws(()=>OC.migrate(copy(g)),/supported/);
assert.throws(()=>E.createGame({...options,managementVersion:1}),/requires/);
assert.throws(()=>E.createGame({...options,customerDemandVersion:3}),/Unsupported/);
let hidden=true;vm.runInNewContext(source.match(/^function updateContinue\(\).*$/m)[0]+';updateContinue()',{E,savedGame:()=>g,$:()=>({classList:{toggle:(_,v)=>hidden=v}})});assert.equal(hidden,false);
const one=k=>({essential:0,rewards:0,highYield:0,[k]:4}),north=E.customerDemand(p,g,'northside'),uni=E.customerDemand(p,g,'university');
assert(north.segments[0].share>uni.segments[0].share);
assert(E.customerDemand(p,g,'university',one('rewards')).fit>E.customerDemand(p,g,'university',one('essential')).fit);
assert(E.customerDemand(p,g,'northside',one('essential')).fit>E.customerDemand(p,g,'northside',one('highYield')).fit);
assert(E.customerDemand(p,g,'county_seat',one('highYield')).fit>E.customerDemand(p,g,'county_seat',one('essential')).fit);
assert(E.customerDemand(p,g,'county_seat',one('highYield')).fit>E.customerDemand(p,g,'county_seat',one('rewards')).fit);
assert(E.customerDemand(p,{economy:{...g.economy,rate:8}},'northside').segments[2].share>north.segments[2].share);
const closed=E.customerDemand(p,g,'northside',one('essential'));assert.equal(closed.weights.rewards,0);assert.equal(closed.weights.highYield,0);
p.productDeployment.ready={rewards:true,highYield:true};
let plan=E.chooseBot(g,0);plan.retailMix={essential:1,rewards:3,highYield:0};
const pub=E.publicState(g,0),before=JSON.stringify(g),draftBefore=JSON.stringify(plan),forecast=E.operatingPreview(pub.me,plan,g.economy);
assert.equal(JSON.stringify(g),before);assert.equal(JSON.stringify(plan),draftBefore);assert(forecast.customerAcquisitionCost>0);
assert.equal(forecast.customerAcquiredDeposits,forecast.depositGrowth+forecast.depositRunoff);
assert.deepEqual(copy(pub.me.customerDemandVersion),1);assert.equal(pub.rival.customerDemandVersion,undefined);
// Actual no-event operating stage agrees with preview and posts costs only once.
const control=E.createGame({...options,seed:'preview-control'}),pc=control.players[0],pl=E.chooseBot(control,0);
const publicControl=E.publicState(control,0),f=E.operatingPreview(publicControl.me,pl,control.economy);
assert.equal(f.profit,Math.round(f.depositIncome+f.loanIncome+f.commercialIncome+f.otherIncome-f.fundingCost-f.expense+f.eventAdjustment-f.chargeoff));
// Closed outside franchise produces no organic demand or onboarding charge.
const empty=copy(publicControl.me);for(const m of Object.values(empty.marketSnapshot.markets)){m.community.deposits=0;m.union.deposits=0}
const none=E.operatingPreview(empty,pl,control.economy);assert.equal(none.customerAcquisitionCost,0);assert.equal(none.depositGrowth+none.depositRunoff,0);
// Feature-off old campaign is mechanically identical, not silently migrated.
const a=Old.createGame({...options,customerDemandVersion:0}),b=E.createGame({...options,customerDemandVersion:0});
for(let t=0;t<12;t++){
 const x=[Old.chooseBot(a,0),Old.chooseBot(a,1)],y=[E.chooseBot(b,0),E.chooseBot(b,1)];assert.deepEqual(copy(x),copy(y));
 for(let i=0;i<2;i++){Old.submit(a,i,x[i]);E.submit(b,i,y[i])}assert.deepEqual(copy(a),copy(b));
}
const oldImported=C.migrate(a);assert.equal(oldImported.customerDemandVersion,undefined);
const sealed=fresh();E.submit(sealed,0,E.chooseBot(sealed,0));const next=E.chooseBot(sealed,1),loaded=C.migrate(sealed);
E.submit(sealed,1,copy(next));E.submit(loaded,1,copy(next));
const normal=x=>{const y=copy(x);delete y.ledgerVersion;y.players.forEach(p=>delete p.strategy);return y};
assert.deepEqual(normal(sealed),normal(loaded));
for(const damage of [x=>x.customerDemandVersion=3,x=>delete x.customerDemandVersion,x=>x.version='8.2',x=>x.players[0].customerDemandVersion=0,x=>x.players[0]._customerIntake={},x=>x.players[0].operatingReport.customerAcquiredDeposits++]){const x=copy(sealed);damage(x);assert.throws(()=>E.validatePilot(x))}
const runs=[];
for(const scenario of Object.keys(E.SCENARIOS)){
 const game=E.createGame({...options,scenario,seed:'customer-long-'+scenario});let t=0;
 for(;t<120&&!game.gameOver;t++){
  const plans=[E.chooseBot(game,0),E.chooseBot(game,1)];E.submit(game,0,plans[0]);E.submit(game,1,plans[1]);E.validatePilot(game);E.validateLedger(game);
  for(const bank of game.players){E.AccountingPrototype.check(bank.accounting);assert.equal(bank.stats.capital,bank.accounting.accounts.equity);
   assert.equal(bank.depositBook.cohorts.reduce((n,c)=>n+c.principal,0),bank.stats.deposits);
   assert.equal(Object.values(bank.marketBook.markets).reduce((n,m)=>n+m.deposits,0),bank.stats.deposits);
   assert.equal(bank.operatingReport.customerAcquiredDeposits,bank.operatingReport.depositGrowth+bank.operatingReport.depositRunoff);
  }
  assert(Buffer.byteLength(JSON.stringify(E.publicState(game,0)))<1048576);
 }
 runs.push({scenario,turns:t,ended:game.gameOver});
}
const rem=fresh();rem.gameOver=true;E.rematch(rem,0);E.rematch(rem,1);assert.equal(rem.customerDemandVersion,1);assert.equal(rem.version,'8.3');
assert.match(source,/CUSTOMER NEEDS & PRODUCT FIT/);
console.log(JSON.stringify({passed:true,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),runs,checks:['authored prospect differences','macro sensitivity','closed offers','non-mutating preview','exact acquisition cost reconciliation','finite empty supply','old campaign exact continuation','half-sealed import','old importer rejection','Continue version','corrupt state rejection','rematch','120-turn accounting and payload gates']},null,2));
