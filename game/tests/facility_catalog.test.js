'use strict';
// Candidate DOMAIN source, not the portable's older bundled implementation.
// --integrated additionally exercises the current assembled campaign adapters.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const sha=value=>require('node:crypto').createHash('sha256').update(value).digest('hex');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x)),ctx={console},dom={console};
const html=fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8');
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const domainSource=fs.readFileSync(path.join(root,'src/engine/facility-network.js'),'utf8');
vm.runInNewContext(domainSource+'\nthis.F=FacilityNetwork;',dom);
const E=ctx.BWEngine,F=dom.F,old=E.FacilityNetwork,same=(a,b)=>assert.deepEqual(copy(a),copy(b));let checks=0;
let integratedCandidateSha256=null;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function fresh(version=4){
 const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:3}).options;
 const g=E.createGame({...options,mode:'hotseat',scenario:'balanced',seed:'facility-catalog',created:1});
 // Explicit domain boundary fixture; no campaign migration or automatic upgrade.
 g.financialGroupVersion=version;F.initialize(g,true);return g;
}
const prices={atm:150000,wealth:800000,financialCenter:1400000,regionalHub:1850000},keys={retail:'branch',commercial:'branchCommercial',digital:'branchDigital'};
function context(p,cycle=1){return {cycle,freeCash:p.stats.cash,freeExecution:5,
 newOfficeCost:(bank,market,model)=>E.projectCost({...bank,focus:market},keys[model]?E.PROJECTS[keys[model]]:{cost:prices[model],kind:'branch'}),
 officeMetrics:(bank,office)=>({expense:office.model==='atm'?4500:22000,depositCapacity:200000,loanCapacity:100000,serviceCapacity:1,advisoryCapacity:0}),
 payCost(bank,cost){bank.accounting=E.AccountingPrototype.post(bank.accounting,'fixture.facilityConversion',{cash:-cost,equity:-cost},-cost);
 bank.stats.cash=bank.accounting.accounts.cash;bank.stats.capital=bank.accounting.accounts.equity;}};}
test('Version1 source preserves exact old three-model state and conversion lifecycle',()=>{
 const a=fresh(),b=copy(a),pa=a.players[0],pb=b.players[0],id=pa.facilityNetwork.offices[0].id;
 same(F.MODELS,old.MODELS);same(F.models(pa),old.MODELS);F.validate(pa,1,true);old.validate(pb,1,true);
 const plan={facilityPolicy:{convert:{officeId:id,model:'digital'},cancel:null}};
 same(F.quote(pa,plan.facilityPolicy.convert,context(pa)),old.quote(pb,plan.facilityPolicy.convert,context(pb)));
 same(F.prepare(pa,plan,context(pa)),old.prepare(pb,plan,context(pb)));same(pa,pb);
 for(let cycle=1;cycle<=3;cycle++){
  same(F.advance(pa,{cycle,freeExecution:5,workRate:1}),old.advance(pb,{cycle,freeExecution:5,workRate:1}));
  same(F.activate(pa,cycle+1),old.activate(pb,cycle+1));same(pa,pb);
 }
 assert.throws(()=>F.open(pa,pa.focus,'atm',4));assert.equal(Object.keys(pa.facilities).length,3);
});
test('Only explicit Group5 domain initialization gains seven-model mirror schema, never more opening offices or money',()=>{
 const g=fresh(5),p=g.players[0];assert.equal(p.facilityNetwork.version,2);assert.equal(F.models(p).length,7);
 assert.equal(p.facilityNetwork.offices.length,1);assert.equal(p.facilities.atm,0);assert.equal(p.facilities.wealth,0);
 assert.equal(p.stats.cash,E.OPENING_STATS.cash);F.validate(p,1,true);
 const before=JSON.stringify(g);assert.throws(()=>F.initialize(g,true));assert.equal(JSON.stringify(g),before);
});
test('Every wider model retains stable identity, mirrors and tombstones on domain open/close',()=>{
 const p=fresh(5).players[0],before=copy(p.accounting),ids=[];
 // Domain opening deliberately does not charge; only the paid coordinator may
 // call it in a campaign. These catalog identity fixtures are not build proof.
 for(const model of Object.keys(prices)){const o=F.open(p,p.focus,model,1);ids.push(o.id);assert.equal(p.facilities[model],1);F.validate(p,1,true);}
 assert.equal(new Set(ids).size,4);same(p.accounting,before);
 for(const id of ids){F.close(p,id,1);assert.equal(F.office(p,id).closedCycle,1);F.validate(p,1,true);}
 for(const model of Object.keys(prices))assert.equal(p.facilities[model],0);
 assert(!ids.includes(F.open(p,p.focus,'atm',1).id));
});
test('Wider-model conversion costs actual branch pricing, pays once and activates next month',()=>{
 const p=fresh(5).players[0],id=p.facilityNetwork.offices[0].id,c=context(p),plan={facilityPolicy:{convert:{officeId:id,model:'atm'},cancel:null}};
 const q=F.quote(p,plan.facilityPolicy.convert,c),before=p.stats.cash;assert(q.eligible,q.reason);
 assert.equal(q.cost,Math.round(E.projectCost({...p,focus:p.focus},{kind:'branch',cost:prices.atm})*.35));
 F.prepare(p,plan,c);F.prepare(p,plan,c);assert.equal(p.stats.cash,before-q.cost);
 F.advance(p,{cycle:1,freeExecution:1,workRate:2});assert.equal(F.office(p,id).model,'retail');
 F.activate(p,2);assert.equal(F.office(p,id).model,'atm');assert.equal(p.facilities.atm,1);assert.equal(p.facilities.retail,0);F.validate(p,2,true);
});
test('Wealth conversion cannot treat an agency or arbitrary flag as a license',()=>{
 const p=fresh(5).players[0],id=p.facilityNetwork.offices[0].id;p.wealthLicensed=true;
 const result=F.quote(p,{officeId:id,model:'wealth'},context(p));assert.equal(result.eligible,false);assert.match(result.reason,/licensed/i);
});
test('Version2 rejects mixed-schema, unknown-model and malformed state without repairing it',()=>{
 const source=fresh(5).players[0];
 for(const mutate of [p=>{delete p.facilities.atm;},p=>{p.facilityNetwork.version=3;},p=>{p.facilityNetwork.offices[0].model='casino';},p=>{p.facilityNetwork.version=1;}]){
  const p=copy(source);mutate(p);const before=JSON.stringify(p);assert.throws(()=>F.validate(p,1,true));assert.equal(JSON.stringify(p),before);
 }
});
if(process.argv.includes('--integrated')){
 const current={console},assembled=require('../tools/build_game').assemble().html;
 integratedCandidateSha256=sha(assembled);
 vm.runInNewContext(assembled.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],current);const A=current.BWEngine;
 test('Real current creation/catalog blocks wider facilities in old campaigns and wealth until licensed',()=>{
  for(const version of [1,2,3,4,5,6]){
   const options=A.previewFeatureSelection({}, {field:'financialGroupVersion',value:version}).options;
   const g=A.createGame({...options,mode:'hotseat',seed:'catalog-live:'+version,created:1}),p=g.players[0],catalog=A.projectCatalog(p);
   if(version<5){for(const key of ['branchAtm','branchWealth','branchFinancialCenter','branchRegionalHub'])assert.equal(catalog[key],undefined);}
   else{assert.equal(g.version,version===5?'9.4':'9.5');assert.equal(p.facilityNetwork.version,2);assert(catalog.branchAtm&&!catalog.branchAtm.barred);assert.match(catalog.branchWealth.barred,/licensed/i);}
  }
 });
 for(const version of [5,6])test('Real paid ATM construction and closure run through Group'+version+' monthly settlement, identity metadata and save/resume',()=>{
  const options=A.previewFeatureSelection({}, {field:'financialGroupVersion',value:version}).options;
  let g=A.createGame({...options,mode:'hotseat',scenario:'balanced',seed:'catalog-paid-construction',created:1});
  const quiet=index=>{
   const p=g.players[index],q=A.chooseBot(g,index);
   q.newProject=null;q.newProjects=[];q.investments={};q.hires=0;q.specialistHires=A.emptySpecialistOrders();q.competitiveAction='none';
   q.facilityPolicy=A.defaultFacilityPolicy();Object.assign(q,A.defaultDepartmentPlan(p));q.agencyPolicy=A.defaultAgencyPlan(p);
   q.groupPolicy.bankSupport=0;q.groupPolicy.bankDividend=0;q.facilityLifecyclePolicy=A.defaultFacilityLifecyclePlan(p);
   if(p.departmentFunctions)q.departmentFunctionsPolicy=A.defaultDepartmentFunctionsPolicy(p);
   return q;
  };
  const plans=[quiet(0),quiet(1)],before=g.players[0].buildSpend;
  plans[0].focus='industrial';plans[0].newProject='branchAtm';plans[0].newProjects=['branchAtm'];
  // Explicit player proposal after editing the monthly departmental plan. A
  // persistent office assignment must not silently follow changed staff pools.
  plans.forEach((q,i)=>{q.facilityLifecyclePolicy=A.facilityLifecycleStaffProposal(g,g.players[i],q).policy;});
  const cost=A.planBudget(g.players[0],plans[0]).projects;assert(cost>0);
  A.submit(g,0,plans[0]);A.submit(g,1,plans[1]);assert.equal(g.cycle,2);
  let p=g.players[0];assert.equal(p.buildSpend-before,cost);
  const office=p.facilityNetwork.offices.find(o=>o.model==='atm'&&o.market==='industrial');assert(office,'Paid ATM must actually finish');
  assert.equal(p.facilities.atm,1);assert(p.facilityLifecycle.records[office.id]);assert.equal(p.facilityLifecycle.records[office.id].initialRampMonths,0);
  A.FacilityNetwork.validate(p,g.cycle,true);g=A.migrateCampaign(copy(g));p=g.players[0];assert.equal(p.facilities.atm,1);
  const closing=[quiet(0),quiet(1)];closing[0].focus='industrial';closing[0].newProject='branchClose';closing[0].newProjects=['branchClose'];
  closing.forEach((q,i)=>{q.facilityLifecyclePolicy=A.facilityLifecycleStaffProposal(g,g.players[i],q).policy;});
  const closedCost=A.planBudget(p,closing[0]).projects,spent=p.buildSpend;
  A.submit(g,0,closing[0]);A.submit(g,1,closing[1]);p=g.players[0];assert.equal(p.buildSpend-spent,closedCost);
  assert.equal(p.facilities.atm,0);assert.equal(p.facilityNetwork.offices.find(o=>o.id===office.id).closedCycle,2);
  assert(p.facilityLifecycle.records[office.id],'Closure retains history rather than deleting identity');
  same(A.migrateCampaign(copy(g)),A.migrateCampaign(copy(A.migrateCampaign(copy(g)))));
 });
}
console.log(JSON.stringify({status:'PASS',checks,integrated:process.argv.includes('--integrated'),domainSourceSha256:sha(domainSource),integratedCandidateSha256}));
