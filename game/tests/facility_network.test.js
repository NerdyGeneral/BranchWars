'use strict';
// Domain foundation gate only. The coordinator, source manifest and playable
// Group-4 campaign integration are deliberately separate acceptance work.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x));
const domain=fs.readFileSync(path.join(root,'src/engine/facility-network.js'),'utf8');
const html=fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8');
let script=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
// Expose the new standalone domain alongside the real unchanged pricing and
// regional metrics; no function bodies or compatibility fixtures are rewritten.
if(!script.includes('const FacilityNetwork ='))script=script.replace('root.BWEngine={',domain+'\nroot.BWEngine={');
script=script.replace('root.BWEngine={','root.BWEngine={FacilityNetwork,');
const context={console};vm.runInNewContext(script,context);const E=context.BWEngine,F=E.FacilityNetwork;
const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:3}).options;
const fresh=()=>E.createGame({...options,mode:'hotseat',seed:'identified-facilities',created:1});
const project={retail:'branch',commercial:'branchCommercial',digital:'branchDigital'};
function rawOfficeMetrics(p,o){
 const q=copy(p);delete q.facilityNetwork;
 q.branches=Object.fromEntries(Object.keys(q.branches).map(k=>[k,k===o.market?1:0]));
 q.facilityMarkets=Object.fromEntries(Object.keys(q.branches).map(k=>[k,k===o.market?[o.model]:[]]));
 q.facilities=Object.fromEntries(F.MODELS.map(m=>[m,m===o.model?1:0]));
 const row=E.regionalBranchMetrics(q).rows.find(r=>r.key===o.market);
 return {expense:row.expense,depositCapacity:row.depositCapacity,loanCapacity:row.loanCapacity,serviceCapacity:1};
}
function fixtureContext(p,cycle=1,extra={}){
 return {cycle,freeCash:p.stats.cash,freeExecution:4,occupiedMarkets:[],
  newOfficeCost:(owner,market,model)=>E.projectCost({...owner,focus:market},E.PROJECTS[project[model]]),
  officeMetrics:rawOfficeMetrics,
  payCost(owner,amount){
   owner.accounting=E.AccountingPrototype.post(owner.accounting,'test.facilityConversion',{cash:-amount,equity:-amount},-amount);
   owner.stats.cash=owner.accounting.accounts.cash;owner.stats.capital=owner.accounting.accounts.equity;owner.buildSpend+=amount;
  },...extra};
}
let checks=0;
const legacy=fresh(),legacyBefore=JSON.stringify(legacy);F.initialize(legacy,false);assert.equal(JSON.stringify(legacy),legacyBefore);
for(const p of legacy.players){F.validate(p,1,false);assert.equal(F.policy(p,{},{}),null);assert.throws(()=>F.policy(p,{facilityPolicy:{convert:null,cancel:null}},{}));}checks++;
const inconsistent=fresh();inconsistent.players[1].facilityMarkets[inconsistent.players[1].focus]=[];
const inconsistentBefore=JSON.stringify(inconsistent);assert.throws(()=>F.initialize(inconsistent,true));
assert.equal(JSON.stringify(inconsistent),inconsistentBefore,'Failed creation partially initialized the other bank');checks++;
const g=fresh(),opening=g.players.map(p=>({stats:copy(p.stats),branches:copy(p.branches),facilities:copy(p.facilities)}));
F.initialize(g,true);
for(const [i,p]of g.players.entries()){
 F.validate(p,1,true);assert.deepEqual(copy(p.stats),opening[i].stats);
 assert.deepEqual(copy(p.branches),opening[i].branches);assert.deepEqual(copy(p.facilities),opening[i].facilities);
 assert.equal(p.facilityNetwork.offices.length,Object.values(p.branches).reduce((a,b)=>a+b,0));
}checks++;
const p=g.players[0],o=p.facilityNetwork.offices[0],id=o.id,market=o.market;
const obligationFields=['marketBook','depositBook','creditBook','serviceContracts','regionalOperations','agency'];
const obligations=Object.fromEntries(obligationFields.map(k=>[k,copy(p[k]??null)]));
const order={officeId:id,model:'digital'},q=F.quote(p,order,fixtureContext(p));
assert(q.eligible);assert.equal(q.cost,Math.round(E.projectCost({...p,focus:market},E.PROJECTS.branchDigital)*.35));
assert.equal(q.during.expense,q.before.expense);assert.equal(q.during.depositCapacity,q.before.depositCapacity*.5);
assert.equal(q.during.loanCapacity,q.before.loanCapacity*.5);assert.equal(q.during.serviceCapacity,.5);checks++;
for(const extra of [{freeCash:q.cost-1},{freeExecution:.99},{occupiedMarkets:[market]},{restriction:'Capital recovery restriction.'}])
 assert.equal(F.quote(p,order,fixtureContext(p,1,extra)).eligible,false);
for(const bad of [{officeId:id,model:'retail'},{officeId:'absent',model:'digital'},{officeId:id,model:'wealth'},{officeId:id,model:'digital',extra:true}])
 assert.equal(F.quote(p,bad,fixtureContext(p)).eligible,false);checks++;
const before=JSON.stringify(p),badPlan={facilityPolicy:{convert:order,cancel:null}};
assert.throws(()=>F.prepare(p,badPlan,fixtureContext(p,1,{payCost(){throw Error('Posting refused');}})),/Posting refused/);
assert.equal(JSON.stringify(p),before,'Failed accounting changed conversion state');
const cash=p.stats.cash,capital=p.stats.capital;
assert.equal(F.prepare(p,badPlan,fixtureContext(p)).length,1);assert.equal(F.prepare(p,badPlan,fixtureContext(p)).length,0);
assert.equal(p.stats.cash,cash-q.cost);assert.equal(p.stats.capital,capital-q.cost);assert.equal(F.committedCapacity(p),1);
F.validate(p,1,true);assert.equal(F.quote(p,order,fixtureContext(p)).eligible,false);checks++;
const raw=E.regionalBranchMetrics(p),adjusted=F.adjustRegionalMetrics(p,raw,rawOfficeMetrics);
assert.equal(adjusted.expense,raw.expense);assert.equal(adjusted.depositCapacity,raw.depositCapacity-Math.round(q.before.depositCapacity*.5));
assert.equal(adjusted.depositCapacity,100000+adjusted.rows.reduce((n,r)=>n+r.depositCapacity,0));
assert.equal(F.effectiveCounts(p,market).retail,.5);checks++;
assert.equal(F.advance(p,{cycle:1,freeExecution:0,workRate:1}).events[0].type,'facility.conversion.stalled');
assert.equal(o.conversion.work,0);assert.equal(F.advance(p,{cycle:1,freeExecution:4,workRate:1}).events.length,0);
assert.equal(F.advance(p,{cycle:2,freeExecution:1,workRate:1}).usedCapacity,1);assert.equal(o.conversion.work,1);
F.activate(p,2);assert.equal(o.model,'retail');F.validate(p,2,true);
F.advance(p,{cycle:3,freeExecution:1,workRate:1});assert.equal(o.conversion.readyCycle,4);
F.activate(p,3);assert.equal(o.model,'retail','Completed work must not retroactively alter current-month model');
assert.equal(F.effectiveCounts(p,market).retail,.5);F.validate(p,3,true);
const resumed=copy(p);F.validate(resumed,3,true);assert.deepEqual(copy(resumed),copy(p));
assert.equal(F.activate(p,4).length,1);F.activate(resumed,4);
assert.equal(F.activate(p,4).length,0);assert.deepEqual(copy(resumed),copy(p));
assert.equal(o.id,id);assert.equal(o.model,'digital');assert.equal(o.conversions,1);assert.equal(o.conversion,null);
assert.equal(p.facilityMarkets[market][0],'digital');assert.equal(F.committedCapacity(p),0);
for(const key of obligationFields)assert.deepEqual(copy(p[key]??null),obligations[key],'Conversion rewrote '+key);
F.validate(p,4,true);checks++;
// Selected office, not whichever office was appended last. New/open/closed IDs
// remain stable through conversion; closed tombstones prevent ID reuse.
const added=F.open(p,market,'commercial',4);assert.notEqual(added.id,id);
const secondQuote=F.quote(p,{officeId:id,model:'commercial'},fixtureContext(p,5));
F.prepare(p,{facilityPolicy:{convert:{officeId:id,model:'commercial'},cancel:null}},fixtureContext(p,5));
assert.equal(F.quote(p,{officeId:added.id,model:'retail'},fixtureContext(p,5)).eligible,false);
const paid=p.stats.cash;F.prepare(p,{facilityPolicy:{convert:null,cancel:id}},fixtureContext(p,6));
assert.equal(p.stats.cash,paid,'Cancellation refunded committed costs');assert.equal(o.model,'digital');
assert(secondQuote.cost>0);F.close(p,id,6);assert.equal(o.closedCycle,6);assert.equal(p.facilityMarkets[market][0],'commercial');
assert.equal(F.lastOffice(p,market).id,added.id);F.validate(p,6,true);checks++;
const next=F.open(p,market,'retail',6);assert.notEqual(next.id,id);assert.notEqual(next.id,added.id);
F.prepare(p,{facilityPolicy:{convert:{officeId:next.id,model:'digital'},cancel:null}},fixtureContext(p,7));
const closing=F.close(p,next.id,7);assert(closing.abandoned);assert.equal(closing.refund,0);F.validate(p,7,true);checks++;
for(const damage of [
 x=>delete x.facilityNetwork,x=>x.facilityNetwork.version=2,x=>x.facilityNetwork.offices[0].id='another-bank:office:1',
 x=>x.facilityNetwork.offices.push(copy(x.facilityNetwork.offices[0])),x=>x.facilityNetwork.offices[0].extra=1,
 x=>x.facilityNetwork.nextId=1,x=>x.facilities.retail++,x=>x.branches[market]++,
 x=>x.facilityNetwork.offices[1].closedCycle=99,x=>x.facilityNetwork.lastAdvancedCycle=100
]){
 const bad=copy(p);damage(bad);const unchanged=JSON.stringify(bad);assert.throws(()=>F.validate(bad,7,true));
 assert.equal(JSON.stringify(bad),unchanged,'Validation silently repaired invalid identities');checks++;
}
const decisionsBefore=JSON.stringify(p);
const recommendation=F.choose(p,fixtureContext(p,8,{score:x=>x.after.expense<x.before.expense?x.before.expense-x.after.expense:0}));
assert.equal(recommendation.convert.officeId,added.id);assert.equal(recommendation.convert.model,'digital');
assert.equal(JSON.stringify(p),decisionsBefore,'AI quote changed facility state');
assert.deepEqual(copy(F.choose(p,fixtureContext(p,8,{score:()=>-1}))),{convert:null,cancel:null});checks++;
const view={cycle:7,me:copy(p),rival:copy(g.players[1]),lastPlans:{[g.players[1].id]:{facilityPolicy:{convert:order,cancel:null}}}};
F.project(g,view,0,true);F.validateView(view,true);assert.equal(view.rival.facilityNetwork,undefined);
assert.equal(view.lastPlans[g.players[1].id].facilityPolicy,undefined);
const leak=copy(view);leak.rival.facilityNetwork=copy(p.facilityNetwork);assert.throws(()=>F.validateView(leak,true));checks++;
console.log(JSON.stringify({passed:true,checks,scope:'Standalone identified facility/conversion domain using actual bank pricing, accounting and regional metrics; Group4 coordinator/UI/network integration remains required.'}));
