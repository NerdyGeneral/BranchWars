'use strict';
// Immutable Group5/save9.4 boundary for the departmental-functions expansion.
// Never regenerate the reference or normalize away a candidate-only difference.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>createHash('sha256').update(x).digest('hex');
const baselineFile='reports/reference-builds/BRANCH_WARS_facility_group5_ba759abc.html';
const baseline=fs.readFileSync(path.join(root,baselineFile),'utf8');
const baselineSha256='ba759abce19b84eb495307713a98db607746d85852fd63fe9199c8a6a931619c';
assert.equal(hash(baseline),baselineSha256,'Immutable Group5 reference changed; do not accommodate drift by updating goldens.');
const portable=process.argv.includes('--portable');
const candidate=portable?fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html;
const candidateSha256=hash(candidate);
console.log(JSON.stringify({suite:'department-group5-compat',phase:'opening',baselineSha256,candidateSha256}));
function load(html){
 const math=Object.create(Math);math.random=()=>.375;
 const context={console,Math:math,Date:class extends Date{static now(){return 123456;}}};
 vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context);
 return context.BWEngine;
}
const old=load(baseline),current=load(candidate),engines=[old,current];
const same=(a,b,label)=>assert.deepEqual(copy(a),copy(b),label);
let profiles=0,months=0,humanMonths=0,ownerViews=0,disabledProfiles=0;
function absentFunctions(g,label){
 assert.equal(g.departmentFunctionEconomy,undefined,label+' no disabled function-provider economy');
 // Earlier institutional rules already own the leadership supplier economy.
 // Preserve it byte-for-byte; do not incorrectly require its removal in4/5.
 if(g.financialGroupVersion<4)assert.equal(g.departmentEconomy,undefined,label+' no unversioned department economy');
 for(const p of g.players){
  assert.equal(p.departmentFunctions,undefined,label+' no disabled function inventory');
  assert.equal(p.departmentFunctionDelivery,undefined,label+' no disabled delivery report');
  assert.equal(p.submitted?.departmentFunctionsPolicy,undefined,label+' no disabled submitted instruction');
  assert.equal(g.lastPlans?.[p.id]?.departmentFunctionsPolicy,undefined,label+' no disabled historical instruction');
 }
}
function validate(E,g,label){E.validatePilot(g);E.validateLedger(g);absentFunctions(g,label);}
function ownerView(E,g,seat,label){
 const before=JSON.stringify(g),v=E.publicState(g,seat);E.validateFinancialGroupView(v);
 if(g.financialGroupVersion>=3)E.validateAgencyView(v);
 assert.equal(JSON.stringify(g),before,label+' public projection/validation is pure');
 for(const side of ['me','rival'])assert.equal(v[side].departmentFunctions,undefined,label+' old owner has no function book');
 for(const side of ['me','rival'])assert.equal(v[side].departmentFunctionDelivery,undefined,label+' old owner has no function delivery');
 for(const key of ['departmentFunctionEconomy','departmentEconomy','facilityEconomy','agencyEconomy'])assert.equal(v[key],undefined,label+' global books stay private');
 for(const key of ['departmentOffice','facilityNetwork','facilityLifecycle','agency'])assert.equal(v.rival[key],undefined,label+' rival operating books stay private');
 assert.equal(v.lastPlans?.[v.rival.id]?.departmentFunctionsPolicy,undefined,label+' rival function instructions stay private');
 return v;
}
function compareProfile(rules,scenario,seed,count){
 // Derive explicit historical prerequisites from the frozen build, never the
 // current checkbox default (which is allowed to advance to Group6 later).
 const options=old.previewFeatureSelection({}, {field:'financialGroupVersion',value:rules}).options;
 const config={...options,financialGroupVersion:rules,scenario,seed:'department-group5:'+seed,created:1,mode:'hotseat'};
 const games=engines.map(E=>E.createGame(config)),label=`Group${rules}/${scenario}/${seed}`;
 same(games[1],games[0],label+' exact creation');
 assert.equal(games[1].version,({1:'9.0',2:'9.1',3:'9.2',4:'9.3',5:'9.4'})[rules]);
 for(const [i,E]of engines.entries())validate(E,games[i],label);
 for(let month=0;month<count;month++){
  const plans=engines.map((E,i)=>[E.chooseBot(games[i],0),E.chooseBot(games[i],1)]);
  same(plans[1],plans[0],label+' exact AI plans');
  same(games[1],games[0],label+' exact post-planning RNG/state');
  if(month===1){
   for(const pair of plans)for(const [seat,plan]of pair.entries()){
    plan.groupPolicy.creditAllocation=seat?{mortgage:25,middleMarket:25,consumer:50}:{mortgage:50,middleMarket:25,consumer:25};
    plan.productProgramPolicy.pricingBp.essential=seat?-25:25;
   }
   humanMonths++;
  }
  for(const pair of plans)for(const plan of pair)assert.equal(plan.departmentFunctionsPolicy,undefined,label+' legacy plan has no functions policy');
  for(const seat of [0,1])same(current.projectCatalog(games[1].players[seat]),old.projectCatalog(games[0].players[seat]),label+' unchanged legacy project catalog');
  for(const [i,E]of engines.entries()){
   E.submit(games[i],0,plans[i][0]);validate(E,games[i],label);
   games[i]=E.migrateCampaign(copy(games[i]));
   same(E.migrateCampaign(copy(games[i])),games[i],label+' idempotent half-ready import');validate(E,games[i],label);
  }
  same(games[1],games[0],label+' exact half-ready save/resume');
  for(const [i,E]of engines.entries())E.submit(games[i],1,plans[i][1]);
  same(games[1],games[0],label+' exact settlement/accounts/ledger/RNG');
  for(const [i,E]of engines.entries())validate(E,games[i],label);
  for(const seat of [0,1]){
   same(ownerView(current,games[1],seat,label),ownerView(old,games[0],seat,label),label+' exact owner-private view');ownerViews++;
  }
  months++;
 }
 for(const [i,E]of engines.entries()){
  // Isolated lifecycle trigger, not a claimed natural campaign victory.
  games[i].gameOver=true;E.rematch(games[i],0);E.rematch(games[i],1);validate(E,games[i],label);
 }
 same(games[1],games[0],label+' exact rematch');assert.equal(games[1].financialGroupVersion,rules);
 profiles++;console.log('PASS '+label);
}
for(const scenario of ['balanced','rate','regulatory','growth'])for(const seed of [0,20])compareProfile(5,scenario,seed,3);
for(const rules of [1,2,3,4]){compareProfile(rules,'balanced','disabled-'+rules,1);disabledProfiles++;}
const endCandidate=portable?fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html;
console.log(JSON.stringify({suite:'department-group5-compat',phase:'closing',candidateSha256,endCandidateSha256:hash(endCandidate),profiles,months}));
assert.equal(endCandidate,candidate,'Candidate changed during exact compatibility check.');
assert.equal(hash(fs.readFileSync(path.join(root,baselineFile),'utf8')),baselineSha256,'Immutable baseline changed during check.');
console.log(JSON.stringify({status:'PASS',profiles,disabledProfiles,months,humanMonths,ownerViews,
 baseline:baselineFile,baselineSha256,candidateSha256,execution:portable?'portable':'assembled-source',
 scope:'Eight Group5 profiles/24months plus four disabled-version profiles/4months. Exact creation, AI/human orders, RNG, validated half-ready import, settlement, private views, legacy inventories and rematch. No golden regeneration.'}));
