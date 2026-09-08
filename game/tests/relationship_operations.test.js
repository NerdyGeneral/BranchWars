'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'),copy=x=>JSON.parse(JSON.stringify(x));
function engine(h){const c={console,Math,Date};vm.runInNewContext(h.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine}
function client(h,E){const c={E,console};vm.runInNewContext(h.slice(h.indexOf('function repairGame'),h.indexOf('function saveLocal'))+';globalThis.migrate=migrateGame;',c);return c}
for(const s of source.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(s[1]);
const E=engine(source),C=client(source,E),oldSource=fs.readFileSync(path.join(root,'reports/reference-builds/BRANCH_WARS_institution_c1c10b4.html'),'utf8'),Old=engine(oldSource),OldClient=client(oldSource,Old);
const options={managementVersion:2,campaignRulesVersion:1,mode:'hotseat',seed:'relationship-test',created:1};
const fresh=()=>E.createGame(options),g=fresh(),p=g.players[0],c=g.serviceAgreements[0];
assert.equal(g.version,'8.2');assert.throws(()=>OldClient.migrate(copy(g)),/supported/,'older client refuses new save at import');
let hidden=true;const resumeUI={savedGame:()=>g,$:()=>({classList:{toggle:(_,value)=>hidden=value}})};
vm.runInNewContext(source.match(/^function updateContinue\(\).*$/m)[0]+';updateContinue()',resumeUI);assert.equal(hidden,false,'new saved campaign exposes Continue after reload');
const original=Old.createGame({...options,managementVersion:1}),upgraded=C.migrate(original);
assert.equal(upgraded.version,'8.2');assert.equal(upgraded.managementVersion,1);assert(!upgraded.relationshipRecords,'old mechanics are not silently upgraded');
assert.equal(original.version,'8.1','migration does not mutate old saved object');
c.owner=p.id;c.due=6;p.serviceContracts=[c.id];p.serviceDesk.contracts=[{id:c.id,kind:c.kind,fee:c.fee,due:c.due,misses:0}];g.relationshipRecords[c.id].owner=p.id;
function plan(game,seat,staff=1){const pl=E.chooseBot(game,seat),bank=game.players[seat];return {...pl,allocation:{service:2,business:4,lending:1,operations:1},newProjects:[],newProject:null,hires:0,investments:{},capitalAction:false,competitiveAction:'none',opportunity:null,contractBid:null,contractExit:null,decision:'b',servicePolicy:{...copy(bank.serviceDesk.policy),staff:seat===0?staff:0,outsourcing:0}}}
for(let t=0;t<4;t++){E.submit(g,0,plan(g,0));E.submit(g,1,plan(g,1));E.validatePilot(g);assert.equal(g.relationshipRecords[c.id].streak,t+1)}
assert.equal(E.relationshipBonus(g,p,c),1);assert.equal(E.relationshipBonus(g,g.players[1],c),0);
const first=copy(g);E.submit(g,0,plan(g,0,0));E.submit(g,1,plan(g,1));E.validatePilot(g);assert.equal(g.relationshipRecords[c.id].streak,0,'missed delivery resets earned advantage');assert.equal(g.relationshipRecords[c.id].history.at(-1).served,false);
for(const damage of [
 x=>delete x.relationshipRecords,x=>x.relationshipRecords[c.id].streak=8,
 x=>x.relationshipRecords[c.id].history[0].fee=1,x=>x.relationshipRecords[c.id].history[0].from='fake',
 x=>x.relationshipRecords[c.id].history[1].cycle=90,x=>x.relationshipRecords[c.id].history.pop(),
 x=>x.relationshipRecords[c.id].history[0].extra=1,x=>x.managementVersion=1,x=>x.version='8.1'
]){const bad=copy(g);damage(bad);assert.throws(()=>E.validatePilot(bad))}
const view=E.publicState(g,0),pl=plan(g,0),before=JSON.stringify(g),intent=JSON.stringify(pl);
const score=E.departmentScorecard(view.me,pl,g.economy),forecast=E.operatingPreview(view.me,pl,g.economy);
assert.equal(score.bankProfit,forecast.profit-(forecast.fundingLoss||0));assert.equal(score.service.net,score.service.fees-score.service.direct-score.service.vendors-score.service.platforms);
assert.equal(score.execution.load,E.planBudget(view.me,pl).load);assert.equal(JSON.stringify(g),before);assert.equal(JSON.stringify(pl),intent);
const q=fresh(),qp=q.players[0],qc=q.serviceAgreements[0];qc.owner=qp.id;qp.serviceContracts=[qc.id];qp.serviceDesk.contracts=[{id:qc.id,kind:qc.kind,fee:qc.fee,due:qc.due,misses:0}];q.relationshipRecords[qc.id].owner=qp.id;
qp.stats.reputation=0;const quote=plan(q,0);quote.allocation={service:5,business:1,lending:1,operations:1};quote.servicePolicy.staff=1;
const snapshot=JSON.stringify(q),quoted=E.renewalPricingPlan(q,qp,quote);
assert.equal(quoted.plan.servicePolicy.pricing.payroll,'discount','weaker relationship offer trades fees for strength');assert.equal(JSON.stringify(q),snapshot);assert.equal(qc.fee,18000,'repricing never rewrites signed fee');
qp.stats.reputation=100;qp.capability.commercial=E.CAPABILITY_TIERS.commercial[3];quote.allocation={service:0,business:8,lending:0,operations:0};
assert.equal(E.renewalPricingPlan(q,qp,quote).plan.servicePolicy.pricing.payroll,'premium','strong offer can seek more income rather than always discount');
const a=copy(first),b=C.migrate(first),intents=[plan(a,0),plan(a,1)];b.rng=copy(a.rng);
// Import stamps ledgerVersion=1; compare the unchanged ledger and financial state.
const normal=x=>{const y=copy(x);delete y.ledgerVersion;y.players.forEach(p=>delete p.strategy);return y};
E.submit(a,0,copy(intents[0]));E.submit(b,0,copy(intents[0]));const locked=C.migrate(b);
E.submit(a,1,copy(intents[1]));E.submit(locked,1,copy(intents[1]));assert.deepEqual(normal(a),normal(locked),'actual migration preserves half-sealed resolution');
const runs=[];
for(const scenario of Object.keys(E.SCENARIOS)){
 const game=E.createGame({...options,scenario,seed:'relationship-long-'+scenario});let t=0;
 for(;t<120&&!game.gameOver;t++){const plans=[E.chooseBot(game,0),E.chooseBot(game,1)];E.submit(game,0,plans[0]);E.submit(game,1,plans[1]);E.validatePilot(game);E.validateLedger(game);
  for(const bank of game.players){E.AccountingPrototype.check(bank.accounting);assert.equal(bank.stats.capital,bank.accounting.accounts.equity)}
  assert(Object.values(game.relationshipRecords).every(r=>r.history.length<=12));assert(Buffer.byteLength(JSON.stringify(E.publicState(game,0)))<1048576);
 }
 runs.push({scenario,turns:t,ended:game.gameOver,reason:game.endReason||null});
}
assert.match(source,/CLIENT RELATIONSHIPS/);assert.match(source,/DEPARTMENT WORKLOAD/);assert.match(source,/m.relationshipSupported!==1/);
console.log(JSON.stringify({passed:true,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),runs,checks:['old-build save refusal','old-mechanics retention','non-mutating import','earned service streak','miss reset','corrupt histories','reconciled scorecard','adaptive bounded quotes','locked fee preservation','half-sealed import','bounded history']},null,2));
