'use strict';
// Real Group4 coordinator/forecast/save regression; no source replacement or
// facility initialization bypass. Direct completion adapters are labelled below.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x));
const html=process.argv.includes('--source')?require('../tools/build_game.js').assemble().html:fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8');
const ctx={console};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);const E=ctx.BWEngine,F=E.FacilityNetwork;
const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:4}).options;
function fresh(seed='facility-integrated'){return E.createGame({...options,mode:'hotseat',scenario:'balanced',seed,created:1});}
function quiet(g,index){
 const p=g.players[index];let q;
 try{q=E.chooseBot(g,index);}catch(error){throw Error('AI planning failed at '+g.seed+' cycle '+g.cycle+' seat '+index+': '+error.message,{cause:error});}
 q.newProjects=[];q.newProject=null;q.investments={};q.hires=0;
 q.specialistHires=E.emptySpecialistOrders();q.competitiveAction='none';q.groupPolicy.bankDividend=0;q.groupPolicy.bankSupport=0;
 q.facilityPolicy=E.defaultFacilityPolicy();Object.assign(q,E.defaultDepartmentPlan(p));q.agencyPolicy=E.defaultAgencyPlan(p);
 return q;
}
function month(g,first=quiet(g,0),second=quiet(g,1)){
 const cycle=g.cycle;E.submit(g,0,first);E.submit(g,1,second);assert.equal(g.cycle,cycle+1);return g;
}
function mirrors(g){for(const p of g.players){
 F.validate(p,g.cycle,true);
 for(const market of Object.keys(p.branches)){
  const offices=p.facilityNetwork.offices.filter(o=>o.market===market&&o.closedCycle===null);
  assert.equal(p.branches[market],offices.length);assert.deepEqual(copy(p.facilityMarkets[market]),copy(offices.map(o=>o.model)));
 }
 for(const model of F.MODELS)assert.equal(p.facilities[model],p.facilityNetwork.offices.filter(o=>o.model===model&&o.closedCycle===null).length);
}}
const same=(a,b)=>assert.deepEqual(copy(a),copy(b));let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
test('Group4 creates canonical offices from actual legacy counts and strict accounting-v3',()=>{
 const g=fresh();assert.equal(g.version,'9.3');assert.equal(g.financialGroupVersion,4);mirrors(g);
 assert(g.players.every(p=>p.accounting.version===3&&p.accounting.accounts.payables===0));
 assert(g.players.every(p=>p.facilityNetwork.offices.length===Object.values(p.branches).reduce((n,v)=>n+v,0)));
 same(E.migrateCampaign(copy(E.migrateCampaign(copy(g)))),E.migrateCampaign(copy(g)));
});
test('Conversion quote, capacity and operating forecasts are pure and show disrupted production',()=>{
 const g=fresh(),p=g.players[0],q=quiet(g,0),office=p.facilityNetwork.offices[0];
 q.facilityPolicy.convert={officeId:office.id,model:'digital'};
 const before=JSON.stringify(g),quote=E.facilityInstructionQuote(g,p,q),budget=E.planBudget(p,q);
 assert(quote.status.eligible,quote.status.reason);assert(quote.quote.eligible);
 assert.equal(quote.quote.cost,Math.round(E.facilityNewOfficeCost(p,office.market,'digital')*.35));
 assert.equal(budget.facilityConversion,quote.quote.cost);
 assert.equal(quote.quote.during.expense,quote.quote.before.expense);
 assert.equal(quote.quote.during.depositCapacity,quote.quote.before.depositCapacity*.5);
 assert.equal(quote.quote.during.loanCapacity,quote.quote.before.loanCapacity*.5);
 const owner=E.publicState(g,0).me,ownerBefore=JSON.stringify(owner);
 const report=E.operatingPreview(owner,q,g.economy);same(E.operatingPreview(owner,q,g.economy),report);
 assert.equal(JSON.stringify(owner),ownerBefore);
 assert.equal(JSON.stringify(g),before,'Forecast mutated canonical campaign');
 const control=copy(q);control.facilityPolicy=E.defaultFacilityPolicy();
 assert(E.planBudget(p,control).freeCapacity>=budget.freeCapacity+1);
 const conflict=copy(q);conflict.focus=office.market;conflict.newProjects=['branchService'];conflict.newProject='branchService';
 assert.equal(E.facilityInstructionQuote(g,p,conflict).status.eligible,false,'Same-market work must not bypass conversion occupation');
});
test('Human conversion charges once, survives half-ready resume and activates only after work',()=>{
 let g=fresh(),p=g.players[0],q=quiet(g,0),r=quiet(g,1),id=p.facilityNetwork.offices[0].id;
 q.facilityPolicy.convert={officeId:id,model:'digital'};
 const cost=E.planBudget(p,q).facilityConversion,beforeSpent=p.buildSpend;
 E.submit(g,0,q);g=E.migrateCampaign(copy(g));E.submit(g,1,r);p=g.players[0];mirrors(g);
 let office=p.facilityNetwork.offices.find(o=>o.id===id);
 assert.equal(g.cycle,2);assert.equal(office.model,'retail');assert(office.conversion&&office.conversion.work>0);
 assert.equal(E.usedCapacity(p),F.committedCapacity(p)+p.projects.reduce((n,x)=>n+E.projectCapacity(E.PROJECTS[x.key]),0));
 const postings=p.accounting.journal.filter(e=>e.source==='facility.conversion');assert.equal(postings.length,1);
 assert.equal(postings[0].changes.cash,-cost);assert(p.buildSpend>=beforeSpent+cost);
 assert.equal(E.regionalBranchMetrics(p).expense,E.facilityRawOfficeMetrics(p,office).expense);
 assert.equal(E.regionalBranchMetrics(p).depositCapacity,100000+Math.round(E.facilityRawOfficeMetrics(p,office).depositCapacity*.5));
 const saved=copy(g);g=E.migrateCampaign(copy(g));same(g,E.migrateCampaign(saved));
 month(g);p=g.players[0];office=p.facilityNetwork.offices.find(o=>o.id===id);mirrors(g);
 assert.equal(office.id,id);assert.equal(office.model,'digital');assert.equal(office.conversion,null);assert.equal(office.conversions,1);
 assert.equal(p.accounting.journal.filter(e=>e.source==='facility.conversion').length,1);
 assert.equal(F.committedCapacity(p),0);
 const v=E.publicState(g,1);assert.equal(v.rival.facilityNetwork,undefined);assert.equal(v.lastPlans?.[p.id]?.facilityPolicy,undefined);
});
test('Cancellation preserves the selected office and keeps sunk conversion spending',()=>{
 const g=fresh('facility-cancel'),p=g.players[0],id=p.facilityNetwork.offices[0].id,q=quiet(g,0);
 q.facilityPolicy.convert={officeId:id,model:'digital'};month(g,q);
 const charged=copy(p.accounting.journal.filter(e=>e.source==='facility.conversion')),cancel=quiet(g,0);
 cancel.facilityPolicy={convert:null,cancel:id};assert.equal(E.planBudget(p,cancel).facilityConversion,0);
 month(g,cancel);const o=p.facilityNetwork.offices.find(x=>x.id===id);mirrors(g);
 assert.equal(o.model,'retail');assert.equal(o.conversion,null);assert.equal(o.conversions,0);
 same(p.accounting.journal.filter(e=>e.source==='facility.conversion'),charged);
 assert(!p.accounting.journal.some(e=>e.source==='facility.refund'));
});
test('Ordinary paid construction and closure maintain IDs, historical tombstones and local mirrors',()=>{
 const g=fresh('facility-build-close'),p=g.players[0],market=p.focus,original=p.facilityNetwork.offices[0].id;
 const build=quiet(g,0);build.focus=market;build.newProjects=['branchDigital'];build.newProject='branchDigital';
 const status=E.projectPlanStatus(p,build);assert(status.eligible,status.reason);
 const quoted=E.regionalProjectPreview(p,'branchDigital',market),before=JSON.stringify(g);
 assert(quoted.depositCapacity>0);assert.equal(JSON.stringify(g),before);
 month(g,build);
 for(let n=0;p.projects.some(x=>x.key==='branchDigital')&&n<8;n++)month(g);
 assert(!p.projects.some(x=>x.key==='branchDigital'));mirrors(g);
 const built=p.facilityNetwork.offices.find(o=>o.id!==original&&o.market===market&&o.closedCycle===null);
 assert(built);assert.equal(built.model,'digital');assert.equal(p.branches[market],2);
 const close=quiet(g,0);close.focus=market;close.newProjects=['branchClose'];close.newProject='branchClose';
 month(g,close);mirrors(g);
 assert.equal(built.closedCycle,g.cycle-1);assert.equal(p.branches[market],1);
 assert.equal(p.facilityNetwork.offices.find(o=>o.id===original).closedCycle,null);
 const serial=p.facilityNetwork.nextId;let again;
 for(let n=0;n<24;n++){
  again=quiet(g,0);again.focus=market;again.newProjects=['branchDigital'];again.newProject='branchDigital';
  if(E.projectPlanStatus(p,again).eligible)break;
  month(g);
 }
 assert(E.projectPlanStatus(p,again).eligible,'Rebuild must use actual retained capital, not a test cash gift');
 month(g,again);for(let n=0;p.projects.some(x=>x.key==='branchDigital')&&n<8;n++)month(g);
 mirrors(g);assert(p.facilityNetwork.nextId>serial);assert.equal(p.facilityNetwork.offices.filter(o=>o.id===built.id).length,1);
 same(E.migrateCampaign(copy(g)).players[0].facilityNetwork,p.facilityNetwork);
});
test('Paid acquisition capability and completed takeover update both banks identified-office mirrors',()=>{
 const g=fresh('facility-acquisition'),buyer=g.players[0],seller=g.players[1],target=seller.focus;
 const inherited=seller.facilityNetwork.offices.find(o=>o.market===target&&o.closedCycle===null).id;
 let prepared=null;
 for(let n=0;n<96&&!prepared;n++){
  const q=quiet(g,0);q.focus=target;
  if(E.strategyLevel(buyer,'acquisition')<3){
   q.investments={acquisition:Math.min(E.CAPABILITY_CAP_PER_CYCLE,E.capabilityNextCost(buyer,'acquisition'))};
   if(!E.projectPlanStatus(buyer,q).eligible)q.investments={};
  }else{
   q.newProjects=['acquisition'];q.newProject='acquisition';
   if(E.projectPlanStatus(buyer,q).eligible){prepared=q;break;}
   q.newProjects=[];q.newProject=null;
  }
  month(g,q);
 }
 assert(prepared,'Acquisition needs earned cash/capital and paid research; no artificial eligibility');
 assert(seller.facilityNetwork.offices.find(o=>o.id===inherited).closedCycle===null,'Seller office must still exist before takeover');
 const totalBefore=buyer.facilityNetwork.offices.filter(o=>o.closedCycle===null).length;
 month(g,prepared);
 for(let n=0;buyer.projects.some(x=>x.key==='acquisition')&&n<10;n++)month(g);
 assert(!buyer.projects.some(x=>x.key==='acquisition'));mirrors(g);
 const acquired=buyer.facilityNetwork.offices.find(o=>o.market===target&&o.closedCycle===null);
 assert(acquired);assert.equal(buyer.facilityNetwork.offices.filter(o=>o.closedCycle===null).length,totalBefore+1);
 assert.notEqual(acquired.id,inherited);assert(seller.facilityNetwork.offices.find(o=>o.id===inherited).closedCycle!==null);
 same(E.migrateCampaign(copy(g)).players.map(p=>p.facilityNetwork),g.players.map(p=>p.facilityNetwork));
});
test('Malformed identity mirrors and hidden rival instructions are rejected rather than repaired',()=>{
 const g=fresh();for(const mutate of [x=>{x.players[0].facilityMarkets[x.players[0].focus]=[];},
  x=>{x.players[0].facilityNetwork.offices[0].model='wealth';},x=>{x.players[0].facilityNetwork.nextId=0;},
  x=>{x.players[0].facilityNetwork.lastPreparedCycle=1;},x=>{x.players[0].facilityNetwork.lastAdvancedCycle=1;},
  x=>{x.players[0].facilityNetwork.lastActivatedCycle=1;},x=>{x.players[0]._facilityExecutionUsed=1;},
  x=>{x.players[0].facilityNetwork.offices[0].conversion={model:'digital',cost:1,work:0,startedCycle:2,readyCycle:null};}]){
  const bad=copy(g);mutate(bad);const before=JSON.stringify(bad);assert.throws(()=>E.migrateCampaign(bad));assert.equal(JSON.stringify(bad),before);
 }
 for(const mutate of [v=>{v.rival.facilityNetwork=copy(g.players[0].facilityNetwork);},
  v=>{v.me.facilityNetwork.lastPreparedCycle=1;},v=>{v.me.facilityNetwork.lastAdvancedCycle=1;},
  v=>{v.me.facilityNetwork.lastActivatedCycle=1;},v=>{v.me._facilityExecutionUsed=1;}]){
  const view=E.publicState(g,1);mutate(view);assert.throws(()=>E.validateFinancialGroupView(view));
 }
 const oldOptions=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:3}).options;
 const old=E.createGame({...oldOptions,seed:'unversioned-facility',created:1});
 const legacyPlan=E.chooseBot(old,0);legacyPlan.facilityPolicy=E.defaultFacilityPolicy();
 const unchanged=JSON.stringify(old);
 assert.throws(()=>E.submit(old,0,legacyPlan));assert.equal(JSON.stringify(old),unchanged);
 const bad=copy(old);bad.lastPlans={[bad.players[0].id]:{facilityPolicy:E.defaultFacilityPolicy()}};
 assert.throws(()=>E.migrateCampaign(bad),'Legacy saves cannot acquire hidden identified-office instructions');
});
console.log(JSON.stringify({passed:true,checks,scope:'Actual Group4 creation/paid monthly conversion, forecasts, construction/closure identity mirrors, save/resume and privacy; national catalogue and physical multiplayer acceptance excluded.'}));
