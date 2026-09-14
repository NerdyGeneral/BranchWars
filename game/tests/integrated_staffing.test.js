'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),cp=require('node:child_process');
const {test}=require('node:test'),root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const html=process.argv.includes('--portable')?fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html;
function engine(text){const c={console};vm.runInNewContext(text.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.BWEngine={validateFacilityLifecycleView,facilityStaffAllocation,facilityLifecycleLiveContext,facilityLifecyclePlanningContext,facilityLifecycleStaff,'),c);return c.BWEngine;}
const E=engine(html),L=E.FacilityLifecycle;
const options=version=>({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:version}).options,financialGroupVersion:version});
const create=(version=9,seed='integrated-staffing',scenario='balanced')=>E.createGame({...options(version),mode:'hotseat',seed,scenario,created:1});
const initial=create();
// Domain-only fixtures isolate allocation, NOT economically earned expansion.
// Actual new campaigns and settlement are exercised separately below.
function fixture(models,version=2,business=8){
 const p=copy(initial.players[0]);delete p.facilityLifecycle;
 p.facilityNetwork.offices=models.map((model,i)=>({id:p.id+':office:'+(i+1),model,market:'downtown',openedCycle:1,closedCycle:null,conversion:null}));
 const owner=L.initialize(p,1,true,version),plan=L.defaultPlan(owner);
 const context={cycle:1,freeCash:3000000,freeExecution:8,availableStaffQuarters:{service:16,business,lending:16,operations:16,wealth:version===1?business:0},wealthLicensed:()=>true,nearby:()=>true};
 return {owner,plan,context,ids:owner.facilityNetwork.offices.map(o=>o.id)};
}
function full(f){for(const o of f.owner.facilityNetwork.offices)f.plan.offices[o.id].staffQuarters=copy(L.CATALOG[o.model].staffQuarters);return f;}
test('Preserved Group9 saves use 9.8 and lifecycle2; historical boundaries stay explicit',()=>{
 assert.equal(initial.version,'9.8');assert.equal(initial.financialGroupVersion,9);assert.equal(initial.players[0].facilityLifecycle.version,2);
 assert.equal(initial.players[0].accounting.version,4,'No unnecessary financial book conversion');
 assert.equal(create(8).version,'9.7');assert.equal(create(8).players[0].facilityLifecycle.version,1);
 assert.throws(()=>E.createGame({...options(9),financialGroupVersion:11}),/Unsupported/);
 for(const edit of [g=>g.version='9.7',g=>g.players[0].facilityLifecycle.version=1,g=>g.financialGroupVersion=8]){
  const bad=copy(initial);edit(bad);assert.throws(()=>E.validatePilot(bad));assert.throws(()=>E.migrateCampaign(bad));
 }
 const v=E.publicState(initial,0);v.me.facilityLifecycle.version=1;assert.throws(()=>E.validateFacilityLifecycleView(v),/workforce view rules/);
 const caps=E.campaignCapabilities(),rules=E.campaignRules(initial,{context:'game'});
 assert.equal(caps.financialGroupSupported,10);assert.equal(E.peerRulesIssue(rules,caps),null);
 assert(E.peerRulesIssue(rules,{...caps,financialGroupSupported:8}),'Old peers cannot start the new rules');
 assert.equal(E.peerRulesIssue(E.campaignRules(create(8),{context:'game'}),{...caps,financialGroupSupported:8}),null);
});
test('Commercial and wealth offices cannot spend the same business bankers twice',()=>{
 const legacy=full(fixture(['commercial','wealth'],1));assert.doesNotThrow(()=>L.normalize(legacy.owner,legacy.plan,legacy.context));
 const f=full(fixture(['commercial','wealth']));assert.throws(()=>L.normalize(f.owner,f.plan,f.context),/same business bankers/);
 f.plan.offices[f.ids[0]].staffQuarters.business=4;f.plan.offices[f.ids[1]].staffQuarters.wealth=4;
 assert.doesNotThrow(()=>L.normalize(f.owner,f.plan,f.context));assert.equal(L.staffTotals(f.owner,f.plan.offices).business,8);
 const before=JSON.stringify(f);L.quote(f.owner,f.plan,f.context);assert.equal(JSON.stringify(f),before,'Forecast is pure');
 const invented=copy(f.context);invented.availableStaffQuarters.wealth=8;
 assert.throws(()=>L.allocateStaff(f.owner,invented.availableStaffQuarters),/separate wealth pool/);
});
test('Counterfactual shortages scale both uses against their combined request',()=>{
 const f=full(fixture(['commercial','wealth']));for(const [id,row]of Object.entries(f.plan.offices))Object.assign(f.owner.facilityLifecycle.records[id],row);
 const measured=L.metrics(f.owner,f.context);
 assert.equal(measured.rows[0].effectiveStaffQuarters.business,4);assert.equal(measured.rows[1].effectiveStaffQuarters.wealth,4);
 assert.equal(measured.rows.reduce((n,r)=>n+r.effectiveStaffQuarters.business+r.effectiveStaffQuarters.wealth,0),8);
});
test('Proposals and released staff remain finite across every model and mixed roster',()=>{
 for(const models of [['commercial','wealth'],['wealth','commercial'],['financialCenter','wealth','commercial'],Object.keys(L.CATALOG)])for(const business of [0,1,4,8,12,16]){
  const f=fixture(models,2,business),before=JSON.stringify(f),a=E.facilityStaffAllocation(f.owner,f.plan,f.context);
  assert.equal(JSON.stringify(f),before);const used=L.staffTotals(f.owner,a.policy.offices);
  for(const role of L.ROLES)assert.equal(used[role]+a.unused[role],f.context.availableStaffQuarters[role]);
  assert.doesNotThrow(()=>L.normalize(f.owner,a.policy,f.context));
 }
 const f=fixture(['wealth','commercial']);f.context.wealthLicensed=()=>false;
 const a=E.facilityStaffAllocation(f.owner,f.plan,f.context);
 assert.equal(a.policy.offices[f.ids[0]].staffQuarters.wealth,0,'Unavailable advisory work releases actual business staff');
 assert.equal(a.policy.offices[f.ids[1]].staffQuarters.business,8);
});
test('Advisory source pool and licensing agree between live and staged owner adapters',()=>{
 const f=fixture(['wealth']);const p=f.owner;
 const live=E.facilityLifecycleLiveContext(p,1),staged=E.facilityLifecyclePlanningContext(initial,p,{}).context;
 assert.deepEqual(copy(staged.availableStaffQuarters),copy(live.availableStaffQuarters));
 assert.equal(staged.availableStaffQuarters.wealth,0);assert(live.wealthLicensed(p));assert(staged.wealthLicensed(p));
 const mandate=E.defaultDepartmentFunctionsMandate(p);p.facilityLifecycle.records[f.ids[0]].staffQuarters.wealth=4;
 assert.equal(E.defaultDepartmentFunctionsMandate(p).floorQuarters.business,mandate.floorQuarters.business+4,'Department allocation must protect assigned advisory people');
});
test('Group9 actual AI/human submission paths, resume, books and owner privacy stay coherent for 24 months',()=>{
 for(const scenario of ['balanced','rate','regulatory','growth']){
  let g=create(9,'shared-'+scenario,scenario);
  for(let month=0;month<24&&!g.gameOver;month++){
   const plans=g.players.map((p,i)=>E.chooseBot(g,i));
   for(let seat=0;seat<2;seat++){
    const a=E.facilityLifecycleStaffProposal(g,g.players[seat],plans[seat]),used=L.staffTotals(g.players[seat],a.policy.offices);
    for(const role of L.ROLES)assert.equal(used[role]+a.unused[role],a.availableStaffQuarters[role]);
   }
   E.submit(g,month%2,plans[month%2]);const resumed=E.migrateCampaign(copy(g));
   E.submit(g,1-month%2,plans[1-month%2]);E.submit(resumed,1-month%2,copy(plans[1-month%2]));
   assert.deepEqual(copy(E.migrateCampaign(g)),copy(E.migrateCampaign(resumed)));
   E.validatePilot(g);E.validateLedger(g);
   for(const seat of [0,1]){const view=E.publicState(g,seat);assert.equal(view.me.facilityLifecycle.version,2);assert.equal(view.rival.facilityLifecycle,undefined);}
  }
  assert.equal(g.cycle,25,'24 complete ordinary months: '+scenario);
 }
 const rematch=create();rematch.gameOver=true;E.rematch(rematch,0);E.rematch(rematch,1);
 assert.equal(rematch.version,'9.8');assert.equal(rematch.players[0].facilityLifecycle.version,2);E.validatePilot(rematch);
});
test('Preserved contributor Group7/8 rules replay exactly; no golden regeneration',()=>{
 const bytes=cp.execFileSync('git',['show','0159b9c:game/BRANCH_WARS.html'],{cwd:root,maxBuffer:32*1024*1024,windowsHide:true});
 assert.equal(hash(bytes),'bcb12af6d0fa9430b033c7823ef93995869004eb7e0c136d4d96b5cf05fd560c');
 const B=engine(bytes.toString('utf8'));
 for(const version of [7,8]){
  const opts={...options(version),mode:'hotseat',seed:'shared-legacy-'+version,created:1},a=B.createGame(opts),b=E.createGame(opts);
  assert.deepEqual(copy(b),copy(a));
  for(let month=0;month<12&&!a.gameOver;month++){
   const pa=a.players.map((p,i)=>B.chooseBot(a,i)),pb=b.players.map((p,i)=>E.chooseBot(b,i));
   assert.deepEqual(copy(pb),copy(pa),'Legacy AI '+version+' month '+month);assert.deepEqual(copy(b),copy(a),'Legacy RNG');
   for(const seat of [0,1]){B.submit(a,seat,pa[seat]);E.submit(b,seat,pb[seat]);assert.deepEqual(copy(b),copy(a),'Legacy settlement '+version+' month '+month);}
   for(const seat of [0,1])assert.deepEqual(copy(E.publicState(b,seat)),copy(B.publicState(a,seat)),'Legacy owner view');
  }
 }
});
