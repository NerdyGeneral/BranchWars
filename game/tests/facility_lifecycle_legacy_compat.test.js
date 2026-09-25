'use strict';
// Immutable Group4/save9.3 release boundary. Do not replace this reference or
// normalize away differences merely to accommodate Group5 refactor drift.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x)),sha=value=>createHash('sha256').update(value).digest('hex');
const baselineFile='reports/reference-builds/BRANCH_WARS_institution_group4_7cd113e1.html';
const baseline=fs.readFileSync(path.join(root,baselineFile),'utf8');
const baselineSha256='7cd113e1112b98ff639f2a2c9abd22d2dee8cf049ae89976d972e7c1b2061f7c';
assert.equal(sha(baseline),baselineSha256,'Frozen Group4 reference changed.');
const candidate=process.argv.includes('--portable')?fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html;
const candidateSha256=sha(candidate);
function load(html){
 const math=Object.create(Math);math.random=()=>.375;
 const context={console,Math:math,Date:class extends Date{static now(){return 123456;}}};
 vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context);return context.BWEngine;
}
const old=load(baseline),current=load(candidate),engines=[old,current];
const same=(a,b,label)=>assert.deepEqual(copy(a),copy(b),label);
let profiles=0,months=0,humanMonths=0,ownerViews=0;
for(const scenario of ['balanced','rate','regulatory','growth'])for(const seed of [0,20]){
 const options=old.previewFeatureSelection({}, {field:'financialGroupVersion',value:4}).options;
 const config={...options,scenario,seed:'lifecycle-group4:'+seed,created:1,mode:'hotseat'};
 const games=engines.map(E=>E.createGame(config)),label=`Group4/${scenario}/${seed}`;
 same(games[1],games[0],label+' exact creation');
 assert.equal(games[1].version,'9.3');assert.equal(games[1].financialGroupVersion,4);
 for(let month=0;month<3;month++){
  for(const seat of [0,1]){
   same(current.projectCatalog(games[1].players[seat]),old.projectCatalog(games[0].players[seat]),label+' legacy project catalog');
   for(const key of ['branchAtm','branchWealth','branchFinancialCenter','branchRegionalHub'])assert.equal(current.projectCatalog(games[1].players[seat])[key],undefined);
  }
  const plans=engines.map((E,i)=>[E.chooseBot(games[i],0),E.chooseBot(games[i],1)]);
  same(plans[1],plans[0],label+' exact AI plan');
  if(month===1){
   for(const pair of plans)for(const [seat,plan]of pair.entries()){
    plan.groupPolicy.creditAllocation=seat?{mortgage:25,middleMarket:25,consumer:50}:{mortgage:50,middleMarket:25,consumer:25};
    plan.productProgramPolicy.pricingBp.essential=seat?-25:25;
   }
   humanMonths++;
  }
  for(const [i,E]of engines.entries()){
   E.submit(games[i],0,plans[i][0]);
   games[i]=E.migrateCampaign(copy(games[i])); // compare same lifecycle on both engines
   same(E.migrateCampaign(copy(games[i])),games[i],label+' idempotent half-ready normalization');
  }
  same(games[1],games[0],label+' exact half-ready save/resume');
  for(const [i,E]of engines.entries())E.submit(games[i],1,plans[i][1]);
  same(games[1],games[0],label+' exact settlement, accounting and RNG');
  for(const seat of [0,1]){
   const v=current.publicState(games[1],seat);same(v,old.publicState(games[0],seat),label+' exact owner-private view');
   assert.equal(v.me.facilityNetwork.version,1);assert.equal(v.me.facilityLifecycle,undefined);
   assert.equal(games[1].facilityEconomy,undefined);assert.equal(games[1].players[seat].facilityLifecycle,undefined);
   same(Object.keys(games[1].players[seat].facilities),['retail','commercial','digital'],label+' original facility schema');
   ownerViews++;
  }
  months++;
 }
 for(const [i,E]of engines.entries()){
  games[i].gameOver=true;E.rematch(games[i],0);E.rematch(games[i],1);
 }
 same(games[1],games[0],label+' exact rematch');assert.equal(games[1].financialGroupVersion,4);
 assert.equal(games[1].facilityEconomy,undefined);profiles++;console.log('PASS '+label);
}
console.log(JSON.stringify({status:'PASS',profiles,months,humanMonths,ownerViews,baseline:baselineFile,baselineSha256,candidateSha256,
 scope:'Exact Group4 creation, unchanged catalog, AI/human plans, RNG/settlement, half-ready resume, owner-private views and rematch; no golden updates.'}));
