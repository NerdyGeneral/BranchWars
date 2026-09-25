'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm');
const html=require('../tools/build_game').assemble().html,ctx={console},copy=x=>JSON.parse(JSON.stringify(x));
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={',
 'root.BWEngine={withCorporateForecast,planFacilityNetwork,normalizeFacilityPlan,'),ctx);
const E=ctx.BWEngine,options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:4}).options;
function fresh(version=4){return E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:version}).options,mode:'hotseat',seed:'facility-ai-conflict',created:1});}
function clean(g,i){const plan=E.chooseBot(g,i);Object.assign(plan,{newProjects:[],newProject:null,investments:{},hires:0,competitiveAction:'none',contractBid:null,opportunity:null});
 for(const role of Object.keys(plan.specialistHires))plan.specialistHires[role]=0;
 plan.facilityPolicy={convert:null,cancel:null};plan.groupPolicy.bankDividend=0;plan.groupPolicy.bankSupport=0;return plan;}
let checks=0,months=0;const g=fresh(),opening=g.players.map((p,i)=>clean(g,i));
opening[0].facilityPolicy.convert={officeId:g.players[0].facilityNetwork.offices[0].id,model:'digital'};
E.submit(g,0,opening[0]);E.submit(g,1,opening[1]);E.validatePilot(g);E.validateLedger(g);months++;
const p=g.players[0];assert.equal(E.FacilityNetwork.pending(p).length,1);checks++;
const proposed=clean(g,0);proposed.focus=p.facilityNetwork.offices[0].market;
proposed.allocation={service:2,business:1,lending:1,operations:4};
proposed.newProjects=['branchService'];proposed.newProject='branchService';
assert.throws(()=>E.normalizeFacilityPlan(g,p,copy(proposed)),/one office construction/);checks++;
proposed.newProjects.push('remediation');
const before=JSON.stringify(p),repaired=E.withCorporateForecast(g,()=>E.planFacilityNetwork(g,0,copy(proposed)));
assert.deepEqual(copy(repaired.newProjects),['remediation']);assert.equal(repaired.newProject,'remediation');
assert.equal(JSON.stringify(p),before);assert.equal(repaired.focus,proposed.focus);
assert.deepEqual(copy(repaired.allocation),copy(proposed.allocation));
assert.deepEqual(copy(repaired.workforcePolicy),copy(proposed.workforcePolicy));
assert.doesNotThrow(()=>E.normalizeFacilityPlan(g,p,repaired));checks++;
// Submit the reconciled AI proposal through the ordinary strict path.
const other=clean(g,1);E.submit(g,0,repaired);E.submit(g,1,other);E.validatePilot(g);E.validateLedger(g);months++;checks++;
// Independently proposed local projects retain stable first-choice priority.
const h=fresh(),plan=clean(h,0);plan.newProjects=['branchService','remediation','branchAutomation'];plan.newProject='branchService';
const selected=E.planFacilityNetwork(h,0,plan);
assert.deepEqual(copy(selected.newProjects),['branchService','remediation']);assert.equal(selected.newProject,'branchService');checks++;
// Old Group1/2/3 planner inputs and identities remain untouched.
for(const version of [1,2,3]){const old=fresh(version),input={newProjects:['branchService','branchAutomation'],focus:old.players[0].focus},serialized=JSON.stringify(input);
 assert.equal(E.planFacilityNetwork(old,0,input),input);assert.equal(JSON.stringify(input),serialized);checks++;}
console.log(JSON.stringify({suite:'facility-ai-conflicts',checks,months,source:'actual assembled engine',note:'Bounded pending-conversion regression; not a rerun of the original 214-month seed.'}));
